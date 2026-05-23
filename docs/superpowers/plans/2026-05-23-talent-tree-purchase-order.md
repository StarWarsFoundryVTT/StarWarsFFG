# Talent Tree Purchase Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the buy button on a talent/upgrade only when it is unlearned and either a tree root or has a learned neighbor connected by an active link. Apply to specializations, force powers, and signature abilities via one shared helper, and refuse the purchase server-side if a stale click bypasses the UI.

**Architecture:** A new pure-JS helper `canPurchaseNode(tree, key, opts)` in `modules/helpers/talent-tree.js` encodes the rule. `ItemSheetFFG.getData` annotates each node with `canPurchase` before rendering. The three buy handlers in the same sheet file re-call the helper at click time as a defense-in-depth guard. Templates flip from `{{#unless ... .islearned}}` to `{{#if ... .canPurchase}}`.

**Tech Stack:** Vanilla ES modules, Handlebars templates, Mocha/chai tests registered through `tests/ffg-tests.js` and exercised via Foundry's Functional Tests form.

**Test setup note for the implementer:** This project does not have an `npm test` runner. Tests are Mocha suites loaded inside Foundry. Each test file exports a `(suite, suiteInstance, Test, chai) => { ... }` function, which is invoked from `tests/ffg-tests.js`. To run them: launch Foundry, open a world that loads the system, open the developer console and run `new (await import('/systems/starwarsffg/tests/ffg-tests.js')).default().render(true)` — or trigger from a debug macro. Use the "FAIL first, then PASS" loop by running this form after each change. Because `canPurchaseNode` is pure JS with no Foundry deps, you may *additionally* sanity-check it with `node --experimental-vm-modules` from the repo root if helpful, but the source-of-truth is the in-Foundry suite that the rest of this codebase uses.

**Branch:** Work continues on `feat/talent-tree-purchase-order`, where the spec is already committed.

---

## File Structure

- `modules/helpers/talent-tree.js` — **new**. Pure helper, no imports from Foundry. One exported function.
- `tests/talent-tree.test.js` — **new**. Mocha suite exporting `TalentTreeTests`.
- `tests/ffg-tests.js` — **modify**. Import the new suite and register it.
- `modules/items/item-sheet-ffg.js` — **modify**. Three `getData` branches gain a `canPurchase` annotation pass; three buy handlers gain a click-time guard.
- `templates/items/ffg-specialization-sheet.html` — **modify**. Buy-button gate.
- `templates/items/ffg-forcepower-sheet.html` — **modify**. Buy-button gate.
- `templates/items/ffg-signatureability-sheet.html` — **modify**. Buy-button gate.
- `templates/wizards/char_creator/preview/specialization.html` — **modify**. Buy-button gate (consistency with main sheet).
- `lang/en.json` — **modify**. One new key.

---

## Task 1: Shared helper module

**Files:**
- Create: `modules/helpers/talent-tree.js`
- Create: `tests/talent-tree.test.js`
- Modify: `tests/ffg-tests.js`

- [ ] **Step 1: Write the failing test suite**

Create `tests/talent-tree.test.js` with content:

```js
import { canPurchaseNode } from "../modules/helpers/talent-tree.js";

const specOpts = { prefix: "talent", width: 4, total: 20, sizeAware: false };
const fpOpts   = { prefix: "upgrade", width: 4, total: 16, sizeAware: true };

function spec(overrides = {}) {
  // Build a 5x4 grid of empty unlearned single-size talents
  const tree = {};
  for (let i = 0; i < 20; i++) tree[`talent${i}`] = { islearned: false };
  // Apply overrides shaped like { "talent5": { islearned: true, "links-top-1": true } }
  for (const [k, v] of Object.entries(overrides)) {
    tree[k] = { ...tree[k], ...v };
  }
  return tree;
}

function fp(overrides = {}) {
  const tree = {};
  for (let i = 0; i < 16; i++) tree[`upgrade${i}`] = { islearned: false, sizeInt: 1 };
  for (const [k, v] of Object.entries(overrides)) {
    tree[k] = { ...tree[k], ...v };
  }
  return tree;
}

export const TalentTreeTests = (suite, suiteInstance, Test, chai) => {
  const _suite = suiteInstance.create(suite, "Talent Tree Helper");

  _suite.addTest(new Test("Root row unlearned is purchasable", function () {
    chai.expect(canPurchaseNode(spec(), "talent0", specOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Root row learned is not purchasable", function () {
    const t = spec({ talent0: { islearned: true } });
    chai.expect(canPurchaseNode(t, "talent0", specOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Non-root with no learned neighbors is not purchasable", function () {
    chai.expect(canPurchaseNode(spec(), "talent5", specOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Non-root with learned parent via links-top-1 is purchasable", function () {
    const t = spec({
      talent1: { islearned: true },
      talent5: { "links-top-1": true },
    });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Learned parent without links-top-1 on candidate is not enough", function () {
    const t = spec({ talent1: { islearned: true } });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Learned left neighbor with links-right is purchasable", function () {
    const t = spec({
      talent4: { islearned: true, "links-right": true },
    });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Learned left neighbor without links-right is not enough", function () {
    const t = spec({ talent4: { islearned: true } });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Learned right neighbor with candidate's links-right is purchasable", function () {
    const t = spec({
      talent5: { "links-right": true },
      talent6: { islearned: true },
    });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Learned child with links-top-1 makes parent purchasable (down-edge)", function () {
    const t = spec({
      talent5: {},
      talent9: { islearned: true, "links-top-1": true },
    });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Already-learned candidate is not purchasable", function () {
    const t = spec({
      talent5: { islearned: true, "links-top-1": true },
      talent1: { islearned: true },
    });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Rightmost column does not read off-grid for right edge", function () {
    // talent7 is rightmost in row 1; candidate has links-right but no real right neighbor
    const t = spec({ talent7: { "links-right": true } });
    chai.expect(canPurchaseNode(t, "talent7", specOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Force power row 0 (root) is purchasable when unlearned", function () {
    chai.expect(canPurchaseNode(fp(), "upgrade2", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Force power double-wide right neighbor lookup uses sizeInt", function () {
    // upgrade4 spans columns 0-1 (sizeInt=2). Its right neighbor is at upgrade6, not upgrade5.
    const t = fp({
      upgrade4: { sizeInt: 2, "links-right": true },
      upgrade6: { islearned: true },
    });
    chai.expect(canPurchaseNode(t, "upgrade4", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Force power left neighbor walk respects sizeInt", function () {
    // upgrade4 has sizeInt=2 spanning columns 0-1. upgrade5 is the inner
    // placeholder cell of that double-wide (sizeInt=0). Candidate upgrade6
    // sits at column 2; its real left neighbor is upgrade4 (right edge at
    // column 1, i.e. col-1). The walk must step past the placeholder.
    const t = fp({
      upgrade4: { sizeInt: 2, islearned: true, "links-right": true },
      upgrade5: { sizeInt: 0 },
      upgrade6: {},
    });
    chai.expect(canPurchaseNode(t, "upgrade6", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Force power placeholder neighbor never satisfies left edge", function () {
    // If the only thing in the leftward direction is a placeholder cell
    // (sizeInt=0) with no real owner to its left in the row, the walk falls
    // through and the candidate is not purchasable.
    const t = fp({
      upgrade5: { sizeInt: 0, islearned: true, "links-right": true },
      upgrade6: {},
    });
    chai.expect(canPurchaseNode(t, "upgrade6", fpOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Force power up-edge slot 2 looks at correct parent column", function () {
    // Candidate upgrade8 sits at row 2 col 0, sizeInt 2 (spans 0-1).
    // Slot 2 of its top link checks the parent above column 1, which is upgrade5.
    const t = fp({
      upgrade5: { islearned: true },
      upgrade8: { sizeInt: 2, "links-top-2": true },
    });
    chai.expect(canPurchaseNode(t, "upgrade8", fpOpts)).to.equal(true);
  }));
};
```

- [ ] **Step 2: Register the new suite in ffg-tests.js**

Edit `tests/ffg-tests.js`:

```js
import "../node_modules/mocha/mocha.js";
import "../node_modules/chai/chai.js";

import { HelpersTests } from "./common.test.js";
import { ModifiersTests } from "./modifiers.test.js";
import { TalentTreeTests } from "./talent-tree.test.js";
```

And in the `getData` block where the other suites are registered:

```js
    // Define Test Suites Here
    HelpersTests(suite, suiteInstance, Test, chai);
    ModifiersTests(suite, suiteInstance, Test, chai);
    TalentTreeTests(suite, suiteInstance, Test, chai);
```

- [ ] **Step 3: Run tests to verify they fail**

Launch Foundry, open the Functional Tests form. Expected: every `Talent Tree Helper` test fails with a module-resolution error (`canPurchaseNode is not a function` / `Failed to fetch dynamically imported module`).

- [ ] **Step 4: Write the helper implementation**

Create `modules/helpers/talent-tree.js`:

```js
/**
 * Connected-to-root talent tree purchase rule.
 *
 * A node (talent or upgrade) is purchasable iff:
 *   - it is unlearned, AND
 *   - it is in the root row (index < width), OR
 *   - at least one of its four neighbors is learned AND connected by an
 *     active link in the direction of that neighbor.
 *
 * `sizeAware = true` (force power / signature ability) means nodes may span
 * multiple columns via `sizeInt`. Neighbor indexing accounts for that:
 *   - right neighbor is at `index + sizeInt`
 *   - the up-neighbor for slot N walks left across the previous row until it
 *     finds a node whose own `sizeInt` covers the target column
 *   - the left neighbor walks left across the current row until it finds a
 *     node whose right edge sits at `col - 1`
 *
 * @param {object} tree
 *   Tree dict keyed `<prefix>0..total-1` (e.g. `talents` or `upgrades`).
 * @param {string} key
 *   Key of the candidate node (e.g. "talent5", "upgrade2").
 * @param {object} opts
 * @param {string} opts.prefix       Key prefix ("talent" or "upgrade").
 * @param {number} opts.width        Grid width (4 today).
 * @param {number} opts.total        Total node count.
 * @param {boolean} opts.sizeAware   True if nodes may span multiple columns.
 * @returns {boolean}
 */
export function canPurchaseNode(tree, key, opts) {
  if (!tree || !key || !opts) return false;
  const { prefix, width, total, sizeAware } = opts;

  const node = tree[key];
  if (!node) return false;
  if (node.islearned) return false;

  const index = parseInt(key.slice(prefix.length), 10);
  if (Number.isNaN(index) || index < 0 || index >= total) return false;

  if (index < width) return true; // root row

  const col = index % width;
  const row = Math.floor(index / width);
  // Candidate's own size: real upgrades always have it populated. Default to
  // 1 as a fallback only for the candidate, never for traversed neighbors.
  const size = sizeAware ? (Number(node.sizeInt) >= 1 ? node.sizeInt : 1) : 1;
  // Neighbor size lookup: in size-aware mode, inner placeholder cells of a
  // multi-column upgrade have sizeInt undefined / 0 / NaN. Treat those as 0
  // so the walks step past them to the owning leftmost cell.
  const neighborSize = (n) => {
    if (!sizeAware) return n ? 1 : 0;
    const s = Number(n?.sizeInt);
    return Number.isFinite(s) && s >= 1 ? s : 0;
  };

  // Up neighbors: for each top-link slot n in 1..size
  for (let n = 1; n <= size; n++) {
    if (!node[`links-top-${n}`]) continue;
    // The slot above column (col + n - 1). Walk leftward across row-1
    // until we find a node whose sizeInt covers that column.
    const targetCol = col + n - 1;
    const prevRowStart = (row - 1) * width;
    for (let z = 0; z <= targetCol; z++) {
      const parentIndex = prevRowStart + targetCol - z;
      if (parentIndex < prevRowStart) break;
      const parent = tree[`${prefix}${parentIndex}`];
      if (parent && neighborSize(parent) > z) {
        if (parent.islearned) return true;
        break; // found the owning parent; it isn't learned
      }
    }
  }

  // Down neighbors: each child slot n in 1..size at row+1
  for (let n = 1; n <= size; n++) {
    const childCol = col + n - 1;
    if (childCol >= width) break;
    const childIndex = (row + 1) * width + childCol;
    if (childIndex >= total) continue;
    const child = tree[`${prefix}${childIndex}`];
    if (child && child[`links-top-${n}`] && child.islearned) return true;
  }

  // Right neighbor: at column (col + size), same row
  if (col + size < width) {
    const rightIndex = index + size;
    if (rightIndex < total) {
      const right = tree[`${prefix}${rightIndex}`];
      if (right && node[`links-right`] && right.islearned) return true;
    }
  }

  // Left neighbor: walk leftward; first node whose right edge is at col-1.
  // (A node at column `col - z` whose neighborSize equals `z` ends at col-1.)
  if (col > 0) {
    const rowStart = row * width;
    for (let z = 1; z <= col; z++) {
      const leftIndex = index - z;
      if (leftIndex < rowStart) break;
      const left = tree[`${prefix}${leftIndex}`];
      if (left && neighborSize(left) === z) {
        if (left[`links-right`] && left.islearned) return true;
        break; // found the owning left neighbor; it isn't a connected learned one
      }
    }
  }

  return false;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Launch Foundry, open the Functional Tests form. Expected: all 15 `Talent Tree Helper` tests pass.

- [ ] **Step 6: Commit**

```bash
git add modules/helpers/talent-tree.js tests/talent-tree.test.js tests/ffg-tests.js
git commit -m "feat(talents): add canPurchaseNode helper with tests"
```

---

## Task 2: Specialization integration

**Files:**
- Modify: `modules/items/item-sheet-ffg.js:259-273` (getData), `modules/items/item-sheet-ffg.js:1654` (_buySpecializationUpgrade)
- Modify: `templates/items/ffg-specialization-sheet.html:64-68`
- Modify: `templates/wizards/char_creator/preview/specialization.html:30`
- Modify: `lang/en.json`

- [ ] **Step 1: Import the helper at the top of item-sheet-ffg.js**

Open `modules/items/item-sheet-ffg.js` and locate the existing import block at the top of the file. Add this import alongside the others:

```js
import { canPurchaseNode } from "../helpers/talent-tree.js";
```

- [ ] **Step 2: Annotate canPurchase in the specialization getData branch**

Find the specialization loop at lines 259-273 of `modules/items/item-sheet-ffg.js`. Replace this block:

```js
        for (let x = 0; x < 20; x++) {
          data.data.talents[`talent${x}`].enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(data.data.talents[`talent${x}`].description);

          if (x - 4 < 0) {
            data.data.talents[`talent${x}`].isTopLearned = false;
          } else {
            data.data.talents[`talent${x}`].isTopLearned = data.data.talents[`talent${x-4}`]?.islearned ?? false;
          }

          if ((x + 1) % 4 == 0) {
            data.data.talents[`talent${x}`].isRightLearned = false;
          } else {
            data.data.talents[`talent${x}`].isRightLearned = data.data.talents[`talent${x+1}`]?.islearned ?? false;
          }
        }
```

With:

```js
        for (let x = 0; x < 20; x++) {
          data.data.talents[`talent${x}`].enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(data.data.talents[`talent${x}`].description);

          if (x - 4 < 0) {
            data.data.talents[`talent${x}`].isTopLearned = false;
          } else {
            data.data.talents[`talent${x}`].isTopLearned = data.data.talents[`talent${x-4}`]?.islearned ?? false;
          }

          if ((x + 1) % 4 == 0) {
            data.data.talents[`talent${x}`].isRightLearned = false;
          } else {
            data.data.talents[`talent${x}`].isRightLearned = data.data.talents[`talent${x+1}`]?.islearned ?? false;
          }
        }
        for (let x = 0; x < 20; x++) {
          data.data.talents[`talent${x}`].canPurchase = canPurchaseNode(
            data.data.talents,
            `talent${x}`,
            { prefix: "talent", width: 4, total: 20, sizeAware: false }
          );
        }
```

A second pass is used because the rule reads neighbor `islearned`, which is unaffected by the first loop, but doing it as a separate clearly-named loop documents intent and avoids any future ordering coupling.

- [ ] **Step 3: Gate the specialization template buy button**

Edit `templates/items/ffg-specialization-sheet.html` at lines 64-68. Replace:

```handlebars
                      {{#if ../item.isOwned }}
                      {{#unless talent.islearned}}
                      <i class="fa-regular fa-circle-up ffg-purchase" data-buy-action="specialization-upgrade" data-cost="{{talent.cost}}" data-base-item-name="{{../item.name}}" data-upgrade-name="{{ talent.name }}" data-upgrade-id="{{ key }}"></i>
                      {{/unless}}
                      {{/if}}
```

With:

```handlebars
                      {{#if ../item.isOwned }}
                      {{#if talent.canPurchase}}
                      <i class="fa-regular fa-circle-up ffg-purchase" data-buy-action="specialization-upgrade" data-cost="{{talent.cost}}" data-base-item-name="{{../item.name}}" data-upgrade-name="{{ talent.name }}" data-upgrade-id="{{ key }}"></i>
                      {{/if}}
                      {{/if}}
```

- [ ] **Step 4: Gate the char-creator preview template buy button**

Edit `templates/wizards/char_creator/preview/specialization.html` at lines 28-32. Replace:

```handlebars
                {{#if ../item.isOwned }}
                <!-- TODO: add a buy button here -->
                <i class="fa-regular fa-circle-up ffg-purchase" data-buy-action="specialization-upgrade" data-cost="{{talent.cost}}" data-base-item-name="{{../item.name}}" data-upgrade-name="{{ talent.name }}" data-upgrade-id="{{ key }}"></i>
                {{/if}}
```

With:

```handlebars
                {{#if ../item.isOwned }}
                {{#if talent.canPurchase}}
                <i class="fa-regular fa-circle-up ffg-purchase" data-buy-action="specialization-upgrade" data-cost="{{talent.cost}}" data-base-item-name="{{../item.name}}" data-upgrade-name="{{ talent.name }}" data-upgrade-id="{{ key }}"></i>
                {{/if}}
                {{/if}}
```

- [ ] **Step 5: Add the locale string**

Edit `lang/en.json`. Just after the existing `"SWFFG.Actors.Sheets.Purchase.NotEnoughXP"` entry, add:

```json
  "SWFFG.Actors.Sheets.Purchase.NotConnected": "That talent is not connected to a learned talent and cannot be purchased yet.",
```

- [ ] **Step 6: Add the click-time guard to _buySpecializationUpgrade**

Find `_buySpecializationUpgrade` at `modules/items/item-sheet-ffg.js:1654`. Replace its first six lines:

```js
  async _buySpecializationUpgrade(event) {
    const element = $(event.target);
    const cost = element.data("cost");
    const baseName = element.data("base-item-name");
    const upgradeName = element.data("upgrade-name");
    const upgradeId = element.data("upgrade-id");
```

With:

```js
  async _buySpecializationUpgrade(event) {
    const element = $(event.target);
    const cost = element.data("cost");
    const baseName = element.data("base-item-name");
    const upgradeName = element.data("upgrade-name");
    const upgradeId = element.data("upgrade-id");

    if (!canPurchaseNode(
      this.object.system.talents,
      upgradeId,
      { prefix: "talent", width: 4, total: 20, sizeAware: false }
    )) {
      ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.NotConnected"));
      return;
    }
```

- [ ] **Step 7: Verify in Foundry**

Launch Foundry. Open a character with a specialization that has at least one talent purchased somewhere mid-tree. Confirm:

  - Row 0 (5 XP) talents all show the circle-up icon when unlearned.
  - Talents directly above/below/left/right of a learned talent (with the appropriate `links-*` set) show the icon.
  - All other unlearned talents do NOT show the icon.
  - Manually editing the page DOM to inject the icon onto a disconnected talent and clicking it triggers the `NotConnected` warning instead of a purchase.
  - The char-creator wizard preview shows the same gating.

- [ ] **Step 8: Commit**

```bash
git add modules/items/item-sheet-ffg.js templates/items/ffg-specialization-sheet.html templates/wizards/char_creator/preview/specialization.html lang/en.json
git commit -m "feat(talents): gate specialization buy button by connected-to-root rule"
```

---

## Task 3: Force power integration

**Files:**
- Modify: `modules/items/item-sheet-ffg.js:200-238` (getData), `modules/items/item-sheet-ffg.js:1536` (_buyForcePowerUpgrade)
- Modify: `templates/items/ffg-forcepower-sheet.html:62-67`

- [ ] **Step 1: Annotate canPurchase in the forcepower getData branch**

Find the `case "forcepower":` block in `modules/items/item-sheet-ffg.js` starting at line 200. After the existing per-upgrade loop that ends at line 238, before the `break;` statement on line 239, add:

```js
        for (let x = 0; x < 16; x++) {
          data.data.upgrades[`upgrade${x}`].canPurchase = canPurchaseNode(
            data.data.upgrades,
            `upgrade${x}`,
            { prefix: "upgrade", width: 4, total: 16, sizeAware: true }
          );
        }
```

The result should look like:

```js
        for (let x = 0; x < 16; x++) {
          data.data.upgrades[`upgrade${x}`].enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(data.data.upgrades[`upgrade${x}`].description);
          let upgradeSize = ItemSheetFFG.SIZE_TO_INT[data.data.upgrades[`upgrade${x}`].size];
          data.data.upgrades[`upgrade${x}`].sizeInt = upgradeSize;

          // ... existing isTop*Learned / isRightLearned logic untouched ...
        }
        for (let x = 0; x < 16; x++) {
          data.data.upgrades[`upgrade${x}`].canPurchase = canPurchaseNode(
            data.data.upgrades,
            `upgrade${x}`,
            { prefix: "upgrade", width: 4, total: 16, sizeAware: true }
          );
        }
        break;
```

(The second loop is separate because `canPurchaseNode` reads `sizeInt` from every node — the first loop populates `sizeInt`, so the second loop is guaranteed to see complete data.)

- [ ] **Step 2: Gate the force power template buy button**

Edit `templates/items/ffg-forcepower-sheet.html` at lines 62-66. Replace:

```handlebars
            {{#if ../item.isOwned }}
            {{#unless upgrade.islearned}}
            <i class="fa-regular fa-circle-up ffg-purchase" data-buy-action="forcepower-upgrade" data-cost="{{upgrade.cost}}" data-base-item-name="{{../item.name}}" data-upgrade-name="{{ upgrade.name }}" data-upgrade-id="{{ key }}"></i>
            {{/unless}}
            {{/if}}
```

With:

```handlebars
            {{#if ../item.isOwned }}
            {{#if upgrade.canPurchase}}
            <i class="fa-regular fa-circle-up ffg-purchase" data-buy-action="forcepower-upgrade" data-cost="{{upgrade.cost}}" data-base-item-name="{{../item.name}}" data-upgrade-name="{{ upgrade.name }}" data-upgrade-id="{{ key }}"></i>
            {{/if}}
            {{/if}}
```

- [ ] **Step 3: Add the click-time guard to _buyForcePowerUpgrade**

Find `_buyForcePowerUpgrade` at `modules/items/item-sheet-ffg.js:1536`. Replace its first six lines:

```js
  async _buyForcePowerUpgrade(event) {
    const element = $(event.target);
    const cost = element.data("cost");
    const baseName = element.data("base-item-name");
    const upgradeName = element.data("upgrade-name");
    const upgradeId = element.data("upgrade-id");
```

With:

```js
  async _buyForcePowerUpgrade(event) {
    const element = $(event.target);
    const cost = element.data("cost");
    const baseName = element.data("base-item-name");
    const upgradeName = element.data("upgrade-name");
    const upgradeId = element.data("upgrade-id");

    if (!canPurchaseNode(
      this.object.system.upgrades,
      upgradeId,
      { prefix: "upgrade", width: 4, total: 16, sizeAware: true }
    )) {
      ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.NotConnected"));
      return;
    }
```

- [ ] **Step 4: Verify in Foundry**

Launch Foundry. Open a character with a force power. Confirm:
  - Row 0 upgrades (`upgrade0..3`) all show the buy icon when unlearned (basic power is implicitly the root).
  - With one row-0 upgrade learned, only its connected neighbors (via `links-top-N` / `links-right` etc.) show the icon.
  - A multi-column upgrade (e.g. a double-wide) correctly unlocks based on either column's connections.
  - Click-time guard fires the `NotConnected` warning if forced via DOM injection.

- [ ] **Step 5: Commit**

```bash
git add modules/items/item-sheet-ffg.js templates/items/ffg-forcepower-sheet.html
git commit -m "feat(talents): gate force power upgrade buy button by connected-to-root rule"
```

---

## Task 4: Signature ability integration

**Files:**
- Modify: `modules/items/item-sheet-ffg.js:374-402` (getData), `modules/items/item-sheet-ffg.js:1594` (_buySignatureAbilityUpgrade)
- Modify: `templates/items/ffg-signatureability-sheet.html:88-92`

- [ ] **Step 1: Annotate canPurchase in the signatureability getData branch**

Find the `case "signatureability":` block in `modules/items/item-sheet-ffg.js`. After the existing per-upgrade loop that ends around line 402, before the `break;` on line 403, add:

```js
        for (let x = 0; x < 8; x++) {
          data.data.upgrades[`upgrade${x}`].canPurchase = canPurchaseNode(
            data.data.upgrades,
            `upgrade${x}`,
            { prefix: "upgrade", width: 4, total: 8, sizeAware: true }
          );
        }
```

- [ ] **Step 2: Gate the signature ability template buy button**

Edit `templates/items/ffg-signatureability-sheet.html` at lines 88-92. Replace:

```handlebars
            {{#if ../item.isOwned }}
            {{#unless upgrade.islearned}}
            <i class="fa-regular fa-circle-up ffg-purchase" data-buy-action="signatureability-upgrade" data-cost="{{upgrade.cost}}" data-base-item-name="{{../item.name}}" data-upgrade-name="{{ upgrade.name }}" data-upgrade-id="{{ key }}"></i>
            {{/unless}}
            {{/if}}
```

With:

```handlebars
            {{#if ../item.isOwned }}
            {{#if upgrade.canPurchase}}
            <i class="fa-regular fa-circle-up ffg-purchase" data-buy-action="signatureability-upgrade" data-cost="{{upgrade.cost}}" data-base-item-name="{{../item.name}}" data-upgrade-name="{{ upgrade.name }}" data-upgrade-id="{{ key }}"></i>
            {{/if}}
            {{/if}}
```

- [ ] **Step 3: Add the click-time guard to _buySignatureAbilityUpgrade**

Find `_buySignatureAbilityUpgrade` at `modules/items/item-sheet-ffg.js:1594`. Replace its first six lines:

```js
  async _buySignatureAbilityUpgrade(event) {
    const element = $(event.target);
    const cost = element.data("cost");
    const baseName = element.data("base-item-name");
    const upgradeName = element.data("upgrade-name");
    const upgradeId = element.data("upgrade-id");
```

With:

```js
  async _buySignatureAbilityUpgrade(event) {
    const element = $(event.target);
    const cost = element.data("cost");
    const baseName = element.data("base-item-name");
    const upgradeName = element.data("upgrade-name");
    const upgradeId = element.data("upgrade-id");

    if (!canPurchaseNode(
      this.object.system.upgrades,
      upgradeId,
      { prefix: "upgrade", width: 4, total: 8, sizeAware: true }
    )) {
      ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.NotConnected"));
      return;
    }
```

- [ ] **Step 4: Verify in Foundry**

Launch Foundry. Open a character with a signature ability acquired. Confirm:
  - Row 0 upgrades show the buy icon when unlearned.
  - Row 1 upgrades show the icon only when at least one connected row-0 upgrade is learned with the correct link.
  - Click-time guard fires on a disconnected click.

- [ ] **Step 5: Commit**

```bash
git add modules/items/item-sheet-ffg.js templates/items/ffg-signatureability-sheet.html
git commit -m "feat(talents): gate signature ability buy button by connected-to-root rule"
```

---

## Final review

- [ ] **Step 1: Run the full Functional Tests suite**

In Foundry, open the Functional Tests form. Expected: all `Common Helpers`, `Modifier Helpers`, and `Talent Tree Helper` suites pass; no regressions.

- [ ] **Step 2: Manual smoke pass across all three trees**

For each of: specialization, force power, signature ability — open an owned item on a character, confirm the rule renders correctly, purchase one talent, confirm the next ring of buy buttons appears as expected.

- [ ] **Step 3: Push and open PR**

```bash
git push -u origin feat/talent-tree-purchase-order
gh pr create --title "feat: enforce connected-to-root talent tree purchase rule" --body "$(cat <<'EOF'
## Summary
- Adds `canPurchaseNode` helper in `modules/helpers/talent-tree.js`, used by specialization talents, force power upgrades, and signature ability upgrades to decide if the buy button shows.
- Refuses the purchase server-side with a warning if a click bypasses the gate.
- GMs keep their `islearned` checkbox override.

## Test plan
- [ ] Functional Tests form: `Talent Tree Helper` suite passes.
- [ ] Specialization: row 0 always buyable; connected neighbors unlock as expected.
- [ ] Force power: row 0 buyable; multi-column upgrade connections work.
- [ ] Signature ability: row 0 buyable; row 1 gated on row 0.
- [ ] Click guard fires `NotConnected` warning on a forced disconnected click.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

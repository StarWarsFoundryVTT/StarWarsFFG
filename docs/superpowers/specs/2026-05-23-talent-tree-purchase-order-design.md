# Enforce Connected-to-Root Talent Tree Purchase Order

## Problem

The SW FFG system shows the "buy" button on every unlearned talent in a specialization, force power, or signature ability tree. Per game rules, talents can only be purchased in connection order: the root row (the 5 XP row for specializations, the basic power for force powers, the base ability for signature abilities) is always available, but any deeper talent must have a learned neighbor reachable from the root through the tree's link graph. The system does not currently enforce this.

## Goal

Show the buy button only on talents that satisfy the connected-to-root rule, and refuse the purchase server-side if a click slips through. All three trees (specialization, force power, signature ability) use one shared helper.

## Non-goals

- No graph traversal / BFS. The check is local: a talent is purchasable iff a connected neighbor is learned (or it is a root). This is equivalent to root-reachability under the invariant "every learned non-root has a learned parent neighbor," which the rule itself maintains.
- No changes to the GM `islearned` checkbox. It stays editable so GMs retain manual override.
- No changes to the signature ability `uplink_nodes` gate (that controls SA *acquisition*, not upgrade purchase within an acquired SA).
- No data migration. Uses existing `links-top-N`, `links-right`, `islearned`, `sizeInt` fields.

## Rule

A node (talent or upgrade) is purchasable iff:

1. `node.islearned` is false, AND
2. The node is a root (its index is in row 0, i.e. index `< width`), OR
3. At least one of the four neighbors is learned AND linked to the node via an active link:
   - **Up**: `node["links-top-N"] && parent.islearned` for each top-link slot `N` in `1..sizeInt`
   - **Down**: `child["links-top-N"] && child.islearned` for each child slot
   - **Left**: `leftNeighbor["links-right"] && leftNeighbor.islearned`
   - **Right**: `node["links-right"] && rightNeighbor.islearned`

For specialization (size-uniform), `sizeInt = 1` everywhere, so only `links-top-1` participates upward. For force power and signature ability, multi-column upgrades use `links-top-1..sizeInt`, and the up-neighbor for a given column slot is found by the same row-step-of-4 walk the existing pre-compute uses.

### Neighbor indexing (size-aware case)

Let `width = 4`, `i = index of candidate`, `row = floor(i / width)`, `col = i % width`, `s = candidate.sizeInt ?? 1`.

- **Right neighbor**: index `i + s`. Edge condition: `(col + s) < width` (else off-row).
- **Down neighbor for slot `n` in `1..s`**: index `i + width + (n - 1)`. Edge condition: that child has `links-top-n` and `islearned`.
- **Up neighbor for slot `n` in `1..s`**: the parent in row `row - 1` whose column range covers `col + n - 1`. Walked the same way as the existing pre-compute at `item-sheet-ffg.js:223-229`: scan candidates `i - width - z + (n - 1)` for `z = 0..`, taking the first whose `sizeInt > z`. Edge requires candidate's own `links-top-n` plus that parent's `islearned`.
- **Left neighbor**: the node in the same row whose right edge is column `col - 1`. Walk leftward from `i - 1`, taking the first node whose `(neighborCol + neighborSizeInt) == col`. Edge requires that neighbor's `links-right` and `islearned`.

For non-size-aware trees (specialization), all `sizeInt` are `1`, so the walks collapse to single-step `±1` / `±width` lookups.

## Architecture

### New module: `modules/helpers/talent-tree.js`

Single exported pure function. No Foundry dependencies, unit-testable.

```js
/**
 * Returns true if the node at `key` in `tree` is currently purchasable
 * under the connected-to-root rule.
 *
 * @param {object} tree     Tree dict, e.g. `talents` or `upgrades`,
 *                          keyed `<prefix>0..total-1`.
 * @param {string} key      Key of the candidate node (e.g. "talent5", "upgrade2").
 * @param {object} opts
 * @param {string} opts.prefix      Key prefix ("talent" or "upgrade").
 * @param {number} opts.width       Grid width (always 4 today).
 * @param {number} opts.total       Total node count (20 / 16 / 8).
 * @param {boolean} opts.sizeAware  True if nodes may span multiple columns
 *                                  via `sizeInt` (force power, sig ability).
 * @returns {boolean}
 */
export function canPurchaseNode(tree, key, opts) { ... }
```

Implementation notes:

- Parse the numeric index from the key (e.g. `"upgrade5"` → `5`).
- Short-circuit `false` if `node.islearned`.
- Short-circuit `true` if `index < width` (root row).
- Otherwise check the four neighbor directions in order; return `true` on the first satisfied edge.
- When `sizeAware` is true, the node's `sizeInt` controls how many `links-top-N` slots exist; `1` is treated as default if `sizeInt` is missing.
- Missing neighbor (off-grid) is treated as "no edge."

### Render-time annotation in `ItemSheetFFG.getData`

In `modules/items/item-sheet-ffg.js`, three existing `case` branches already loop the tree to compute `isTopLearned`/`isRightLearned`:

- specialization (talent0..19): around line 259
- forcepower (upgrade0..15): around line 210
- signatureability (upgrade0..7): around line 374

After each existing loop body, set `tree[key].canPurchase = canPurchaseNode(tree, key, opts)` with the appropriate `opts` for that tree.

### Template gating

Change three buy-button conditions from "show when unlearned" to "show when canPurchase":

- `templates/items/ffg-specialization-sheet.html:65` — `{{#unless talent.islearned}}` → `{{#if talent.canPurchase}}`
- `templates/items/ffg-forcepower-sheet.html:63` — `{{#unless upgrade.islearned}}` → `{{#if upgrade.canPurchase}}`
- `templates/items/ffg-signatureability-sheet.html:89` — same change
- `templates/wizards/char_creator/preview/specialization.html:30` — same change (char-creator preview shows the same buy icon)

### Click-time guard

In `modules/items/item-sheet-ffg.js`, three buy handlers:

- `_buySpecializationUpgrade` (line 1654)
- `_buyForcePowerUpgrade` (line 1536)
- `_buySignatureAbilityUpgrade`

At the top of each, after reading `upgradeId` from the event, pull the live tree from `this.object.system.talents` / `this.object.system.upgrades`, call `canPurchaseNode(tree, upgradeId, opts)`, and if false:

```js
ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.NotConnected"));
return;
```

This is the source-of-truth gate; the template `canPurchase` flag is for UX. Together they cover stale-DOM and GM-edit-mode cases.

### Locale

Add one entry to `lang/en.json` (and any other language packs if mirroring is required):

- `SWFFG.Actors.Sheets.Purchase.NotConnected`: "That talent is not connected to a learned talent and cannot be purchased yet."

## Tests

Add `tests/talent-tree.test.js`:

1. Root row, unlearned → true.
2. Root row, learned → false.
3. Non-root, no learned neighbors → false.
4. Non-root, learned parent via `links-top-1` → true.
5. Non-root, parent learned but `links-top-1` absent on the candidate → false.
6. Non-root, learned left neighbor where left has `links-right` → true.
7. Non-root, learned left neighbor where left lacks `links-right` → false.
8. Non-root, learned right neighbor where candidate has `links-right` → true.
9. Non-root, learned child where child has `links-top-1` → true (down-edge case).
10. `sizeAware`: multi-column upgrade (`sizeInt=2`) with `links-top-2` learned at the second column → true.
11. Rightmost column: candidate's `links-right=true` does not cause off-grid access; returns false if no other edge is satisfied.
12. `sizeAware`: rightward neighbor lookup of a double-size candidate at `col=0` correctly targets `key + 2`, not `key + 1`.
13. `sizeAware`: leftward neighbor of a candidate at `col=2` whose left sibling has `sizeInt=2` at `col=0` is correctly identified via the "right-edge == col-1" walk.

## Edge cases addressed

- **Ranked talents** appearing multiple times in one tree (e.g. Toughened, Grit): each box has its own `talentN` slot, so the rule applies per box. The next box only unlocks when a connected box is learned. Matches the example image.
- **Multi-column upgrades** (force power & sig ability): the function consults `sizeInt` and iterates `links-top-1..sizeInt` for the up edge.
- **Force power / sig ability row 0**: the existing pre-compute sets `isTop1Learned = true` because the basic/base power is implicitly learned. Our function does not depend on `isTopLearned` — we treat any index `< width` as root directly, which is more explicit and avoids coupling.
- **GM manual edit-mode**: the rule still applies. The `islearned` checkbox remains directly editable for GMs, providing a manual override path if the connectivity invariant ever needs to be broken.
- **Char creator preview**: gated the same way for consistency.

## Files touched

- `modules/helpers/talent-tree.js` (new)
- `modules/items/item-sheet-ffg.js` (3 `getData` cases, 3 buy handlers)
- `templates/items/ffg-specialization-sheet.html`
- `templates/items/ffg-forcepower-sheet.html`
- `templates/items/ffg-signatureability-sheet.html`
- `templates/wizards/char_creator/preview/specialization.html`
- `lang/en.json` (one new key)
- `tests/talent-tree.test.js` (new)

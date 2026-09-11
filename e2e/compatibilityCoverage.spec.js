// Lifecycle and registered-sheet coverage adapted from salohcin714 / PR #2280.
// @ts-check
import {test, expect} from "@playwright/test";
import {openGame} from "../playwright/fixtures";

test.beforeEach(async ({page}) => { await openGame(page); });

test("legacy and native effect batches persist without losing phases, flags or FFG durations", async ({page}) => {
  const id = await page.evaluate(async () => {
    const actor = await CONFIG.Actor.documentClass.create({name: "Compatibility effect batches", type: "character"});
    await actor.createEmbeddedDocuments("ActiveEffect", [{name: "Legacy input", changes: [
      {key: "system.stats.defence.ranged", type: 2, value: 1, phase: "final", priority: 42},
    ], system: {duration: "combat"}, flags: {starwarsffg: {compatibilityTest: true}}}]);
    const effect = actor.effects.find(e => e.name === "Legacy input");
    await actor.updateEmbeddedDocuments("ActiveEffect", [{_id: effect.id,
      changes: [{key: "system.stats.defence.ranged", mode: 2, value: 3, phase: "final", priority: 42}],
    }]);
    return actor.id;
  });
  try {
    await page.reload();
    await expect(page.locator("#destinyDark")).toBeVisible({timeout: 30_000});
    const state = await page.evaluate(async id => {
      const {activeEffectNeedsMigration, migrateActiveEffectsV14} = await import("/systems/starwarsffg/modules/migration/active-effects-v14.js");
      const actor = game.actors.get(id);
      const effect = actor.effects.find(e => e.name === "Legacy input");
      const source = effect.toObject();
      const report = await migrateActiveEffectsV14();
      return {change: source.system.changes[0], duration: source.system.duration,
        flag: source.flags.starwarsffg.compatibilityTest, defense: actor.system.stats.defence.ranged,
        needsMigration: activeEffectNeedsMigration(effect), failures: report.failed};
    }, id);
    expect(state.change).toMatchObject({type: "add", value: 3, phase: "final", priority: 42});
    expect(state.duration).toBe("combat");
    expect(state.flag).toBe(true);
    expect(state.defense).toBe(3);
    expect(state.needsMigration).toBe(false);
    expect(state.failures).toEqual([]);
  } finally { await page.evaluate(async id => {await game.actors.get(id)?.delete();}, id); }
});

test("generated owned-weapon and skill macros open working roll builders", async ({page}) => {
  const fixture = await page.evaluate(async () => {
    const actor = await CONFIG.Actor.documentClass.create({name: "Compatibility macro actor", type: "character"});
    const [weapon] = await actor.createEmbeddedDocuments("Item", [{name: "Compatibility macro weapon", type: "weapon", system: {skill: {value: "Brawl"}}}]);
    const previous = game.user.hotbar[9] ?? null;
    const {createFFGMacro} = await import("/systems/starwarsffg/modules/helpers/macros.js");
    await createFFGMacro(null, {type: "Item", uuid: weapon.uuid}, 9);
    return {actorId: actor.id, weaponId: weapon.id, macroId: game.user.hotbar[9], previous};
  });
  let skillMacroId;
  try {
    await page.evaluate(async id => {await game.macros.get(id).execute();}, fixture.macroId);
    await expect(page.locator("#roll-builder")).toBeVisible();
    await page.locator("#roll-builder .roll-button .btn").click();
    await expect.poll(() => page.evaluate(id => game.messages.some(message => message.speaker.actor === id && message.rolls.length > 0), fixture.actorId)).toBe(true);
    await page.evaluate(async () => {await Object.values(ui.windows).find(app => app.id === "roll-builder")?.close();});
    await expect(page.locator("#roll-builder")).toHaveCount(0);
    skillMacroId = await page.evaluate(async data => {
      const {createFFGMacro} = await import("/systems/starwarsffg/modules/helpers/macros.js");
      await createFFGMacro(null, {actorId: data.actorId, data: {type: "skill", skill: "Cool", characteristic: "Presence"}}, 9);
      return game.user.hotbar[9];
    }, fixture);
    await page.evaluate(async id => {await game.macros.get(id).execute();}, skillMacroId);
    await expect(page.locator("#roll-builder")).toBeVisible();
    await page.locator("#roll-builder .roll-button .btn").click();
    await expect.poll(() => page.evaluate(id => game.messages.filter(message => message.speaker.actor === id && message.rolls.length > 0).length, fixture.actorId)).toBe(2);
  } finally {
    await page.evaluate(async ({fixture, skillMacroId}) => {
      await Object.values(ui.windows).find(app => app.id === "roll-builder")?.close();
      await game.user.assignHotbarMacro(game.macros.get(fixture.previous) ?? null, 9);
      const ids = [fixture.macroId, skillMacroId].filter(id => id && game.macros.has(id));
      if (ids.length) await CONFIG.Macro.documentClass.deleteDocuments(ids);
      const messages = game.messages.filter(message => message.speaker.actor === fixture.actorId).map(message => message.id);
      if (messages.length) await CONFIG.ChatMessage.documentClass.deleteDocuments(messages);
      await game.actors.get(fixture.actorId)?.delete();
    }, {fixture, skillMacroId});
  }
});

test("OggDude and SWA importer windows initialize", async ({page}) => {
  // Opening the importers is a smoke check; real dataset import remains a separate acceptance task.
  for (const [button, window] of [[".og-character", "#data-importer"], [".swa-character", "#swa-importer"]]) {
    await page.evaluate(selector => {document.querySelector(selector)?.click();}, button);
    await expect(page.locator(window)).toBeVisible();
    if (window === "#swa-importer") {
      await expect.poll(() => page.evaluate(() => Object.values(ui.windows).find(app => app.id === "swa-importer")?.rendered)).toBe(true);
    }
    // Legacy header controls bind asynchronously after the window becomes visible.
    await expect(async () => {
      if (await page.locator(window).isVisible()) {
        await page.locator(window).locator('[data-action="close"], .window-header .close').click({timeout: 1000});
      }
      await expect(page.locator(window)).not.toBeVisible({timeout: 1000});
    }).toPass({timeout: 6000});
  }
});

test("creates, renders, updates, embeds, and deletes every core document subtype", async ({page}) => {
  test.setTimeout(120_000);
  const result = await page.evaluate(async () => {
    const actorTypes = game.documentTypes.Actor.filter(type => type !== "base");
    const itemTypes = game.documentTypes.Item.filter(type => type !== "base");
    const actors = [];
    const items = [];
    const failures = [];
    const waitForRender = async sheet => {
      for (let attempt = 0; attempt < 20 && !sheet.rendered; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    try {
      await CONFIG.Item.documentClass.deleteDocuments(game.items.filter(document => document.name.startsWith("compat-item-")).map(document => document.id));
      await CONFIG.Actor.documentClass.deleteDocuments(game.actors.filter(document => document.name.startsWith("compat-actor-")).map(document => document.id));

      for (const type of actorTypes) {
        const actor = await CONFIG.Actor.documentClass.create({name: `compat-actor-${type}`, type});
        actors.push(actor);
        await actor.update({name: `compat-actor-${type}-updated`});
        const sheet = actor.sheet;
        sheet.render(true);
        await waitForRender(sheet);
        if (!sheet.rendered || game.actors.get(actor.id)?.name !== `compat-actor-${type}-updated`) failures.push(`Actor.${type}`);
        await sheet.close({submit: false});
      }

      for (const type of itemTypes) {
        const item = await CONFIG.Item.documentClass.create({name: `compat-item-${type}`, type});
        items.push(item);
        await item.update({name: `compat-item-${type}-updated`});
        const sheet = item.sheet;
        sheet.render(true);
        await waitForRender(sheet);
        if (!sheet.rendered || game.items.get(item.id)?.name !== `compat-item-${type}-updated`) failures.push(`Item.${type}`);
        await sheet.close({submit: false});
      }

      const actor = actors.find(document => document.type === "character");
      const [embedded] = await actor.createEmbeddedDocuments("Item", [{name: "compat-embedded", type: "gear"}]);
      await embedded.update({name: "compat-embedded-updated"});
      if (actor.items.get(embedded.id)?.name !== "compat-embedded-updated") failures.push("Actor.Item.gear");
      await actor.deleteEmbeddedDocuments("Item", [embedded.id]);
      if (actor.items.has(embedded.id)) failures.push("Actor.Item.gear.delete");
    } finally {
      await CONFIG.Item.documentClass.deleteDocuments(items.map(document => document.id));
      await CONFIG.Actor.documentClass.deleteDocuments(actors.map(document => document.id));
    }

    return {actorTypes, itemTypes, failures};
  });

  expect(result.failures).toEqual([]);
  expect(result.actorTypes.length).toBeGreaterThan(0);
  expect(result.itemTypes.length).toBeGreaterThan(0);
});

test("constructs and renders every registered system sheet", async ({page}) => {
  test.setTimeout(120_000);
  // The subtype lifecycle test above only exercises each document's default sheet, so a
  // non-default registration can break without failing anything. Construct every one.
  const result = await page.evaluate(async () => {
    const failures = [];
    const rendered = [];
    const documents = {Actor: [], Item: []};
    const waitForRender = async sheet => {
      for (let attempt = 0; attempt < 30 && !sheet.rendered; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    try {
      for (const [documentName, fallbackType] of [["Actor", "character"], ["Item", "gear"]]) {
        const registry = CONFIG[documentName].sheetClasses ?? {};
        const byType = new Map();

        for (const [subtype, entries] of Object.entries(registry)) {
          for (const [id, entry] of Object.entries(entries)) {
            if (!id.startsWith("ffg.") || !entry?.cls) continue;
            const type = subtype && subtype !== "base" ? subtype : fallbackType;
            if (!byType.has(type)) {
              byType.set(type, await CONFIG[documentName].documentClass.create({name: `sheet-probe-${type}`, type}));
              documents[documentName].push(byType.get(type).id);
            }
            const document = byType.get(type);
            try {
              const sheet = new entry.cls(document);
              await sheet.render(true);
              await waitForRender(sheet);
              if (!sheet.rendered) throw new Error("sheet did not reach the rendered state");
              rendered.push(`${id}@${type}`);
              await sheet.close();
            } catch (error) {
              failures.push(`${id}@${type}: ${error?.message ?? error}`);
            }
          }
        }
      }
    } finally {
      for (const [documentName, ids] of Object.entries(documents)) {
        if (ids.length) await CONFIG[documentName].documentClass.deleteDocuments(ids);
      }
    }

    return {failures, rendered};
  });

  expect(result.failures).toEqual([]);
  expect(result.rendered.length).toBeGreaterThan(0);
});

test("persists sheet field edits through the form submission path", async ({page}) => {
  test.setTimeout(120_000);
  // The document tests above write through the document API. Editing through a rendered sheet
  // goes through _updateObject and the effect helpers instead, which can fail independently.
  const result = await page.evaluate(async () => {
    const settle = ms => new Promise(resolve => setTimeout(resolve, ms));
    const cases = [
      {type: "gear", field: "data.encumbrance.value", path: "system.encumbrance.value", value: 7},
      {type: "gear", field: "data.price.value", path: "system.price.value", value: 42},
      {type: "weapon", field: "data.damage.value", path: "system.damage.value", value: 9},
    ];
    const results = [];

    for (const testCase of cases) {
      const item = await CONFIG.Item.documentClass.create({name: `persist-${testCase.type}`, type: testCase.type});
      try {
        const sheet = item.sheet;
        await sheet.render(true);
        for (let attempt = 0; attempt < 40 && !sheet.rendered; attempt += 1) await settle(100);
        const root = sheet.element?.[0] ?? sheet.element;
        const input = root?.querySelector(`input[name="${testCase.field}"]`);
        if (!input) {
          results.push({...testCase, error: "field not rendered"});
          await sheet.close();
          continue;
        }
        input.value = String(testCase.value);
        input.dispatchEvent(new Event("change", {bubbles: true}));
        await settle(2000);
        await sheet.close();
        await settle(1000);
        const persisted = foundry.utils.getProperty(game.items.get(item.id), testCase.path);
        results.push({...testCase, persisted});
      } finally {
        await item.delete();
      }
    }
    return results;
  });

  for (const entry of result) {
    expect(entry.error, `${entry.type}.${entry.field}`).toBeUndefined();
    expect(entry.persisted, `${entry.type}.${entry.field} did not persist`).toBe(entry.value);
  }
});

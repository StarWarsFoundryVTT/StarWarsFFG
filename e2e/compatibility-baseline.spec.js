// @ts-check
import {test, expect} from "@playwright/test";
import {openGame} from "../playwright/fixtures";

const expectedMigrationBaseline = Object.freeze({
  woundsMax: 1,
  strainMax: 0,
  soak: 1,
  defenceRanged: 1,
  defenceMelee: 0,
  encumbranceMax: 0,
});

test.beforeEach(async ({page}) => {
  await openGame(page);
});

test("starts the requested Foundry generation", async ({page}) => {
  const runtime = await page.evaluate(() => ({
    generation: game.release.generation,
    ready: game.ready,
    system: game.system.id,
  }));

  expect(runtime).toEqual({
    generation: Number(process.env.FOUNDRY_GENERATION || 14),
    ready: true,
    system: "starwarsffg",
  });
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

test("matches the recorded Version 13 migration mechanics baseline", async ({page}) => {
  test.skip(process.env.FOUNDRY_GENERATION !== "13" || process.env.FOUNDRY_MIGRATION_FIXTURE !== "1", "Version 13 migration fixture only");

  const prepared = await page.evaluate(() => {
    const actor = game.actors.getName("V13 Fixture Character");
    if (!actor) throw new Error("V13 Fixture Character is missing from the migration fixture");
    return {
      woundsMax: actor.system.stats.wounds.max,
      strainMax: actor.system.stats.strain.max,
      soak: actor.system.stats.soak.value,
      defenceRanged: actor.system.stats.defence.ranged,
      defenceMelee: actor.system.stats.defence.melee,
      encumbranceMax: actor.system.stats.encumbrance.max,
    };
  });

  expect(prepared).toEqual(expectedMigrationBaseline);
});

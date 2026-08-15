// @ts-check
import {test, expect} from "@playwright/test";
import {openGame} from "../playwright/fixtures";

test.describe("Foundry VTT 14 smoke", () => {
  test.skip(Number(process.env.FOUNDRY_GENERATION ?? 14) < 14, "Version 14-specific assertions");

  test.beforeEach(async ({page}) => {
    await openGame(page);
  });

  test("system reaches ready state without unexpected compatibility warnings", async ({page}) => {
    const compatibilityDiagnostics = [];
    page.on("console", message => {
      if (["warning", "error"].includes(message.type())) compatibilityDiagnostics.push(message.text());
    });
    page.on("pageerror", error => compatibilityDiagnostics.push(error.stack || error.message));
    await page.reload();
    await page.waitForFunction(() => Boolean(globalThis.game?.ready));
    await page.waitForTimeout(500);

    const diagnostics = await page.evaluate(() => ({
      generation: game.release.generation,
      ready: game.ready,
      system: game.system.id,
      activeUser: game.users.activeGM?.id,
    }));
    const unexpected = compatibilityDiagnostics.filter(message => message.includes("/systems/starwarsffg/")
      && !/V1 Application framework|template\.json is deprecated/.test(message));
    expect(unexpected).toEqual([]);
    expect(diagnostics.ready).toBe(true);
    expect(diagnostics.system).toBe("starwarsffg");
    expect(diagnostics.generation).toBe(Number(process.env.FOUNDRY_GENERATION || 14));
  });

  test("creates, updates, and deletes core documents", async ({page}) => {
  const result = await page.evaluate(async () => {
    const suffix = foundry.utils.randomID(6);
    const actor = await CONFIG.Actor.documentClass.create({name: `compat-actor-${suffix}`, type: "character"});
    const item = await CONFIG.Item.documentClass.create({name: `compat-item-${suffix}`, type: "gear"});
    await actor.update({"system.biography": "compatibility smoke"});
    const persisted = game.actors.get(actor.id)?.system.biography === "compatibility smoke"
      && game.items.has(item.id);
    await actor.delete();
    await item.delete();
    return persisted && !game.actors.has(actor.id) && !game.items.has(item.id);
  });
  expect(result).toBe(true);
  });

  test("renders a custom FFG roll for each message visibility mode", async ({page}) => {
  const results = await page.evaluate(async () => {
    const modes = ["public", "gm", "blind", "self"];
    const created = [];
    for (const messageMode of modes) {
      const roll = await new game.ffg.RollFFG("1da").evaluate();
      const message = await roll.toMessage({flavor: `compat-${messageMode}`}, {messageMode});
      created.push({id: message.id, mode: messageMode, blind: message.blind, whisper: message.whisper.length});
    }
    await foundry.documents.ChatMessage.deleteDocuments(created.map(result => result.id));
    return created;
  });
  expect(results.find(result => result.mode === "public")?.whisper).toBe(0);
  expect(results.find(result => result.mode === "blind")?.blind).toBe(true);
  expect(results.find(result => result.mode === "self")?.whisper).toBe(1);
  });

  test("renders dice symbols and binds a chat-card action once", async ({page}) => {
    test.setTimeout(60_000);
    await page.evaluate(async () => {
      await ui.sidebar.changeTab?.("chat", "primary");
      document.querySelector('#sidebar-tabs [data-tab="chat"]')?.click();
    });
    const ids = await page.evaluate(async () => {
      const messages = await foundry.documents.ChatMessage.createDocuments([
        {user: game.user.id, content: "Compatibility symbol [SU]"},
        {user: game.user.id, content: '<div class="starwarsffg item-card"><div class="summary"><i class="collapse-toggle fa-chevron-left"></i></div><div class="collapsible-content" hidden>Details</div></div>'},
    ]);
      return messages.map(message => message.id);
    });

    try {
      await expect.poll(() => page.evaluate(messageId => Boolean(document.querySelector(`[data-message-id="${messageId}"] .dietype.success`)), ids[0]), {timeout: 15_000}).toBe(true);
      const action = await page.evaluate(messageId => {
        const messages = [...document.querySelectorAll(`[data-message-id="${messageId}"]`)];
        const message = messages.find(element => element.checkVisibility()) ?? messages[0];
        const summary = message.querySelector(".item-card .summary");
        const details = message.querySelector(".collapsible-content");
        summary.click();
        return {expanded: summary.classList.contains("expanded"), hidden: details.hidden};
      }, ids[1]);
      expect(action).toEqual({expanded: true, hidden: false});
    } finally {
      await page.evaluate(messageIds => foundry.documents.ChatMessage.deleteDocuments(messageIds), ids);
    }
  });

  test("creates and applies a generation-native Active Effect", async ({page}) => {
  const result = await page.evaluate(async () => {
    const actor = await CONFIG.Actor.documentClass.create({name: `compat-effect-${foundry.utils.randomID(6)}`, type: "character"});
    const effect = (await actor.createEmbeddedDocuments("ActiveEffect", [{
      name: "compat-add-soak",
      system: {changes: [{key: "system.stats.soak.value", type: "add", value: 2}]},
    }]))[0];
    const valid = effect.system.changes[0].type === "add"
      && effect.system.changes[0].phase === "initial"
      && actor.system.stats.soak.value === 2;
    await actor.delete();
    return valid;
  });
  expect(result).toBe(true);
  });

  test("smokes importers, Item drag/drop, and generated macros", async ({page}) => {
    test.setTimeout(60_000);
    await page.evaluate(() => document.querySelector(".og-character")?.click());
    await expect(page.locator("#data-importer")).toBeVisible();
    await page.evaluate(() => document.querySelector("#data-importer [data-action=close]")?.click());
    await page.evaluate(() => document.querySelector(".swa-character")?.click());
    await expect(page.locator("#swa-importer")).toBeVisible();
    await page.evaluate(() => document.querySelector("#swa-importer .close")?.click());

    const result = await page.evaluate(async () => {
      const suffix = foundry.utils.randomID(6);
      const actor = await CONFIG.Actor.documentClass.create({name: `compat-macro-actor-${suffix}`, type: "character"});
      const gear = await CONFIG.Item.documentClass.create({name: `compat-drag-ability-${suffix}`, type: "ability"});
      const weapon = await CONFIG.Item.documentClass.create({name: `compat-macro-weapon-${suffix}`, type: "weapon"});
      const createdMacros = [];
      const originalRollSkill = game.ffg.DiceHelpers.rollSkillDirect;
      const originalToggleSheet = ui.hotbar.constructor.toggleDocumentSheet;
      let skillExecutions = 0;
      let itemExecutions = 0;
      try {
        const dropResult = await actor.sheet._onDropItem({}, {type: "Item", uuid: gear.uuid});
        const dropped = actor.items.some(item => item.name === gear.name);

        Hooks.callAll("hotbarDrop", ui.hotbar, {type: "Item", uuid: weapon.uuid}, 49);
        Hooks.callAll("hotbarDrop", ui.hotbar, {actorId: actor.id, data: {type: "skill", skill: "Cool", characteristic: "Presence"}}, 50);
        for (let attempt = 0; attempt < 30; attempt += 1) {
          const itemMacro = game.macros.getName(weapon.name);
          const skillMacro = game.macros.getName(`${actor.name}-Cool`);
          if (itemMacro && skillMacro) {
            createdMacros.push(itemMacro, skillMacro);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        ui.hotbar.constructor.toggleDocumentSheet = async uuid => { if (uuid === weapon.uuid) itemExecutions += 1; };
        game.ffg.DiceHelpers.rollSkillDirect = async () => { skillExecutions += 1; };
        await createdMacros[0]?.execute();
        await createdMacros[1]?.execute();
        return {dropped, dropCount: dropResult.length, embeddedItems: actor.items.map(item => item.name), macroCount: createdMacros.length, itemExecutions, skillExecutions};
      } finally {
        game.ffg.DiceHelpers.rollSkillDirect = originalRollSkill;
        ui.hotbar.constructor.toggleDocumentSheet = originalToggleSheet;
        if (createdMacros.length) await CONFIG.Macro.documentClass.deleteDocuments(createdMacros.map(macro => macro.id));
        await CONFIG.Item.documentClass.deleteDocuments([gear.id, weapon.id]);
        await actor.delete();
      }
    });

    expect(result).toMatchObject({dropped: true, dropCount: 1, macroCount: 2, itemExecutions: 1, skillExecutions: 1});
    expect(result.embeddedItems).toHaveLength(1);
  });

  test("exercises combat creation and turn advancement", async ({page}) => {
  const result = await page.evaluate(async () => {
    const originalRule = game.settings.get("starwarsffg", "initiativeRule");
    const actor = await CONFIG.Actor.documentClass.create({name: `compat-combat-${foundry.utils.randomID(6)}`, type: "character"});
    const combat = await CONFIG.Combat.documentClass.create({scene: canvas.scene?.id ?? null, active: true});
    const combatant = (await combat.createEmbeddedDocuments("Combatant", [{actorId: actor.id, initiative: 1}]))[0];
    try {
      await game.settings.set("starwarsffg", "initiativeRule", "c");
      const coolFormula = combat._getInitiativeFormula(combatant) === "Cool";
      await game.settings.set("starwarsffg", "initiativeRule", "v");
      const vigilanceFormula = combat._getInitiativeFormula(combatant) === "Vigilance";
      const genericId = await combat.addExtraSlot(1, CONST.TOKEN_DISPOSITIONS.FRIENDLY, 2.01);
      const generic = combat.combatants.get(genericId);
      await combat.startCombat();
      await combat.nextTurn();
      return combatant.actorId === actor.id
        && combat.round >= 1
        && coolFormula
        && vigilanceFormula
        && generic.getFlag("starwarsffg", "fake") === true
        && generic.initiative === 2.01;
    } finally {
      await game.settings.set("starwarsffg", "initiativeRule", originalRule);
      await combat.delete();
      await actor.delete();
    }
  });
  expect(result).toBe(true);
  });
});

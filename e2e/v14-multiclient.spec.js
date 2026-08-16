// @ts-check
import {test, expect} from "@playwright/test";
import {openGame} from "../playwright/fixtures";

test("synchronizes restricted chat, sockets, destiny, combat, and canvas state", async ({browser, page}) => {
  test.skip(Number(process.env.FOUNDRY_GENERATION ?? 14) < 14, "Version 14-specific multi-client check");
  test.setTimeout(120_000);
  await openGame(page);

  const fixture = await page.evaluate(async () => {
    const suffix = foundry.utils.randomID(6);
    const player = await CONFIG.User.documentClass.create({name: `Compatibility Player ${suffix}`, role: CONST.USER_ROLES.PLAYER});
    const actor = await CONFIG.Actor.documentClass.create({name: `Compatibility Multi-client ${suffix}`, type: "character"});
    const scene = canvas.scene ?? game.scenes.active ?? game.scenes.contents[0];
    const [token] = await scene.createEmbeddedDocuments("Token", [{name: `Compatibility Token ${suffix}`, actorId: actor.id, x: 0, y: 0}]);
    const combat = await CONFIG.Combat.documentClass.create({scene: scene.id, active: true});
    await combat.createEmbeddedDocuments("Combatant", [{actorId: actor.id, tokenId: token.id, sceneId: scene.id, initiative: 1}]);
    const message = await CONFIG.ChatMessage.documentClass.create({
      user: game.user.id,
      content: `Restricted ${suffix}`,
      whisper: [game.user.id],
    });
    globalThis.__compatSocketMessages = [];
    game.socket.on("system.starwarsffg", data => {
      if (data?.compatibilityMultiClient) globalThis.__compatSocketMessages.push(data.compatibilityMultiClient);
    });
    return {
      playerId: player.id,
      playerName: player.name,
      actorId: actor.id,
      sceneId: scene.id,
      tokenId: token.id,
      combatId: combat.id,
      messageId: message.id,
      originalLight: game.settings.get("starwarsffg", "dPoolLight"),
    };
  });

  const playerContext = await browser.newContext({baseURL: new URL(page.url()).origin});
  const playerPage = await playerContext.newPage();
  try {
    await playerPage.goto("/join");
    await playerPage.locator('input[name="username"]').fill(fixture.playerName);
    await playerPage.getByRole("button", {name: "Join Game"}).click();
    await playerPage.waitForURL(/\/game\/?$/);
    await playerPage.waitForFunction(() => Boolean(globalThis.game?.ready));

    const privacy = await playerPage.evaluate(messageId => {
      const message = game.messages.get(messageId);
      return !message || message.visible === false || message.isContentVisible === false;
    }, fixture.messageId);
    expect(privacy).toBe(true);

    await playerPage.evaluate(() => game.socket.emit("system.starwarsffg", {compatibilityMultiClient: game.user.id}));
    await expect.poll(() => page.evaluate(playerId => globalThis.__compatSocketMessages.includes(playerId), fixture.playerId)).toBe(true);

    await page.evaluate(value => game.settings.set("starwarsffg", "dPoolLight", value), fixture.originalLight + 1);
    await expect.poll(() => playerPage.evaluate(() => game.settings.get("starwarsffg", "dPoolLight"))).toBe(fixture.originalLight + 1);
    await expect.poll(() => playerPage.locator("#destinyLight").textContent()).toContain(String(fixture.originalLight + 1));

    await expect.poll(() => playerPage.evaluate(combatId => game.combats.has(combatId), fixture.combatId)).toBe(true);
    await expect.poll(() => playerPage.evaluate(({sceneId, tokenId}) => game.scenes.get(sceneId)?.tokens.has(tokenId) === true && canvas.scene?.id === sceneId, fixture)).toBe(true);
  } finally {
    await playerContext.close();
    await page.evaluate(async data => {
      await game.settings.set("starwarsffg", "dPoolLight", data.originalLight);
      await CONFIG.ChatMessage.documentClass.deleteDocuments([data.messageId]);
      await CONFIG.Combat.documentClass.deleteDocuments([data.combatId]);
      await game.scenes.get(data.sceneId)?.deleteEmbeddedDocuments("Token", [data.tokenId]);
      await CONFIG.Actor.documentClass.deleteDocuments([data.actorId]);
      await CONFIG.User.documentClass.deleteDocuments([data.playerId]);
    }, fixture);
  }
});

/**
 * Handles all logic related to migrating the system to a new version, including sending notifications
 * @returns {Promise<void>}
 */
export async function handleUpdate() {
  const registeredVersion = game.settings.get("starwarsffg", "systemMigrationVersion");
  const runningVersion = game.system.version;
  if (registeredVersion !== runningVersion) {
    await handleMigration(registeredVersion, runningVersion);
    await sendChanges(runningVersion);
    await game.settings.set("starwarsffg", "systemMigrationVersion", runningVersion);
  }
}

/**
 * Handles migration logic for the system
 * @param oldVersion - version previously run (from the settings)
 * @param newVersion - version currently running (from game.system.version)
 * @returns {Promise<void>}
 */
async function handleMigration(oldVersion, newVersion) {
  // migration handlers should be added here going forward
  await migrateTo1_901();
  await warnTheme();
  await resetCompendiumCheck();
}

/**
 * Sends a notification to all users in the game that the system has been updated
 * @param newVersion - version currently running (from game.system.version)
 * @returns {Promise<void>}
 */
async function sendChanges(newVersion) {
  const template = "systems/starwarsffg/templates/notifications/new_version.html";
  const html = await renderTemplate(template, { version: newVersion });
  const messageData = {
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content: html,
  };
  ChatMessage.create(messageData);
}

/**
 * Notify users if they are using the now-retired theme
 * @returns {Promise<void>}
 */
async function warnTheme() {
  if (game.settings.get("starwarsffg", "ui-uitheme") === "default") {
    const messageData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: "You are using an unsupported theme. Expected issues, or swap to the Mandar theme.<br>(This message will only show once.)",
    };
    ChatMessage.create(messageData);
  }
}

/**
 * Handles updating talents from species on actors to be a "species" talent rather than the default type
 * @returns {Promise<void>}
 */
async function migrateTo1_901() {
  for (const actor of game.actors) {
    for (const species of actor.items.filter(a => a.type === "species")) {
      for (const talent of Object.values(species.system.talents)) {
        await actor.items.find(i => i.name === talent.name)?.update({flags: {starwarsffg: {fromSpecies: true}}});
      }
    }
  }
}

/**
 * Reset the check for empty compendiums
 * @returns {Promise<void>}
 */
async function resetCompendiumCheck() {
  await game.settings.set("starwarsffg", "compendiumsPreviouslyEmpty", false);
}

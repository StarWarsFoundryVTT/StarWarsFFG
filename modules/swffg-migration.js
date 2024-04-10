/**
 * Handles all logic related to migrating the system to a new version, including sending notifications
 * @returns {Promise<void>}
 */
export async function handleUpdate() {
  const registeredVersion = game.settings.get("starwarsffg", "systemMigrationVersion");
  const runningVersion = game.system.version;
  if (registeredVersion !== runningVersion) {
    await handleMigration(runningVersion);
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

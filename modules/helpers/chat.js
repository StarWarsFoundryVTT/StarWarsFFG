/** Normalize message modes accepted by old macros to Foundry V14 names. */
const LEGACY_MODES = { publicroll: "public", gmroll: "gm", blindroll: "blind", selfroll: "self", ooc: "public" };

export function getMessageMode(options = {}) {
  let mode = options.messageMode ?? options.rollMode;
  if (!mode || mode === "roll") mode = game.settings.get("core", "messageMode");
  return LEGACY_MODES[mode] ?? mode;
}

export function getRollMessageOptions(mode) {
  return { messageMode: getMessageMode({ messageMode: mode }) };
}

export function applyMessageMode(message, mode) {
  message.applyMode(getMessageMode({ messageMode: mode }));
}

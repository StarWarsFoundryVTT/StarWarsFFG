/** Normalize the v13 roll modes and the v14 message modes at the system boundary. */
const LEGACY_MODES = { publicroll: "roll", gmroll: "gm", blindroll: "blind", selfroll: "self" };
const ROLL_MODES = { roll: "publicroll", gm: "gmroll", blind: "blindroll", self: "selfroll", ic: "publicroll", ooc: "publicroll" };

export function getMessageMode(options = {}) {
  const key = game.release.generation >= 14 ? "messageMode" : "rollMode";
  const mode = options.messageMode ?? options.rollMode ?? game.settings.get("core", key);
  return LEGACY_MODES[mode] ?? mode;
}

export function getRollMessageOptions(mode) {
  const normalized = LEGACY_MODES[mode] ?? mode;
  return game.release.generation >= 14
    ? { messageMode: normalized }
    : { rollMode: ROLL_MODES[normalized] ?? normalized };
}

export function applyMessageMode(message, mode) {
  const options = getRollMessageOptions(mode);
  if (game.release.generation >= 14) message.applyMode(options.messageMode);
  else message.applyRollMode(options.rollMode);
}

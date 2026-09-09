/** Normalize the v13 roll modes and the v14 message modes at the system boundary. */
const LEGACY_MODES = { publicroll: "public", gmroll: "gm", blindroll: "blind", selfroll: "self", ooc: "public" };
const ROLL_MODES = { public: "publicroll", gm: "gmroll", blind: "blindroll", self: "selfroll", ic: "publicroll" };

export function getMessageMode(options = {}) {
  const key = game.release.generation >= 14 ? "messageMode" : "rollMode";
  let mode = options.messageMode ?? options.rollMode;
  // The legacy "roll" value means the user's selected mode, not a public roll.
  if (!mode || mode === "roll") mode = game.settings.get("core", key);
  return LEGACY_MODES[mode] ?? mode;
}

export function getRollMessageOptions(mode) {
  const normalized = getMessageMode({ messageMode: mode });
  return game.release.generation >= 14
    ? { messageMode: normalized }
    : { rollMode: ROLL_MODES[normalized] ?? normalized };
}

export function applyMessageMode(message, mode) {
  const options = getRollMessageOptions(mode);
  if (game.release.generation >= 14) message.applyMode(options.messageMode);
  else message.applyRollMode(options.rollMode);
}

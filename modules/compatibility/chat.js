import { foundryGeneration } from "./foundry-version.js";

const LEGACY_TO_CURRENT = Object.freeze({
  roll: "public",
  publicroll: "public",
  gmroll: "gm",
  blindroll: "blind",
  selfroll: "self",
});

const CURRENT_TO_LEGACY = Object.freeze({
  public: "publicroll",
  gm: "gmroll",
  blind: "blindroll",
  self: "selfroll",
});

/**
 * Normalize legacy roll modes and current message modes.
 * @param {string|null|undefined} mode
 * @returns {string|null}
 */
export function normalizeMessageMode(mode) {
  if (!mode) return null;
  return LEGACY_TO_CURRENT[mode] ?? mode;
}

/**
 * Read the configured visibility without accessing Version 14's deprecated rollMode setting.
 * @param {number} [generation]
 * @param {object} [settings]
 * @returns {string}
 */
export function configuredMessageMode(generation = foundryGeneration(), settings = globalThis.game?.settings) {
  const setting = generation >= 14 ? "messageMode" : "rollMode";
  return normalizeMessageMode(settings?.get("core", setting)) ?? "public";
}

/**
 * Return the message mode representation expected by a Foundry generation.
 * @param {string|null|undefined} mode
 * @param {number} [generation]
 * @returns {string|null}
 */
export function messageModeForGeneration(mode, generation = foundryGeneration()) {
  const normalized = normalizeMessageMode(mode);
  if (!normalized) return null;
  return generation >= 14 ? normalized : (CURRENT_TO_LEGACY[normalized] ?? normalized);
}

/**
 * Apply visibility using the supported API for the active generation.
 * @param {object} message
 * @param {string} mode
 * @param {number} [generation]
 */
export function applyMessageMode(message, mode, generation = foundryGeneration()) {
  const normalized = normalizeMessageMode(mode) ?? configuredMessageMode(generation);
  if (generation >= 14) message.applyMode(normalized);
  else message.applyRollMode(messageModeForGeneration(normalized, generation));
}

/**
 * Return the Roll#toMessage option name and value for a generation.
 * @param {string} mode
 * @param {number} [generation]
 * @returns {object}
 */
export function messageModeOptions(mode, generation = foundryGeneration()) {
  const normalized = normalizeMessageMode(mode) ?? configuredMessageMode(generation);
  return generation >= 14
    ? {messageMode: normalized}
    : {rollMode: messageModeForGeneration(normalized, generation)};
}

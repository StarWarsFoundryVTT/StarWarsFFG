/**
 * Return the active Foundry generation without depending on compatibility globals.
 * @param {object} [release]
 * @returns {number}
 */
export function foundryGeneration(release = globalThis.game?.release) {
  const generation = Number(release?.generation ?? String(release?.version ?? release ?? "").split(".")[0]);
  return Number.isFinite(generation) ? generation : 0;
}

/**
 * Test whether the active Foundry generation is at least the requested generation.
 * @param {number} generation
 * @param {object} [release]
 * @returns {boolean}
 */
export function isFoundryGenerationAtLeast(generation, release) {
  return foundryGeneration(release) >= generation;
}

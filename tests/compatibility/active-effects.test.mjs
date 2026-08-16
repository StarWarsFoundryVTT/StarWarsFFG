import assert from "node:assert/strict";
import test from "node:test";

import {
  activeEffectChangeMode,
  activeEffectChangeType,
  activeEffectChangesUpdate,
  activeEffectCreateData,
  getActiveEffectChanges,
  getActiveEffectDuration,
} from "../../modules/compatibility/active-effects.js";

test("normalizes legacy and modern change types", () => {
  assert.equal(activeEffectChangeType({mode: 2}), "add");
  assert.equal(activeEffectChangeType({type: "override"}), "override");
  assert.equal(activeEffectChangeMode({type: "custom.-7"}), -7);
});

test("creates Version 14 Active Effect payloads", () => {
  const data = activeEffectCreateData({name: "Test", changes: [{key: "system.stats.soak.value", mode: 2, value: 1}]}, 14);
  assert.equal(data.changes, undefined);
  assert.deepEqual(data.system.changes, [{key: "system.stats.soak.value", type: "add", value: 1}]);
});

test("creates Version 13 Active Effect payloads", () => {
  const data = activeEffectCreateData({name: "Test", system: {changes: [{key: "system.stats.soak.value", type: "add", phase: "initial", value: 1}]}}, 13);
  assert.equal(data.system, undefined);
  assert.deepEqual(data.changes, [{key: "system.stats.soak.value", mode: 2, value: 1}]);
});

test("uses generation-native read and update paths", () => {
  const modern = {system: {changes: [{key: "modern"}]}, changes: [{key: "shim"}]};
  assert.deepEqual(getActiveEffectChanges(modern, 14), [{key: "modern"}]);
  assert.deepEqual(getActiveEffectChanges(modern, 13), [{key: "shim"}]);
  assert.deepEqual(activeEffectChangesUpdate([{key: "a", type: "add", value: 1}], 14), {
    "system.changes": [{key: "a", type: "add", value: 1}],
  });
});

test("reads Version 14 changes from source, without the parent back-reference", () => {
  // Prepared Version 14 change entries point back at their parent effect. Returning those makes
  // any clone, serialization, or document update of the result blow up on the cycle.
  const effect = {
    _source: {system: {changes: [{key: "system.stats.encumbrance.value", type: "add", value: 0}]}},
    system: {changes: [{key: "system.stats.encumbrance.value", type: "add", value: 0, priority: 20}]},
  };
  effect.system.changes[0].effect = effect;

  const changes = getActiveEffectChanges(effect, 14);
  assert.deepEqual(changes, [{key: "system.stats.encumbrance.value", type: "add", value: 0}]);
  assert.equal(changes[0].effect, undefined);
  assert.doesNotThrow(() => JSON.stringify(changes));
  assert.doesNotThrow(() => JSON.stringify(activeEffectChangesUpdate(changes, 14)));
});

test("normalizes Version 13 and Version 14 durations", () => {
  assert.deepEqual(getActiveEffectDuration({duration: {rounds: 2, combat: "abc"}}, 13), {value: 2, units: "rounds", combat: "abc"});
  assert.deepEqual(getActiveEffectDuration({duration: {value: 2, units: "rounds"}, start: {combat: "abc"}}, 14), {value: 2, units: "rounds", combat: "abc"});
});

test("preserves direct, transferred, disabled, status, skill, force, and inherent effect semantics", () => {
  const direct = activeEffectCreateData({
    name: "Direct effect",
    transfer: false,
    changes: [{key: "system.stats.soak.value", mode: 2, value: 1}],
  }, 14);
  const effect = {
    name: "Transferred skill and force bonus",
    disabled: true,
    transfer: true,
    statuses: ["stunned"],
    flags: {starwarsffg: {inherent: true}},
    changes: [
      {key: "system.skills.astrogation.rank", mode: 2, value: 1},
      {key: "system.forceRating.max", type: "upgrade", value: 2},
    ],
    duration: {rounds: 3, combat: "combat-1"},
  };

  const legacy = activeEffectCreateData(effect, 13);
  const modern = activeEffectCreateData(effect, 14);

  assert.equal(direct.transfer, false);
  assert.equal(direct.system.changes[0].type, "add");
  assert.equal(legacy.transfer, true);
  assert.equal(modern.transfer, true);
  assert.equal(legacy.disabled, true);
  assert.equal(modern.disabled, true);
  assert.deepEqual(legacy.statuses, modern.statuses);
  assert.deepEqual(legacy.flags, modern.flags);
  assert.deepEqual(
    legacy.changes.map(change => ({key: change.key, type: activeEffectChangeType(change), value: change.value})),
    modern.system.changes.map(change => ({key: change.key, type: activeEffectChangeType(change), value: change.value})),
  );
  assert.deepEqual(getActiveEffectDuration({duration: legacy.duration}, 13), {value: 3, units: "rounds", combat: "combat-1"});
});

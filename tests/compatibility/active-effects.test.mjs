import assert from "node:assert/strict";
import test from "node:test";

import {
  activeEffectChangeType,
  activeEffectChangesUpdate,
  activeEffectCreateData,
  getActiveEffectChanges,
  getActiveEffectDuration,
  getPreparedActiveEffectChanges,
  activeEffectUpdateData,
} from "../../modules/compatibility/active-effects.js";

test("normalizes persisted legacy change types for a V14 world migration", () => {
  assert.equal(activeEffectChangeType({mode: 2}), "add");
  assert.equal(activeEffectChangeType({type: "override"}), "override");
  assert.equal(activeEffectChangeType({mode: -7}), "custom.-7");
  assert.throws(() => activeEffectChangeType({mode: "broken"}), /Invalid/);
});

test("source reads are detached while V14 prepared changes stay mutable", () => {
  const source = [{key: "system.skills.Discipline.force", type: "add", value: 0, phase: "initial", priority: 20}];
  const effect = {_source: {system: {changes: source}}, system: {changes: structuredClone(source)}};
  effect.system.changes[0].effect = effect;
  const saved = getActiveEffectChanges(effect);
  saved[0].value = 99;
  getPreparedActiveEffectChanges(effect)[0].value = 2;
  assert.equal(source[0].value, 0);
  assert.equal(effect.system.changes[0].value, 2);
  const update = activeEffectChangesUpdate(effect.system.changes);
  assert.equal(update["system.changes"][0].effect, undefined);
  assert.equal(update["system.changes"][0].priority, 20);
  assert.doesNotThrow(() => JSON.stringify(update));
});

test("all accepted input shapes produce V14 update data without mutation", () => {
  const changes = [{key: "a", mode: 2, value: 0, phase: "final", priority: 42}];
  for (const input of [
    {_id: "id", changes, disabled: true, system: {duration: "once"}},
    {_id: "id", system: {duration: "once", changes}, disabled: true},
    {_id: "id", "system.changes": changes, system: {duration: "once"}, disabled: true},
  ]) {
    const before = structuredClone(input);
    const modern = activeEffectUpdateData(input);
    assert.equal(modern["system.changes"][0].type, "add");
    assert.equal(modern["system.changes"][0].value, 0);
    assert.equal(modern["system.changes"][0].phase, "final");
    assert.equal(modern.system.duration, "once");
    assert.equal(modern.disabled, true);
    assert.deepEqual(input, before);
  }
});

test("creates native V14 Active Effect payloads", () => {
  const data = activeEffectCreateData({name: "Test", changes: [{key: "system.stats.soak.value", mode: 2, value: 1}]});
  assert.equal(data.changes, undefined);
  assert.deepEqual(data.system.changes, [{key: "system.stats.soak.value", type: "add", value: 1}]);
  assert.deepEqual(activeEffectChangesUpdate(data.system.changes), {"system.changes": data.system.changes});
});

test("reads V14 source changes without the prepared parent back-reference", () => {
  const effect = {
    _source: {system: {changes: [{key: "system.stats.encumbrance.value", type: "add", value: 0}]}},
    system: {changes: [{key: "system.stats.encumbrance.value", type: "add", value: 0, priority: 20}]},
  };
  effect.system.changes[0].effect = effect;
  const changes = getActiveEffectChanges(effect);
  assert.deepEqual(changes, [{key: "system.stats.encumbrance.value", type: "add", value: 0}]);
  assert.doesNotThrow(() => JSON.stringify(activeEffectChangesUpdate(changes)));
});

test("reads native V14 effect duration", () => {
  assert.deepEqual(
    getActiveEffectDuration({duration: {value: 2, units: "rounds"}, start: {combat: "abc"}}),
    {value: 2, units: "rounds", combat: "abc"},
  );
});

test("preserves direct, transferred, disabled, status, skill, force, and inherent effect semantics", () => {
  const effect = activeEffectCreateData({
    name: "Transferred skill and force bonus",
    disabled: true,
    transfer: true,
    statuses: ["stunned"],
    flags: {starwarsffg: {inherent: true}},
    changes: [
      {key: "system.skills.astrogation.rank", mode: 2, value: 1},
      {key: "system.forceRating.max", type: "upgrade", value: 2},
    ],
  });
  assert.equal(effect.transfer, true);
  assert.equal(effect.disabled, true);
  assert.deepEqual(effect.statuses, ["stunned"]);
  assert.equal(effect.flags.starwarsffg.inherent, true);
  assert.deepEqual(effect.system.changes.map(change => change.type), ["add", "upgrade"]);
});

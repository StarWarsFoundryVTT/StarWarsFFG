import assert from "node:assert/strict";
import test from "node:test";

import {
  activeEffectMigrationUpdate,
  activeEffectNeedsMigration,
  normalizeActiveEffectSource,
} from "../../modules/migration/active-effects-v14.js";

test("normalizes legacy changes, duration, start, and metadata", () => {
  const source = {
    _id: "effect-id",
    name: "Legacy",
    disabled: true,
    statuses: ["stunned"],
    origin: "Actor.abc.Item.def",
    changes: [{key: "system.stats.soak.value", mode: 2, value: "1"}],
    duration: {rounds: 2, combat: "combat-id", startRound: 3, startTurn: 1},
  };
  const normalized = normalizeActiveEffectSource(source);
  assert.equal(normalized._id, source._id);
  assert.equal(normalized.disabled, true);
  assert.deepEqual(normalized.statuses, ["stunned"]);
  assert.deepEqual(normalized.system.changes, [{key: "system.stats.soak.value", type: "add", value: "1"}]);
  assert.deepEqual(normalized.duration, {value: 2, units: "rounds"});
  assert.deepEqual(normalized.start, {combat: "combat-id", time: null, round: 3, turn: 1});
});

test("builds an idempotent owned-field update from modern data", () => {
  const modern = {
    system: {changes: [{key: "system.stats.soak.value", type: "add", value: 1}]},
    duration: {value: 2, units: "rounds"},
    start: {combat: "combat-id", round: 3, turn: 1, time: null},
    origin: "Actor.abc.Item.def",
  };
  const update = activeEffectMigrationUpdate(modern);
  assert.deepEqual(update["system.changes"], modern.system.changes);
  assert.deepEqual(update.duration, modern.duration);
  assert.deepEqual(update.start, modern.start);
  assert.equal(update.origin, modern.origin);
});

test("removes the legacy top-level changes field", () => {
  const update = activeEffectMigrationUpdate({
    changes: [{key: "system.stats.soak.value", mode: 2, value: 1}],
  });
  assert.equal(update["-=changes"], null);
});

test("rejects malformed effect source", () => {
  assert.throws(() => normalizeActiveEffectSource(null), /must be an object/);
});

test("detects legacy sources and skips normalized sources", () => {
  const legacy = {
    _source: {changes: [{key: "a", mode: 2, value: 1}]},
    system: {changes: [{key: "a", type: "add", value: 1}]},
    toObject() { return {changes: this._source.changes}; },
  };
  assert.equal(activeEffectNeedsMigration(legacy), true);

  const modern = {
    _source: {system: {changes: [{key: "a", type: "add", value: 1}]}},
    system: {changes: [{key: "a", type: "add", value: 1}]},
    toObject() { return this._source; },
  };
  assert.equal(activeEffectNeedsMigration(modern), false);
});

import assert from "node:assert/strict";
import test from "node:test";

class ForcedDeletion {}
globalThis.foundry = {data: {operators: {ForcedDeletion}}};

import {
  activeEffectMigrationUpdate,
  activeEffectNeedsMigration,
  normalizeActiveEffectSource,
  ensureActiveEffectsV14,
  migrateActiveEffectsV14,
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

test("duration-only migrations preserve zero, expiry, metadata and explicit start", () => {
  const source = {system: {duration: "combat", changes: [{key: "a", type: "add", value: 1}]},
    duration: {rounds: 0, expiry: "turnEnd", startRound: 2}, start: null, flags: {custom: {value: true}}};
  const before = structuredClone(source);
  assert.equal(activeEffectNeedsMigration(source), true);
  const normalized = normalizeActiveEffectSource(source);
  assert.deepEqual(normalized.duration, {value: 0, units: "rounds", expiry: "turnEnd"});
  assert.equal(normalized.start, null);
  assert.equal(normalized.system.duration, "combat");
  assert.deepEqual(normalized.flags, source.flags);
  assert.equal(activeEffectNeedsMigration(normalized), false);
  assert.deepEqual(source, before);
});

test("compatibility accessors do not cause repeated migrations", () => {
  const source = {system: {changes: [{key: "a", type: "add", value: 1}]}};
  Object.defineProperty(source, "changes", {get: () => source.system.changes});
  assert.equal(activeEffectNeedsMigration({toObject: () => source}), false);
});

function world() {
  let checkpoint = 0;
  const effects = [];
  function effect(id) {
    const source = {name: id, changes: [{key: "system.stats.soak.value", mode: 2, value: 1}],
      flags: {starwarsffg: {inherent: true}}, disabled: id === "disabled", system: {duration: "once"}};
    const item = {uuid: id, _source: source, calls: 0, fail: false,
      toObject: () => structuredClone(source),
      async update(update) {
        this.calls += 1;
        if (this.fail) throw new Error("simulated write failure");
        source.system.changes = structuredClone(update["system.changes"]);
        if (update.changes instanceof ForcedDeletion) delete source.changes;
        for (const key of ["duration", "start", "origin"]) if (Object.hasOwn(update, key)) source[key] = update[key];
      },
    };
    effects.push(item);
    return item;
  }
  const synthetic = {uuid: "Scene.s.Token.t.Actor.a", effects: [effect("synthetic")], items: []};
  const packActor = {effects: [effect("pack-actor")], items: []};
  const packItem = {effects: [effect("pack-item")]};
  const skippedPack = (collection, locked, packageType) => ({collection, locked, documentName: "Actor",
    metadata: {packageType}, getDocuments() {throw new Error("must not load non-writable pack");}});
  const game = {release: {generation: 14}, user: {id: "gm", isGM: true}, users: {activeGM: {id: "gm"}},
    actors: [{effects: [effect("direct")], items: [{effects: [effect("disabled")]}]}],
    items: [{effects: [effect("standalone")]}],
    scenes: [{tokens: [{actorLink: true}, {actorLink: false, actor: synthetic}, {actorLink: false, actor: synthetic}]}],
    packs: [
      {collection: "world.actors", documentName: "Actor", metadata: {packageType: "world"}, getDocuments: async () => [packActor]},
      {collection: "world.items", documentName: "Item", metadata: {packageType: "world"}, getDocuments: async () => [packItem]},
      skippedPack("world.locked", true, "world"), skippedPack("system.external", false, "system"),
    ],
    settings: {get: () => checkpoint, set: async (scope, key, value) => {checkpoint = value;}},
  };
  return {game, effects, checkpoint: () => checkpoint};
}

test("traverses all writable stores once and preserves effect metadata", async () => {
  const fixture = world();
  globalThis.game = fixture.game;
  try {
    const report = await ensureActiveEffectsV14();
    assert.equal(report.migrated.length, 6);
    assert.deepEqual(report.failed, []);
    assert.equal(report.lockedPacks.length, 2);
    assert.equal(fixture.checkpoint(), 1);
    for (const effect of fixture.effects) {
      assert.equal(effect.calls, 1);
      assert.equal(effect._source.system.duration, "once");
      assert.equal(effect._source.flags.starwarsffg.inherent, true);
      assert.equal(effect._source.disabled, effect.uuid === "disabled");
    }
    assert.equal(await ensureActiveEffectsV14(), null);
  } finally { delete globalThis.game; }
});

test("a failed write retains the checkpoint and is retried without rewriting successful documents", async () => {
  const fixture = world();
  const failed = fixture.effects.find(effect => effect.uuid === "direct");
  failed.fail = true;
  globalThis.game = fixture.game;
  try {
    const first = await ensureActiveEffectsV14();
    assert.equal(first.failed.length, 1);
    assert.equal(fixture.checkpoint(), 0);
    assert.equal(failed._source.changes[0].mode, 2);
    failed.fail = false;
    const next = await ensureActiveEffectsV14();
    assert.deepEqual(next.migrated, ["direct"]);
    assert.equal(next.skipped.length, 5);
    assert.equal(fixture.checkpoint(), 1);
  } finally { delete globalThis.game; }
});

test("malformed source and unreadable writable packs are reported and prevent checkpoint advancement", async () => {
  const fixture = world();
  fixture.effects[0]._source.changes = null;
  fixture.game.packs[0].getDocuments = async () => {throw new Error("unreadable pack");};
  globalThis.game = fixture.game;
  try {
    const report = await ensureActiveEffectsV14();
    assert.equal(report.failed.length, 2);
    assert.equal(fixture.effects[0].calls, 0);
    assert.equal(fixture.checkpoint(), 0);
  } finally { delete globalThis.game; }
});

test("only the active V14 GM can run the persisted migration", async () => {
  for (const [isGM, id] of [[false, "player"], [true, "other-gm"]]) {
    const fixture = world();
    fixture.game.user = {id, isGM};
    globalThis.game = fixture.game;
    try {
      assert.equal(await ensureActiveEffectsV14(), null);
      assert.deepEqual((await migrateActiveEffectsV14()).migrated, []);
      assert.equal(fixture.checkpoint(), 0);
      assert.ok(fixture.effects.every(effect => effect.calls === 0));
    } finally { delete globalThis.game; }
  }
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
  assert.ok(update.changes instanceof ForcedDeletion);
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

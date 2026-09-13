import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

// Exercise the real system modules without requiring a licensed Foundry server.
// The stubs implement the external document boundary; browser tests still validate core integration.
async function loadSystem(defaultMode = "blind") {
  const created = [];
  const settingsRead = [];
  class ChatMessageStub {
    constructor(data) { this.data = { whisper: [], blind: false, ...data }; }
    applyMode(mode) {
      assert.ok(['public', 'ic', 'gm', 'blind', 'self'].includes(mode), 'must pass a registered v14 message mode');
      this.setVisibility(mode);
    }
    setVisibility(mode) {
      if (mode === 'public') this.data.whisper = [];
      if (["gm", "blind"].includes(mode)) this.data.whisper = ["gm-id"];
      if (mode === "self") this.data.whisper = ["player-id"];
      this.data.blind = mode === "blind";
    }
    toObject() { return { ...this.data }; }
    static async create(data) { created.push(data); return data; }
  }
  class RollStub {
    constructor() { this.terms = []; this.data = {}; this._evaluated = false; }
    get total() { return this._total; }
  }
  const context = vm.createContext({
    game: {
      i18n: { localize: key => key === 'SWFFG.Effect.Duration.Permanent' ? 'Permanent' : key },
      release: { generation: 14 },
      user: { id: "player-id" },
      settings: { get(scope, key) {
        settingsRead.push(`${scope}.${key}`);
        assert.equal(key, "messageMode");
        return defaultMode;
      } },
    },
    CONFIG: { sounds: { dice: "dice.ogg" } },
    CONST: { ACTIVE_EFFECT_CHANGE_TYPES: { add: 20 } },
    foundry: { utils: { mergeObject: (base, extra) => ({ ...base, ...extra }) } },
    Roll: RollStub,
    getDocumentClass: () => ChatMessageStub,
    Hooks: { call() {} },
  });
  const chat = new vm.SourceTextModule(await readFile(new URL('../modules/helpers/chat.js', import.meta.url), 'utf8'), { context });
  await chat.link(() => { throw new Error('Unexpected chat helper import'); });
  await chat.evaluate();
  const effects = new vm.SourceTextModule(await readFile(new URL('../modules/helpers/effects.js', import.meta.url), 'utf8'), { context });
  await effects.link(() => { throw new Error('Unexpected effect helper import'); });
  await effects.evaluate();
  const rollModule = new vm.SourceTextModule(await readFile(new URL('../modules/dice/roll.js', import.meta.url), 'utf8'), { context });
  await rollModule.link(async (specifier) => {
    if (specifier === '../helpers/chat.js') return chat;
    const stub = new vm.SyntheticModule(['default', 'ForceDie', 'migrateDataToSystem', 'ItemFFG'], function () {
      this.setExport('default', class {});
      this.setExport('ForceDie', class {});
      this.setExport('migrateDataToSystem', data => data);
      this.setExport('ItemFFG', class {});
    }, { context });
    return stub;
  });
  await rollModule.evaluate();
  const roll = new rollModule.namespace.RollFFG();
  roll._evaluated = true;
  roll._total = 2;
  return { roll, created, settingsRead, chat: chat.namespace, effects: effects.namespace.default };
}

test('v14 uses the saved blind mode without reading the removed core.rollMode setting', async () => {
  const { roll, created, settingsRead } = await loadSystem();
  const data = await roll.toMessage({}, { create: false });
  assert.deepEqual(settingsRead, ['core.messageMode']);
  assert.deepEqual(data.whisper, ['gm-id']);
  assert.equal(data.blind, true);
  assert.equal(data.author, 'player-id');
  assert.equal(created.length, 0, 'create:false must not publish an initiative message');
  assert.equal(data.rolls[0], roll);
});

for (const [mode, recipients, blind] of [
  ['gm', ['gm-id'], false], ['blind', ['gm-id'], true], ['self', ['player-id'], false], ['public', [], false],
  ['publicroll', [], false], ['roll', ['gm-id'], true],
  ['gmroll', ['gm-id'], false], ['blindroll', ['gm-id'], true], ['selfroll', ['player-id'], false],
]) {
  test(`v14 publishes ${mode} with the intended recipients`, async () => {
    const { roll, created } = await loadSystem();
    await roll.toMessage({}, { messageMode: mode });
    assert.equal(created.length, 1);
    assert.deepEqual(created[0].whisper, recipients);
    assert.equal(created[0].blind, blind);
  });
}

test('explicit message mode overrides legacy options and the saved default', async () => {
  const { roll, settingsRead } = await loadSystem();
  const data = await roll.toMessage({ user: 'macro-author', rollMode: 'blindroll', flavor: 'Initiative' },
    { messageMode: 'self', rollMode: 'gmroll', create: false });
  assert.deepEqual(data.whisper, ['player-id']);
  assert.equal(data.author, 'macro-author');
  assert.equal(data.flavor, 'Initiative');
  assert.equal('user' in data, false);
  assert.equal('rollMode' in data, false);
  assert.equal('messageMode' in data, false);
  assert.deepEqual(settingsRead, []);
});

test('legacy macro roll mode names are normalized to V14 message modes', async () => {
  const { roll } = await loadSystem('blind');
  const data = await roll.toMessage({ whisper: ['gm-id'] }, { rollMode: 'publicroll', create: false });
  assert.deepEqual(data.whisper, []);
  assert.equal(data.blind, false);
});

test('the legacy roll sentinel uses the saved V14 message mode', async () => {
  const { roll } = await loadSystem('self');
  const data = await roll.toMessage({}, { rollMode: 'roll', create: false });
  assert.deepEqual(data.whisper, ['player-id']);
});

test('private obligation rolls use the V14 Roll option', async () => {
  const { chat } = await loadSystem();
  assert.deepEqual(JSON.parse(JSON.stringify(chat.getRollMessageOptions('gm'))), { messageMode: 'gm' });
});

test('new effects use the V14 string type', async () => {
  const { effects } = await loadSystem();
  assert.deepEqual(JSON.parse(JSON.stringify(effects.changeType())), { type: 'add' });
});

test('v14 effect display uses prepared duration text without mutating the original change', async () => {
  const { effects } = await loadSystem();
  const source = { name: 'Defense', duration: { units: 'rounds', value: 2 },
    system: { changes: [{ key: 'system.stats.defence.ranged', type: 'add', phase: 'initial', priority: 20, value: '1' }] } };
  const document = { id: 'effect-id', parent: { name: 'Armor' }, active: true, isTemporary: true,
    duration: { label: '2 rounds' }, toObject: () => structuredClone(source) };
  const display = effects.transformEffects(document);
  assert.equal(display.duration, '2 rounds');
  assert.equal(display.changes[0].mode, 'ADD');
  assert.equal(display.changes[0].key, 'stats.defence.ranged');
  assert.equal(source.system.changes[0].key, 'system.stats.defence.ranged');
  assert.equal(source.system.changes[0].mode, undefined);
  assert.equal(display.changes[0].phase, 'initial');
  assert.equal(display.changes[0].priority, 20);
  document.isTemporary = false;
  document.duration = { label: 'None', value: Infinity };
  assert.equal(effects.transformEffects(document).duration, 'Permanent');
  assert.equal(document.duration.label, 'None');
});

test('the final effect phase does not count initial Force Rating bonuses a second time', async () => {
  class ActorStub {
    applyActiveEffects(phase) { this.phases.push(phase); }
  }
  const context = vm.createContext({ Actor: ActorStub, game: {release: {generation: 14}}, structuredClone });
  const effects = new vm.SourceTextModule(await readFile(new URL('../modules/compatibility/active-effects.js', import.meta.url), 'utf8'), {context});
  await effects.link(() => { throw new Error('Unexpected Active Effect helper import'); });
  const module = new vm.SourceTextModule(await readFile(new URL('../modules/actors/actor-ffg.js', import.meta.url), 'utf8'), { context });
  await module.link(specifier => specifier.includes('/compatibility/') ? effects : new vm.SyntheticModule(['default'], function () {
    this.setExport('default', class {});
  }, { context }));
  await module.evaluate();
  const actor = new module.namespace.ActorFFG();
  actor.phases = [];
  actor.system = { stats: { forcePool: { max: 2, value: 1 } } };
  const skillChange = { key: 'system.skills.Discipline.force', value: 0 };
  actor.allApplicableEffects = () => [
    { active: true, system: {changes: [{ key: 'system.stats.forcePool.max', value: 1 }, skillChange]} },
    { active: false, system: {changes: [{ key: 'system.stats.forcePool.max', value: 5 }]} },
  ];
  actor.applyActiveEffects('initial');
  assert.equal(skillChange.value, 2, 'only active bonuses, minus committed dice');
  actor.system.stats.forcePool.max = 3; // Core has now applied the initial bonus.
  actor.applyActiveEffects('final');
  assert.equal(skillChange.value, 2, 'final preparation must not add the same bonus again');
  assert.deepEqual(actor.phases, ['initial', 'final'], 'both phases still reach core');
});

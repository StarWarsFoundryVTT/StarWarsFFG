import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

// Exercise the real system modules without requiring a licensed Foundry server.
// The stubs implement the external document boundary; browser tests still validate core integration.
async function loadSystem(generation = 14, defaultMode = "blind") {
  const created = [];
  const settingsRead = [];
  class ChatMessageStub {
    constructor(data) { this.data = { whisper: [], blind: false, ...data }; }
    applyMode(mode) {
      assert.equal(generation, 14, "v13 must use applyRollMode");
      this.setVisibility(mode);
    }
    applyRollMode(mode) {
      assert.equal(generation, 13, "v14 must use applyMode");
      this.setVisibility({ publicroll: "roll", gmroll: "gm", blindroll: "blind", selfroll: "self" }[mode]);
    }
    setVisibility(mode) {
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
      release: { generation },
      user: { id: "player-id" },
      settings: { get(scope, key) {
        settingsRead.push(`${scope}.${key}`);
        assert.equal(key, generation === 14 ? "messageMode" : "rollMode");
        return defaultMode;
      } },
    },
    CONFIG: { sounds: { dice: "dice.ogg" } },
    CONST: generation === 14
      ? { ACTIVE_EFFECT_CHANGE_TYPES: { add: 20 } }
      : { ACTIVE_EFFECT_MODES: { ADD: 2 } },
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
  ['gm', ['gm-id'], false], ['blind', ['gm-id'], true], ['self', ['player-id'], false], ['roll', [], false],
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

test('v13 still uses its saved private roll mode', async () => {
  const { roll, settingsRead } = await loadSystem(13, 'gmroll');
  const data = await roll.toMessage({}, { create: false });
  assert.deepEqual(data.whisper, ['gm-id']);
  assert.deepEqual(settingsRead, ['core.rollMode']);
});

test('private obligation rolls supply the appropriate core Roll option in both generations', async () => {
  for (const generation of [13, 14]) {
    const { chat } = await loadSystem(generation);
    const options = JSON.parse(JSON.stringify(chat.getRollMessageOptions('gm')));
    assert.deepEqual(options, generation === 14 ? { messageMode: 'gm' } : { rollMode: 'gmroll' });
  }
});

test('new effects use the modern type field, with the legacy format retained on v13', async () => {
  for (const generation of [13, 14]) {
    const { effects } = await loadSystem(generation);
    const change = JSON.parse(JSON.stringify(effects.changeType()));
    assert.deepEqual(change, generation === 14 ? { type: 'add' } : { mode: 2 });
  }
});

test('v14 effect display uses prepared duration text without mutating the original change', async () => {
  const { effects } = await loadSystem();
  const source = { name: 'Defense', duration: { units: 'rounds', value: 2 },
    changes: [{ key: 'system.stats.defence.ranged', type: 'add', phase: 'base', priority: 20, value: '1' }] };
  const document = { id: 'effect-id', parent: { name: 'Armor' }, active: true,
    duration: { label: '2 rounds' }, toObject: () => structuredClone(source) };
  const display = effects.transformEffects(document);
  assert.equal(display.duration, '2 rounds');
  assert.equal(display.changes[0].mode, 'ADD');
  assert.equal(display.changes[0].key, 'stats.defence.ranged');
  assert.equal(source.changes[0].key, 'system.stats.defence.ranged');
  assert.equal(source.changes[0].mode, undefined);
  assert.equal(display.changes[0].phase, 'base');
  assert.equal(display.changes[0].priority, 20);
});

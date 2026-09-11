import assert from "node:assert/strict";
import test from "node:test";
import {createFFGMacro} from "../../modules/helpers/macros.js";

test("generated weapon and skill macros execute with current document data and reuse existing macros", async () => {
  const macros = [];
  const calls = [];
  const assignments = [];
  const actor = {id: "actor-id", name: "Character", system: {
    skills: {'Cool "custom"': {rank: 2}}, characteristics: {Presence: {value: 3}},
  }, sheet: {async getData() {await Promise.resolve(); return {actor: "prepared"};}}};
  const owned = {id: "weapon-id", name: "Blaster", type: "weapon", actor};
  const standalone = {id: "world-weapon", name: "World weapon", type: "weapon"};
  const world = {macros, actors: {get: id => id === actor.id ? actor : null},
    user: {assignHotbarMacro: async (macro, slot) => assignments.push({macro, slot})},
    ffg: {DiceHelpers: {rollItem: async (...args) => calls.push(args),
      rollSkillDirect: async (...args) => calls.push(args)}},
  };
  globalThis.game = world;
  globalThis.CONFIG = {Macro: {documentClass: {create: async data => {macros.push(data); return data;}}}};
  globalThis.foundry = {utils: {fromUuid: async uuid => uuid.startsWith("Actor.") ? owned : standalone}};
  globalThis.ui = {hotbar: {constructor: {toggleDocumentSheet: async uuid => calls.push(uuid)}}};
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  try {
    await createFFGMacro(null, {type: "Item", uuid: "Actor.actor-id.Item.weapon-id"}, 1);
    await new AsyncFunction(macros[0].command)();
    assert.deepEqual(calls.pop(), ["weapon-id", "actor-id"]);
    await createFFGMacro(null, {type: "Item", uuid: "Actor.actor-id.Item.weapon-id"}, 2);
    assert.equal(macros.length, 1);
    assert.equal(assignments[1].macro, macros[0]);
    await createFFGMacro(null, {type: "Item", uuid: "Item.world-weapon"}, 3);
    await new AsyncFunction(macros[1].command)();
    assert.equal(calls.pop(), "Item.world-weapon");
    await createFFGMacro(null, {actorId: actor.id, data: {type: "skill", skill: 'Cool "custom"', characteristic: "Presence"}}, 4);
    await new AsyncFunction(macros[2].command)();
    assert.deepEqual(calls.pop(), [{rank: 2}, {value: 3}, 2, {actor: "prepared"}]);
    await createFFGMacro(null, {type: "Transfer", actorId: actor.id, data: {type: "weapon", _id: owned.id, name: owned.name}}, 5);
    await new AsyncFunction(macros[3].command)();
    assert.deepEqual(calls.pop(), [owned.id, actor.id]);
  } finally {
    for (const key of ["game", "CONFIG", "foundry", "ui"]) delete globalThis[key];
  }
});

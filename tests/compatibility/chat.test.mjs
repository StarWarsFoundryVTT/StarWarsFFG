import assert from "node:assert/strict";
import test from "node:test";

import {
  applyMessageMode,
  configuredMessageMode,
  messageModeForGeneration,
  messageModeOptions,
  normalizeMessageMode,
} from "../../modules/compatibility/chat.js";

test("normalizes legacy roll modes", () => {
  assert.equal(normalizeMessageMode("publicroll"), "public");
  assert.equal(normalizeMessageMode("gmroll"), "gm");
  assert.equal(normalizeMessageMode("blindroll"), "blind");
  assert.equal(normalizeMessageMode("selfroll"), "self");
});

test("reads the generation-native setting", () => {
  const calls = [];
  const settings = {get(namespace, key) { calls.push([namespace, key]); return key === "messageMode" ? "gm" : "gmroll"; }};
  assert.equal(configuredMessageMode(14, settings), "gm");
  assert.equal(configuredMessageMode(13, settings), "gm");
  assert.deepEqual(calls, [["core", "messageMode"], ["core", "rollMode"]]);
});

test("returns generation-native message options", () => {
  assert.deepEqual(messageModeOptions("blindroll", 14), {messageMode: "blind"});
  assert.deepEqual(messageModeOptions("blind", 13), {rollMode: "blindroll"});
  assert.equal(messageModeForGeneration("self", 13), "selfroll");
});

test("applies visibility through the supported API", () => {
  const calls = [];
  const message = {
    applyMode(mode) { calls.push(["modern", mode]); },
    applyRollMode(mode) { calls.push(["legacy", mode]); },
  };
  applyMessageMode(message, "gmroll", 14);
  applyMessageMode(message, "gm", 13);
  assert.deepEqual(calls, [["modern", "gm"], ["legacy", "gmroll"]]);
});

import assert from "node:assert/strict";
import test from "node:test";

import {bindChatAction} from "../../modules/helpers/chat-message.js";

test("delegated chat actions invoke exactly once for one event", () => {
  let listener;
  const target = {closest: selector => selector === ".action" ? target : null};
  const html = {
    addEventListener(name, callback) { assert.equal(name, "click"); listener = callback; },
    contains(candidate) { return candidate === target; },
  };
  let calls = 0;
  bindChatAction(html, "click", ".action", (event, matched) => {
    calls += 1;
    assert.equal(matched, target);
  });
  listener({target});
  assert.equal(calls, 1);
});

test("delegated chat actions ignore unmatched events", () => {
  let listener;
  const html = {
    addEventListener(name, callback) { listener = callback; },
    contains() { return false; },
  };
  let calls = 0;
  bindChatAction(html, "click", ".action", () => { calls += 1; });
  listener({target: {closest: () => null}});
  assert.equal(calls, 0);
});

import assert from "node:assert/strict";
import test from "node:test";
import { MODULES } from "./modules.ts";

test("roof lessons are step by step and each step has a picture", () => {
  assert.ok(MODULES.length >= 12);
  for (const mod of MODULES) {
    assert.ok(mod.steps.length >= 2, mod.id);
    for (const step of mod.steps) {
      assert.ok(step.say.length > 20, mod.id);
      assert.ok(step.visual.kind, mod.id);
    }
  }
});

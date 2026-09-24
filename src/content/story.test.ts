import assert from "node:assert/strict";
import test from "node:test";
import { connector } from "./story.ts";

test("the first lesson has no connector", () => {
  assert.deepEqual(connector("1-1"), []);
});

test("a later lesson exposes connector lines of its own", () => {
  const lines = connector("1-2");
  assert.equal(lines.length > 0, true);
  assert.equal(lines[0].who, "dani");
});

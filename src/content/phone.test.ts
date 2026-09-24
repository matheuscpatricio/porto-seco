import assert from "node:assert/strict";
import test from "node:test";
import { phoneLines } from "./phone.ts";

test("the phone call explains print in everyday words", () => {
  const lines = phoneLines({ id: "1-1", theory: "`print()`", example: 'print("oi")' });
  assert.equal(lines[0].who, "dani");
  assert.match(lines.map((l) => l.text).join(" "), /mostrar uma frase/);
  assert.equal(lines.at(-1)?.who, "dani");
});

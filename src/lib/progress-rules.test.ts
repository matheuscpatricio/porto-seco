import assert from "node:assert/strict";
import test from "node:test";
import { buyBike, buyRide, buyWeapon, EMPTY_LIFE, firstClearPay, mergeRecord } from "./progress-rules.ts";

test("first completion pays ten times the lesson xp", () => {
  assert.equal(firstClearPay(0, 40), 400);
});

test("a replay pays nothing", () => {
  assert.equal(firstClearPay(2, 40), 0);
  assert.equal(firstClearPay(3, 40), 0);
});

test("asking Dani for help pays nothing", () => {
  assert.equal(firstClearPay(0, 40, true), 0);
});

test("a weapon purchase needs the price and replaces the old gun", () => {
  assert.equal(buyWeapon(100, "choque", "rajada").bought, false);
  const deal = buyWeapon(480, "choque", "rajada");
  assert.equal(deal.bought, true);
  assert.equal(deal.money, 0);
  assert.equal(deal.weapon, "rajada");
  assert.equal(buyWeapon(2000, "rajada", "rajada").bought, false);
});

test("a bike purchase needs the price", () => {
  assert.equal(buyRide(649, "entrega", "esportiva").bought, false);
  const deal = buyRide(650, "entrega", "esportiva");
  assert.equal(deal.bought, true);
  assert.equal(deal.ride, "esportiva");
  assert.equal(deal.money, 0);
});

test("a save without money or bike fills the empty life", () => {
  const merged = mergeRecord({ xp: 0, stars: {}, ...EMPTY_LIFE }, { xp: 12, stars: { a: 1 } });
  assert.equal(merged.money, 0);
  assert.equal(merged.bike, true);
  assert.equal(merged.xp, 12);
});

test("buying below 500 changes nothing", () => {
  assert.deepEqual(buyBike(499, false), { money: 499, bike: false, bought: false });
});

test("buying at 500 subtracts the price once", () => {
  assert.deepEqual(buyBike(500, false), { money: 0, bike: true, bought: true });
  assert.deepEqual(buyBike(800, true), { money: 800, bike: true, bought: false });
});

test("a save that already owns the bike keeps it", () => {
  const merged = mergeRecord({ xp: 0, stars: {}, ...EMPTY_LIFE }, { money: 80, bike: true });
  assert.equal(merged.bike, true);
  assert.equal(merged.money, 80);
});

test("a broken save falls back to the empty life", () => {
  const merged = mergeRecord({ ...EMPTY_LIFE }, null);
  assert.equal(merged.money, 0);
  assert.equal(merged.bike, true);
});

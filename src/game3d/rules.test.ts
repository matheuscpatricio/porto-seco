import assert from "node:assert/strict";
import test from "node:test";
import {
  BIKE_PARK,
  canMount,
  COAST,
  decayWanted,
  districtAt,
  doorOpen,
  endingFor,
  hitWanted,
  HOME,
  HOME_STUDY,
  indoors,
  inSea,
  ISLAND,
  knockdownWanted,
  liveScript,
  overlapsStreet,
  roomExit,
  shirtFor,
  SHOP_A,
  SHOP_B,
  stepKinds,
  WANTED_SECONDS,
} from "./rules.ts";

test("two districts keep the same addresses", () => {
  assert.equal(districtAt(20, 20), districtAt(20, 20));
  assert.equal(districtAt(20, 20), "w1");
  assert.notEqual(districtAt(70, 20), districtAt(20, 20));
});

test("the beach is walkable and the sea starts past it", () => {
  assert.equal(inSea(20, 8), false);
  assert.equal(inSea(-2, 20), false);
  assert.equal(inSea(ISLAND + 4, 20), false);
  assert.equal(inSea(-COAST - 1, 20), true);
  assert.equal(inSea(ISLAND + COAST + 1, 20), true);
});

test("home and shops sit off the roadway", () => {
  assert.equal(districtAt(HOME_STUDY.x, HOME_STUDY.z), "w1");
  assert.equal(overlapsStreet(HOME), false);
  assert.equal(overlapsStreet(SHOP_A), false);
  assert.equal(overlapsStreet(SHOP_B), false);
  assert.equal(indoors(HOME_STUDY.x, HOME_STUDY.z), true);
  assert.equal(indoors(BIKE_PARK.x, BIKE_PARK.z), false);
  const out = roomExit(HOME_STUDY.x, HOME_STUDY.z);
  assert.ok(out);
  assert.equal(indoors(out.x, out.z), false);
  assert.equal(overlapsStreet({ minX: out.x, maxX: out.x, minZ: out.z, maxZ: out.z }), false);
});

test("invasao ends on the hack with no car", () => {
  const steps = stepKinds("invasao", false);
  assert.equal(steps.at(-1), "hack");
  assert.equal(steps.includes("car"), false);
  assert.equal(endingFor("invasao"), "done");
});

test("a boss invasion ends on the boss with no car", () => {
  const steps = stepKinds("invasao", true);
  assert.deepEqual(steps, ["hack", "boss"]);
  assert.equal(endingFor("invasao"), "done");
});

test("entrega ends on the delivery with no car", () => {
  const steps = stepKinds("entrega", false);
  assert.equal(steps.at(-1), "go");
  assert.equal(steps.includes("car"), false);
});

test("escolta ends on the hack with no car", () => {
  const steps = stepKinds("escolta", false);
  assert.deepEqual(steps, ["escort", "hack"]);
});

test("perseguicao and boss confrontation still end in the car", () => {
  assert.equal(stepKinds("perseguicao", false).at(-1), "car");
  assert.equal(stepKinds("confronto", true).at(-1), "car");
  assert.equal(endingFor("perseguicao"), "car");
  assert.equal(endingFor("confronto"), "car");
});

test("the old foot-chase slot becomes a delivery", () => {
  assert.equal(liveScript(4), "entrega");
  assert.equal(endingFor(liveScript(4)), "done");
  assert.equal(stepKinds(liveScript(4), false).includes("car"), false);
});

test("doors follow the step", () => {
  assert.equal(doorOpen("home", "other"), false);
  assert.equal(doorOpen("shop", "hack"), false);
  assert.equal(doorOpen("home", "none"), true);
  assert.equal(doorOpen("shop", "none"), true);
  assert.equal(doorOpen("target", "other"), false);
  assert.equal(doorOpen("target", "hack"), true);
  assert.equal(doorOpen("street", "none"), false);
  assert.equal(doorOpen("street", "hack"), false);
});

test("a pedestrian hit raises wanted and allies or enemies do not", () => {
  assert.equal(hitWanted("ped", 0) > 0, true);
  assert.equal(hitWanted("ally", 0), 0);
  assert.equal(hitWanted("enemy", 3), 3);
});

test("wanted fades in free movement and holds during the hack", () => {
  assert.equal(decayWanted(WANTED_SECONDS, WANTED_SECONDS, "free", false), 0);
  assert.equal(decayWanted(WANTED_SECONDS, WANTED_SECONDS, "busy", false), WANTED_SECONDS);
  assert.equal(decayWanted(10, 10, "free", true), 10);
});

test("a knockdown clears wanted", () => {
  assert.equal(knockdownWanted(), 0);
});

test("the bike stays on the street between missions", () => {
  assert.equal(canMount("street", true), true);
  assert.equal(canMount("indoor", true), false);
  assert.equal(canMount("sea", true), false);
  assert.equal(canMount("mission", true), false);
  assert.equal(canMount("street", false), false);
});

test("chapters wear different shirts", () => {
  assert.notEqual(shirtFor(0), shirtFor(2));
});

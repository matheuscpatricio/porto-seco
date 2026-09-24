import assert from "node:assert/strict";
import test from "node:test";
import {
  BIKE_PARK,
  canMount,
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
  shirtFor,
  stepKinds,
  WANTED_SECONDS,
} from "./rules.ts";

test("two districts keep the same addresses", () => {
  assert.equal(districtAt(20, 20), districtAt(20, 20));
  assert.equal(districtAt(20, 20), "w1");
  assert.notEqual(districtAt(70, 20), districtAt(20, 20));
});

test("the sea knocks you down and the street does not", () => {
  assert.equal(inSea(-1, 10), true);
  assert.equal(inSea(ISLAND + 2, 10), true);
  assert.equal(inSea(20, 8), false);
});

test("home sits in the first district and outside the block footprints", () => {
  assert.equal(districtAt(HOME_STUDY.x, HOME_STUDY.z), "w1");
  assert.equal(HOME.maxX < 14, true);
  assert.equal(indoors(HOME_STUDY.x, HOME_STUDY.z), true);
  assert.equal(indoors(BIKE_PARK.x, BIKE_PARK.z), false);
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

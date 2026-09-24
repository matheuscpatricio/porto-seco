import assert from "node:assert/strict";
import test from "node:test";
import {
  BERTHS,
  BIKE_PARK,
  canMount,
  COAST,
  decayWanted,
  districtAt,
  doorOpen,
  endingFor,
  hitWanted,
  HIDEOUT,
  HOME,
  HOME_STUDY,
  indoors,
  inSea,
  ISLAND,
  knockdownWanted,
  POLICE_RANK,
  policeRank,
  policeRankForMission,
  BUOY,
  CENTRAL,
  JET,
  liveScript,
  onPier,
  overlapsStreet,
  policeAfterHack,
  roomExit,
  separateCircles,
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
  assert.equal(inSea(JET.x, JET.z), false);
  assert.equal(onPier(JET.x, JET.z), true);
  assert.equal(inSea(BUOY.x, BUOY.z), true);
});

test("home and shops sit off the roadway", () => {
  assert.equal(districtAt(HOME_STUDY.x, HOME_STUDY.z), "w1");
  assert.equal(overlapsStreet(HOME), false);
  assert.equal(overlapsStreet(SHOP_A), false);
  assert.equal(overlapsStreet(SHOP_B), false);
  assert.equal(overlapsStreet(CENTRAL), false);
  assert.equal(Math.abs(HIDEOUT.x - 82) < 4 && Math.abs(HIDEOUT.z - 82) < 8, true);
  assert.ok(BERTHS.every((b) => b.z < -COAST));
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
  assert.equal(doorOpen("central", "other"), true);
  assert.equal(doorOpen("central", "none"), true);
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

test("police ranks escalate in health and damage", () => {
  assert.equal(policeRank(1), "guarda");
  assert.equal(policeRank(2), "especial");
  assert.equal(policeRank(3), "federal");
  assert.equal(policeRank(4), "federal");
  assert.ok(POLICE_RANK.guarda.hp < POLICE_RANK.especial.hp);
  assert.ok(POLICE_RANK.especial.hp < POLICE_RANK.federal.hp);
  assert.ok(POLICE_RANK.guarda.damage < POLICE_RANK.especial.damage);
  assert.ok(POLICE_RANK.especial.damage < POLICE_RANK.federal.damage);
  assert.equal(policeRankForMission(0), "guarda");
  assert.equal(policeRankForMission(10), "especial");
  assert.equal(policeRankForMission(24), "federal");
});

test("the bike is ridden on the street", () => {
  assert.equal(canMount("street", true), true);
  assert.equal(canMount("indoor", true), false);
  assert.equal(canMount("sea", true), false);
  assert.equal(canMount("street", false), false);
});

test("every fifth lesson slot is a sea getaway and street jobs call the police", () => {
  assert.equal(liveScript(3), "mar");
  assert.deepEqual(stepKinds("mar", false), ["hack", "jet"]);
  assert.equal(endingFor("mar"), "done");
  assert.equal(policeAfterHack("invasao", false), true);
  assert.equal(policeAfterHack("entrega", false), true);
  assert.equal(policeAfterHack("mar", false), false);
  assert.equal(policeAfterHack("invasao", true), false);
});

test("overlapping vehicles are pushed apart", () => {
  const hit = separateCircles(0, 0, 1, 0, 3);
  assert.ok(hit);
  assert.ok(hit.ax < 0);
  assert.ok(hit.bx > 1);
  assert.equal(separateCircles(0, 0, 5, 0, 3), null);
});

test("chapters wear different shirts", () => {
  assert.notEqual(shirtFor(0), shirtFor(2));
});

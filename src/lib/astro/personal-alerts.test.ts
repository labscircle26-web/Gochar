import assert from "node:assert/strict";
import test from "node:test";
import { crossesAngularBoundary } from "./personal-alerts.ts";

test("personal transit crossing detects Aries wraparound in direct motion", () => {
  assert.equal(crossesAngularBoundary(359.8, 0.2, 0), true);
});

test("personal transit crossing detects sign boundary in retrograde motion", () => {
  assert.equal(crossesAngularBoundary(30.2, 29.8, 30), true);
});

test("personal transit crossing ignores an angle that was not crossed", () => {
  assert.equal(crossesAngularBoundary(29.8, 29.9, 30), false);
  assert.equal(crossesAngularBoundary(10, 10, 10), false);
});

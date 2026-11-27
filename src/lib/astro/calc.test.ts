import assert from "node:assert/strict";
import test from "node:test";
import { computeSky, houseFrom, type PanchangCache } from "./calc.ts";

test("whole-sign houses are always counted from the selected ascendant sign", () => {
  assert.equal(houseFrom(0, 0), 1);
  assert.equal(houseFrom(11, 0), 12);
  assert.equal(houseFrom(0, 11), 2);

  for (let ascendant = 0; ascendant < 12; ascendant += 1) {
    for (let sign = 0; sign < 12; sign += 1) {
      const house = houseFrom(sign, ascendant);
      assert.ok(house >= 1 && house <= 12);
      assert.equal(houseFrom((ascendant + house - 1) % 12, ascendant), house);
    }
  }
});

test("ephemeris speed cache assigns separate slots to Saturn and the lunar nodes", () => {
  const instant = new Date("2026-11-27T08:00:00.000Z");
  const cache: PanchangCache = {
    placeKey: "31.6000|74.8000|Asia/Kolkata|lahiri|true",
    dayKey: "",
    sunrise: null,
    sunset: null,
    tithiIndex: -1,
    tithiEnds: null,
    nakIndex: -1,
    nakEnds: null,
    yogaIndex: -1,
    yogaEnds: null,
    karanaIndex: -1,
    karanaEnds: null,
    speedAt: instant.getTime(),
    speeds: [1, 2, 3, 4, 5, 6, 7, 8, 8],
  };

  const sky = computeSky(instant, 31.6, 74.8, "Asia/Kolkata", "lahiri", "true", cache);
  assert.deepEqual(sky.grahas.map((graha) => graha.speed), [1, 2, 3, 4, 5, 6, 7, 8, 8]);
  const rahu = sky.grahas.find((graha) => graha.id === "rahu");
  const ketu = sky.grahas.find((graha) => graha.id === "ketu");
  assert.ok(rahu && ketu);
  assert.ok(Math.abs(((ketu.lon - rahu.lon + 360) % 360) - 180) < 1e-9);
});

test("speed cache is not reused when the selected date moves backwards", () => {
  const cachedAt = new Date("2026-11-27T08:00:00.000Z");
  const earlier = new Date(cachedAt.getTime() - 2 * 60_000);
  const cache: PanchangCache = {
    placeKey: "31.6000|74.8000|Asia/Kolkata|lahiri|true",
    dayKey: "",
    sunrise: null,
    sunset: null,
    tithiIndex: -1,
    tithiEnds: null,
    nakIndex: -1,
    nakEnds: null,
    yogaIndex: -1,
    yogaEnds: null,
    karanaIndex: -1,
    karanaEnds: null,
    speedAt: cachedAt.getTime(),
    speeds: Array(9).fill(777),
  };

  const sky = computeSky(earlier, 31.6, 74.8, "Asia/Kolkata", "lahiri", "true", cache);
  assert.ok(sky.grahas.every((graha) => graha.speed !== 777));
});

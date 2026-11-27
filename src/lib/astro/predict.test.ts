import assert from "node:assert/strict";
import test from "node:test";
import type { GrahaPosition } from "./calc.ts";
import { predictHouse } from "./predict.ts";

function graha(id: GrahaPosition["id"], lon: number, speed = 0.05): GrahaPosition {
  return { id, lon, lat: 0, speed, retro: speed < 0 };
}

test("tenth house reading uses calculated factors and no invented page", () => {
  const natal = [
    graha("sun", 10),
    graha("moon", 40),
    graha("mars", 70),
    graha("mercury", 15),
    graha("jupiter", 200),
    graha("venus", 25),
    graha("saturn", 280),
    graha("rahu", 120),
    graha("ketu", 300),
  ];
  const reading = predictHouse({
    natal,
    lagnaSign: 0,
    house: 10,
    birth: new Date("1990-01-01T06:30:00Z"),
    moonLon: 40,
    when: new Date("2026-11-09T00:00:00Z"),
    transit: natal.map((item) => ({ ...item, lon: (item.lon + 15) % 360 })),
    sav: 30,
  });
  assert.match(reading.title, /10th House/);
  const titles = reading.sections.map((section) => section.title);
  assert.deepEqual(titles.slice(0, 7), [
    "Overall prediction",
    "Detailed interpretation",
    "Positive indications",
    "Challenges and possible obstacles",
    "Practical life outcomes",
    "Relevant timing and upcoming periods",
    "Final conclusion",
  ]);
  assert.equal(titles.at(-1), "References");
  const visible = reading.sections.map((section) => section.body).join(" ");
  const cited = reading.sections.find((section) => section.title === "References")?.body ?? "";
  assert.match(cited, /Phaladeepika/);
  assert.equal(/page \d+/.test(cited), false);
  assert.equal(/Included because|View rules|judged |Dashamsha 10th lord|sarvashtakavarga score/i.test(visible), false);
  assert.match(visible, /Saturn/);
  assert.match(reading.sections.find((section) => section.title === "Relevant timing and upcoming periods")?.body ?? "", /does not|never guarantees|cannot create/i);
  assert.ok(reading.rules.some((rule) => rule.id === "dasha" && rule.included));
  assert.match(reading.disclaimer, /not a certain prediction/);

  const seventh = predictHouse({ ...readingInput(natal), house: 7, transit: [] });
  assert.equal(seventh.sections.some((section) => section.title === "References"), false);
  assert.match(seventh.sections.map((section) => section.body).join(" "), /not available/);
});

function readingInput(natal: GrahaPosition[]) {
  return {
    natal,
    lagnaSign: 0,
    house: 10,
    birth: new Date("1990-01-01T06:30:00Z"),
    moonLon: 40,
    when: new Date("2026-11-09T00:00:00Z"),
    transit: natal.map((item) => ({ ...item, lon: (item.lon + 15) % 360 })),
    sav: 30,
  };
}

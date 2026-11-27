import assert from "node:assert/strict";
import test from "node:test";
import type { GrahaPosition } from "../calc.ts";
import { dashamshaSign, navamsaSign } from "../calc.ts";
import { SIGN_LORD } from "../constants.ts";
import { careerReading } from "./engine.ts";
import { CAREER_RULES, careerRule, libraMoonHouseRuleId } from "./rules.ts";

function graha(id: GrahaPosition["id"], lon: number): GrahaPosition {
  return { id, lon, lat: 0, speed: 0.2, retro: false };
}

function chart(lagna: number, overrides: Partial<Record<GrahaPosition["id"], number>> = {}): GrahaPosition[] {
  const base: Record<GrahaPosition["id"], number> = {
    sun: 10,
    moon: 40,
    mars: 70,
    mercury: 100,
    jupiter: 130,
    venus: 160,
    saturn: 190,
    rahu: 220,
    ketu: 40,
  };
  return (Object.keys(base) as GrahaPosition["id"][]).map((id) => graha(id, overrides[id] ?? base[id]!));
}

const birth = new Date("1990-06-15T04:30:00Z");
const when = new Date("2026-11-12T00:00:00Z");

test("career rules stay retrievable and citations are not copied pages", () => {
  assert.ok(CAREER_RULES.length > 20);
  assert.equal(careerRule("pd-v-1")?.book, "Phaladeepika");
  assert.equal(careerRule("bs-libra-frame")?.scope, "libra");
  assert.equal(CAREER_RULES.some((rule) => /page \d{2,}/.test(rule.text)), false);
});

test("every lagna gets its own 10th sign and lord", () => {
  for (let lagna = 0; lagna < 12; lagna += 1) {
    const reading = careerReading({ natal: chart(lagna), lagnaSign: lagna, lagnaLon: lagna * 30 + 10, birth, moonLon: 40, when, transit: chart(lagna) });
    const tenth = (lagna + 9) % 12;
    const body = reading.sections[0]?.body ?? "";
    assert.match(body, new RegExp(SIGN_LORD[tenth]! === "moon" ? "Moon" : SIGN_LORD[tenth]![0]!.toUpperCase() + SIGN_LORD[tenth]!.slice(1)));
    assert.equal(reading.sections.some((section) => section.title === "D9 and D10 confirmation"), true);
    if (lagna !== 6) assert.doesNotMatch(body, /Libra rules are used only/);
  }
});

test("each planet in the 10th is named, and Navamsa lord is not called the Dashamsha 10th lord", () => {
  const ids = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"] as const;
  for (const id of ids) {
    const natal = chart(0, { [id]: 275 });
    const reading = careerReading({ natal, lagnaSign: 0, lagnaLon: 12, birth, moonLon: natal.find((item) => item.id === "moon")!.lon, when, transit: natal });
    assert.match(reading.sections.find((section) => section.title === "Planetary combinations and aspects")?.body ?? "", new RegExp(id === "rahu" ? "Rahu" : id === "ketu" ? "Ketu" : id[0]!.toUpperCase() + id.slice(1), "i"));
  }
  const natal = chart(0, { saturn: 275 });
  const reading = careerReading({ natal, lagnaSign: 0, lagnaLon: 12, birth, moonLon: 40, when, transit: natal });
  const d9 = reading.sections.find((section) => section.title === "D9 and D10 confirmation")?.body ?? "";
  assert.match(d9, /Navamsa/);
  assert.match(d9, /Dashamsha/);
  assert.notEqual(SIGN_LORD[navamsaSign(275)], SIGN_LORD[(dashamshaSign(12) + 9) % 12]);
  assert.match(d9, /not renamed as the Navamsa lord/);
});

test("strong and weak lords, aspects, and separate event labels", () => {
  const strong = careerReading({
    natal: chart(0, { saturn: 280, jupiter: 100 }),
    lagnaSign: 0,
    lagnaLon: 5,
    birth,
    moonLon: 40,
    when,
    transit: chart(0),
  });
  const weak = careerReading({
    natal: chart(0, { saturn: 10, mars: 40 }),
    lagnaSign: 0,
    lagnaLon: 5,
    birth,
    moonLon: 40,
    when,
    transit: chart(0, { saturn: 280, jupiter: 100 }),
  });
  assert.match(strong.sections.find((section) => section.title === "Strength of the 10th house and its lord")?.body ?? "", /strong|mixed/);
  assert.match(weak.sections.find((section) => section.title === "Strength of the 10th house and its lord")?.body ?? "", /debilitated|house 6|weak|mixed/);
  const change = strong.sections.find((section) => section.title === "Job-change possibilities")?.body ?? "";
  const promotion = strong.sections.find((section) => section.title === "Promotion and salary-growth potential")?.body ?? "";
  assert.notEqual(change, promotion);
  assert.match(strong.sections.find((section) => section.title === "Current Mahadasha and Antardasha effects")?.body ?? "", /\d{4}-\d{2}-\d{2}/);
});

test("the Libra exalted Moon with Mars is chart-specific", () => {
  const special = careerReading({
    natal: chart(6, { moon: 35, mars: 42 }),
    lagnaSign: 6,
    lagnaLon: 190,
    birth,
    moonLon: 35,
    when,
    transit: chart(6),
  });
  const ordinary = careerReading({
    natal: chart(6, { moon: 95 }),
    lagnaSign: 6,
    lagnaLon: 190,
    birth,
    moonLon: 95,
    when,
    transit: chart(6),
  });
  const specialBody = special.sections.map((section) => section.body).join(" ");
  const ordinaryBody = ordinary.sections.map((section) => section.body).join(" ");
  assert.match(specialBody, /exalted Moon with Mars/);
  assert.match(specialBody, /not every Libra/);
  assert.equal(/exalted Moon with Mars/.test(ordinaryBody), false);
  assert.equal(special.rules.some((rule) => rule.id === "bs-libra-moon-8"), true);
  assert.equal(ordinary.rules.some((rule) => rule.id === "bs-libra-moon-8"), false);
  assert.equal(ordinary.rules.some((rule) => rule.id === "bs-libra-moon-h10"), true);
  assert.match(ordinaryBody, /own house/);
});

test("Libra uses only the Moon house and 10th occupant that the chart actually has", () => {
  for (let house = 1; house <= 12; house += 1) {
    const sign = (6 + house - 1) % 12;
    const reading = careerReading({
      natal: chart(6, { moon: sign * 30 + 5, mars: house === 8 ? 50 : 70 }),
      lagnaSign: 6,
      lagnaLon: 190,
      birth,
      moonLon: sign * 30 + 5,
      when,
      transit: chart(6),
    });
    const id = libraMoonHouseRuleId(house);
    assert.equal(reading.rules.some((rule) => rule.id === id), true);
    for (let other = 1; other <= 12; other += 1) {
      if (other === house) continue;
      assert.equal(reading.rules.some((rule) => rule.id === libraMoonHouseRuleId(other)), false);
    }
  }
  const mercury = careerReading({
    natal: chart(6, { mercury: 100, moon: 200 }),
    lagnaSign: 6,
    lagnaLon: 190,
    birth,
    moonLon: 200,
    when,
    transit: chart(6),
  });
  const mercuryBody = mercury.sections.map((section) => section.body).join(" ");
  assert.equal(mercury.rules.some((rule) => rule.id === "bs-libra-10-mercury"), true);
  assert.match(mercuryBody, /not Bhadrayoga/);
  const aries = careerReading({ natal: chart(0, { mercury: 275 }), lagnaSign: 0, lagnaLon: 12, birth, moonLon: 40, when, transit: chart(0) });
  assert.equal(aries.rules.some((rule) => rule.id.startsWith("bs-libra-")), false);
});

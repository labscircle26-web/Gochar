import assert from "node:assert/strict";
import test from "node:test";
import { developerPasswordMatches, readDeveloperSession, signDeveloperSession } from "./password.server.ts";

test("environment password is checked and a blank password fails", () => {
  process.env.GOCHAR_DEVELOPER_PASSWORD = "correct-horse";
  assert.equal(developerPasswordMatches("correct-horse"), true);
  assert.equal(developerPasswordMatches("wrong-horse"), false);
  assert.equal(developerPasswordMatches(""), false);
  delete process.env.GOCHAR_DEVELOPER_PASSWORD;
});

test("developer session round-trips and rejects tampering", () => {
  const { token } = signDeveloperSession("harmanbirs109@gmail.com", false);
  assert.equal(readDeveloperSession(token)?.email, "harmanbirs109@gmail.com");
  assert.equal(readDeveloperSession(`${token}x`), null);
  assert.equal(readDeveloperSession(""), null);
});

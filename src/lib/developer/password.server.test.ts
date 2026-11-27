import assert from "node:assert/strict";
import test from "node:test";
import { developerPasswordMatches, readDeveloperSession, signDeveloperSession } from "./password.server.ts";

test("developer password requires an explicit environment value", () => {
  delete process.env.GOCHAR_DEVELOPER_PASSWORD;
  assert.equal(developerPasswordMatches("anything"), false);
  process.env.GOCHAR_DEVELOPER_PASSWORD = "correct-horse";
  assert.equal(developerPasswordMatches("correct-horse"), true);
  assert.equal(developerPasswordMatches("wrong-horse"), false);
  assert.equal(developerPasswordMatches(""), false);
  delete process.env.GOCHAR_DEVELOPER_PASSWORD;
});

test("developer session uses a private environment signing key", () => {
  process.env.GOCHAR_DEVELOPER_SESSION_SECRET = "test-session-secret-at-least-32-bytes";
  const { token } = signDeveloperSession("harmanbirs109@gmail.com", false);
  assert.equal(readDeveloperSession(token)?.email, "harmanbirs109@gmail.com");
  assert.equal(readDeveloperSession(`${token}x`), null);
  assert.equal(readDeveloperSession(""), null);
  delete process.env.GOCHAR_DEVELOPER_SESSION_SECRET;
  assert.equal(readDeveloperSession(token), null);
});

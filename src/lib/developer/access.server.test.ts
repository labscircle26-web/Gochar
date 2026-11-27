import assert from "node:assert/strict";
import test from "node:test";
import { developerEmails, isDeveloperEmail } from "./access.server.ts";

test("developer access is disabled until an explicit allowlist is configured", () => {
  delete process.env.GOCHAR_DEVELOPER_EMAILS;
  assert.deepEqual(developerEmails(), []);
  assert.equal(isDeveloperEmail("harmanbirs109@gmail.com"), false);
  assert.equal(isDeveloperEmail("dev@example.com"), false);
  assert.equal(isDeveloperEmail(null), false);
});

test("environment allowlist replaces the fallback", () => {
  process.env.GOCHAR_DEVELOPER_EMAILS = "one@example.com, two@example.com";
  assert.deepEqual(developerEmails(), ["one@example.com", "two@example.com"]);
  assert.equal(isDeveloperEmail("harmanbirs109@gmail.com"), false);
  delete process.env.GOCHAR_DEVELOPER_EMAILS;
});

import test from "node:test";
import assert from "node:assert/strict";
import { nextPracticeStep } from "../src/lib/practice.js";

const session = (patch = {}) => ({
  checklist: [],
  cases: [],
  reports: [],
  ...patch,
});
const record = (status) => ({ status });

test("new exercises start from a requirement, then checklist work leads to case planning", () => {
  assert.equal(nextPracticeStep(session()).target, "requirements");
  const next = nextPracticeStep(session({ checklist: [record("Not run")] }));
  assert.equal(next.target, "cases");
  assert.equal(next.title, "Tekshiruvga aniq qadamlar yozing");
});

test("all-blocked cases lead to resolving the blocker, not executing or reviewing", () => {
  const next = nextPracticeStep(
    session({ cases: [record("Blocked"), record("Blocked")] }),
  );
  assert.equal(next.target, "cases");
  assert.equal(next.title, "To‘siqli testlarni ko‘rib chiqing");
});

test("pending checklist work remains actionable after every test case passes", () => {
  const next = nextPracticeStep(
    session({
      cases: [record("Passed")],
      checklist: [record("Passed"), record("Not run")],
    }),
  );
  assert.equal(next.target, "shop");
  assert.match(next.description, /checklist/);
});

test("a blocked checklist item opens checklist after test cases pass", () => {
  const next = nextPracticeStep(
    session({
      cases: [record("Passed")],
      checklist: [record("Blocked")],
    }),
  );
  assert.equal(next.target, "checklist");
  assert.equal(next.title, "To‘siqli testlarni ko‘rib chiqing");
});

test("unfinished runnable work can be executed while another item is blocked", () => {
  for (const patch of [
    { cases: [record("Not run")], checklist: [record("Blocked")] },
    { cases: [record("Blocked")], checklist: [record("Not run")] },
  ]) {
    assert.equal(nextPracticeStep(session(patch)).target, "shop");
  }
});

test("a failure in either test collection prompts a report when none exists", () => {
  for (const patch of [
    { cases: [record("Failed")] },
    { cases: [record("Passed")], checklist: [record("Failed")] },
  ]) {
    assert.equal(nextPracticeStep(session(patch)).target, "reports");
  }
});

test("review is suggested only after pending and blocked work is resolved", () => {
  for (const patch of [
    { cases: [record("Passed")], checklist: [record("Passed")] },
    { cases: [record("Failed")], reports: [{ title: "Observed failure" }] },
  ]) {
    assert.equal(nextPracticeStep(session(patch)).target, "review");
  }
});

test("guidance never changes test statuses or marks the exercise complete", () => {
  const data = session({
    cases: [record("Passed"), record("Blocked")],
    checklist: [record("Not run")],
  });
  const before = structuredClone(data);
  nextPracticeStep(data);
  assert.deepEqual(data, before);
});

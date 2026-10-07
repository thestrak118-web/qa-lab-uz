import test from "node:test";
import assert from "node:assert/strict";
import { CHECK_DEFINITIONS, runChecks } from "../src/lib/checks.js";
import { createScenario, initialProductState } from "../src/lib/scenario.js";

const fixture = createScenario("automatic-checks", "expert");
const allBugIds = CHECK_DEFINITIONS.map((check) => check.bugId);
const withBugs = (ids) => ({ ...fixture, bugs: ids.map((id) => ({ id })) });

test("fourteen concrete check IDs distinguish independent tests under one requirement", () => {
  assert.equal(CHECK_DEFINITIONS.length, 14);
  assert.equal(new Set(CHECK_DEFINITIONS.map((check) => check.id)).size, 14);
  for (const [index, check] of CHECK_DEFINITIONS.entries()) {
    assert.equal(check.id, `AT-${String(index + 1).padStart(2, "0")}`);
    assert.ok(fixture.requirements.some((r) => r.id === check.requirementId));
    assert.ok(check.title.length > 5 && check.description.length > 20);
  }
  assert.equal(
    CHECK_DEFINITIONS.filter((check) => check.requirementId === "REQ-05")
      .length,
    3,
  );
});

test("clean build passes every executed check", () => {
  const results = runChecks(withBugs([]));
  assert.equal(results.length, 14);
  assert.ok(results.every((result) => result.status === "Passed"));
  for (const result of results) {
    assert.ok(result.expected.length > 10);
    assert.ok(result.actual.length > 10);
  }
});

for (const bugId of allBugIds) {
  test(`${bugId}: real behavior fails only its check and passes after fix`, () => {
    const scenario = withBugs([bugId]);
    const results = runChecks(scenario);
    assert.deepEqual(
      results.filter((r) => r.status === "Failed").map((r) => r.bugId),
      [bugId],
    );
    assert.equal(results.filter((r) => r.status === "Passed").length, 13);
    assert.ok(runChecks(scenario, [bugId]).every((r) => r.status === "Passed"));
  });
}

test("simultaneous defects stay independent, and only selected repairs pass", () => {
  const scenario = withBugs(allBugIds);
  assert.ok(runChecks(scenario).every((result) => result.status === "Failed"));
  assert.ok(
    runChecks(scenario, allBugIds).every(
      (result) => result.status === "Passed",
    ),
  );
  const fixes = ["BUG-03", "BUG-06", "BUG-10"];
  const results = runChecks(scenario, fixes);
  for (const result of results)
    assert.equal(
      result.status,
      fixes.includes(result.bugId) ? "Passed" : "Failed",
    );
});

test("generated exercises across seeds and difficulties yield repeatable diagnostics", () => {
  for (const difficulty of ["beginner", "standard", "expert"])
    for (let i = 0; i < 25; i++) {
      const scenario = createScenario(`diagnostic-${i}`, difficulty);
      const results = runChecks(scenario);
      const active = scenario.bugs.map((bug) => bug.id).sort();
      assert.deepEqual(
        results
          .filter((r) => r.status === "Failed")
          .map((r) => r.bugId)
          .sort(),
        active,
      );
      assert.ok(!results.some((r) => r.status === "Unavailable"));
      assert.deepEqual(results, runChecks(scenario));
      assert.ok(
        runChecks(scenario, active).every((r) => r.status === "Passed"),
      );
    }
});

test("saved nine-product exercises remain fully executable", () => {
  const legacy = {
    ...withBugs(allBugIds),
    products: fixture.products.filter((p) => /^p[1-9]$/.test(p.id)),
  };
  assert.equal(legacy.products.length, 9);
  assert.ok(runChecks(legacy).every((r) => r.status === "Failed"));
  assert.ok(runChecks(legacy, allBugIds).every((r) => r.status === "Passed"));
});

test("equivalent products with different IDs use real fallback fixtures", () => {
  const scenario = withBugs(allBugIds);
  scenario.products = scenario.products.map((product) => ({
    ...product,
    id: `copy-${product.id}`,
  }));
  assert.ok(runChecks(scenario).every((r) => r.status === "Failed"));
  assert.ok(runChecks(scenario, allBugIds).every((r) => r.status === "Passed"));
});

test("missing boundary fixtures are unavailable, never reported as passing", () => {
  const noZeroStock = {
    ...withBugs([]),
    products: fixture.products.filter((p) => p.stock > 0),
  };
  assert.equal(
    runChecks(noZeroStock).find((r) => r.id === "AT-04").status,
    "Unavailable",
  );
  const expensiveOnly = {
    ...withBugs([]),
    products: fixture.products.filter((p) => p.price >= 100000),
  };
  assert.equal(
    runChecks(expensiveOnly).find((r) => r.id === "AT-14").status,
    "Unavailable",
  );
  const empty = { ...withBugs([]), products: [] };
  const results = runChecks(empty);
  assert.equal(
    results.find((r) => r.id === "AT-10").status,
    "Passed",
    "Login has no product prerequisite",
  );
  assert.equal(results.filter((r) => r.status === "Unavailable").length, 13);
  assert.ok(runChecks(null).every((r) => r.status === "Unavailable"));
});

test("checks leave saved products, scenario, fixed IDs and unrelated learner state untouched", () => {
  const scenario = structuredClone(fixture);
  const fixes = [scenario.bugs[0].id];
  const learner = {
    ...initialProductState(),
    cart: [{ productId: "p4", quantity: 2 }],
    coupon: "QA10",
    orders: [{ id: "my-order", status: "new" }],
  };
  const before = JSON.stringify({ scenario, fixes, learner });
  const freeze = (value) => {
    if (value && typeof value === "object") {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
    return value;
  };
  freeze(scenario);
  freeze(fixes);
  freeze(learner);
  const results = runChecks(scenario, fixes);
  assert.ok(!results.some((r) => r.status === "Unavailable"));
  assert.equal(JSON.stringify({ scenario, fixes, learner }), before);
});

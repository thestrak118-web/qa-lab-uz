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

test("checks without their requirement are unavailable in a partial imported exercise", () => {
  const scenario = withBugs(["BUG-01"]);
  scenario.requirements = scenario.requirements.filter(
    (requirement) => requirement.id === "REQ-01",
  );
  const results = runChecks(scenario);
  assert.equal(results.find((check) => check.id === "AT-01").status, "Failed");
  assert.equal(runChecks(scenario, ["BUG-01"])[0].status, "Passed");
  for (const check of results.filter((entry) => entry.id !== "AT-01")) {
    assert.equal(check.status, "Unavailable");
    assert.match(check.actual, /talabi mashqda mavjud emas/);
    assert.ok(check.actual.includes(check.requirementId));
  }
});

test("100 varied catalogs keep all fourteen probes independent under partial repairs", () => {
  const difficulties = ["beginner", "standard", "expert"];
  for (let index = 0; index < 100; index++) {
    const scenario = createScenario(
      `audit-catalog-${index}`,
      difficulties[index % 3],
    );
    // Exercise fallback fixtures, different prices and stock limits, and a
    // different catalog order. Checks must execute behavior, not depend on p1.
    scenario.products = scenario.products.map((product) => ({
      ...product,
      id: `fixture-${index}-${product.id}`,
      price: product.price + (index % 7) * 1000,
      stock: product.stock ? product.stock + (index % 4) : 0,
    }));
    if (index % 2) scenario.products.reverse();
    const fixes = scenario.bugs
      .filter((_, bugIndex) => (bugIndex + index) % 2 === 0)
      .map((bug) => bug.id);
    const expectedFailures = scenario.bugs
      .filter((bug) => !fixes.includes(bug.id))
      .map((bug) => bug.id)
      .sort();
    const results = runChecks(scenario, fixes);
    assert.equal(results.length, 14);
    assert.ok(
      results.every((check) => check.status !== "Unavailable"),
      `seed ${index}`,
    );
    assert.deepEqual(
      results
        .filter((check) => check.status === "Failed")
        .map((check) => check.bugId)
        .sort(),
      expectedFailures,
      `seed ${index}`,
    );
    assert.ok(
      runChecks(
        scenario,
        scenario.bugs.map((bug) => bug.id),
      ).every((check) => check.status === "Passed"),
      `repaired seed ${index}`,
    );
  }
});

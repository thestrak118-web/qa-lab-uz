import test from "node:test";
import assert from "node:assert/strict";
import {
  createAssessment,
  assessmentFingerprint,
} from "../src/lib/assessment.js";
import { CHECK_DEFINITIONS, runChecks } from "../src/lib/checks.js";
import { createScenario, initialProductState } from "../src/lib/scenario.js";

const options = {
  id: "assessment-test",
  createdAt: "2026-10-08T12:00:00.000Z",
};
const fresh = () => ({
  id: "session-test",
  scenario: createScenario("assessment-test", "standard"),
  fixedBugIds: [],
  checklist: [],
  cases: [],
  reports: [],
  assessments: [],
  activities: [],
  notes: "",
  reviewUnlocked: false,
  productState: initialProductState(),
});
const checklistFor = (check, index = 0) => ({
  id: `check-${check.id}-${index}`,
  title: check.title,
  requirementId: check.requirementId,
  checkId: check.id,
  status: check.status,
  priority: "Medium",
});
const reportFor = (check, index = 0) => ({
  id: `report-${check.id}-${index}`,
  title: `${check.title}: kutilgan natija bajarilmadi`,
  requirementId: check.requirementId,
  checkId: check.id,
  status: "Open",
  steps: ["Do‘konni oching.", check.description],
  expected: check.expected,
  actual: check.actual,
  environment: "Chromium · test build 1.0",
  severity: "Medium",
  priority: "High",
  evidence: [],
});
const complete = (session = fresh()) => {
  const checks = runChecks(session.scenario, session.fixedBugIds);
  session.checklist = checks
    .filter((check) => check.status !== "Unavailable")
    .map((check) => checklistFor(check));
  session.reports = checks
    .filter((check) => check.status === "Failed")
    .map((check) => reportFor(check));
  return session;
};
const assess = (session) => createAssessment(session, options);
const dimension = (result, id) =>
  result.dimensions.find((entry) => entry.id === id).score;
const freeze = (value) => {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

test("empty submissions earn zero, including clean builds with no bugs", () => {
  assert.equal(assess(fresh()).score, 0);
  const clean = fresh();
  clean.scenario.bugs = [];
  const result = assess(clean);
  assert.equal(result.score, 0);
  assert.equal(result.summary.totalFindings, 0);
  assert.equal(result.summary.unmarked, 14);
  assert.ok(result.dimensions.every((entry) => entry.score === 0));
});

test("fully correct explicit statuses and complete reports earn100 with auditable dimensions", () => {
  const session = complete();
  const result = assess(session);
  assert.equal(result.score, 100);
  assert.deepEqual(
    result.dimensions.map(({ id, score, max }) => ({ id, score, max })),
    [
      { id: "statuses", score: 60, max: 60 },
      { id: "findings", score: 25, max: 25 },
      { id: "documentation", score: 15, max: 15 },
    ],
  );
  assert.equal(result.summary.correct, 14);
  assert.equal(result.summary.matchedFindings, session.scenario.bugs.length);
  assert.deepEqual(result.missedCheckIds, []);
  assert.equal(result.mode, "first");
  assert.equal(result.build.label, "1.0");
  assert.equal(result.id, options.id);
  assert.equal(result.createdAt, options.createdAt);
  assert.ok(
    result.reports.every((row) =>
      /mazmuni avtomatik tasdiqlanmadi/.test(row.detail),
    ),
    "presence checks must not imply semantic or screenshot verification",
  );
});

test("wrong statuses receive no status credit", () => {
  const session = complete();
  session.reports = [];
  session.checklist = session.checklist.map((item) => ({
    ...item,
    status: item.status === "Passed" ? "Failed" : "Passed",
  }));
  const result = assess(session);
  assert.equal(result.score, 0);
  assert.equal(result.summary.wrong, 14);
  assert.equal(result.summary.correct, 0);
  assert.ok(result.comparisons.every((row) => row.verdict === "wrong"));
});

test("requirement IDs and matching titles cannot infer concrete check targets", () => {
  const session = complete();
  session.reports = [];
  session.checklist = session.checklist.map((item) => ({
    ...item,
    checkId: "",
  }));
  const result = assess(session);
  assert.equal(dimension(result, "statuses"), 0);
  assert.equal(result.summary.unlinkedDocuments, 14);
  assert.ok(result.comparisons.every((row) => row.verdict === "unlinked"));
  session.checklist[0].checkId = CHECK_DEFINITIONS[0].id;
  session.checklist[0].requirementId = "REQ-10";
  assert.equal(
    assess(session).comparisons[0].verdict,
    "unlinked",
    "check and requirement must agree",
  );
});

test("Not run and Blocked remain unmarked rather than false completed tests", () => {
  const session = complete();
  session.checklist[0].status = "Not run";
  session.checklist[1].status = "Blocked";
  const result = assess(session);
  assert.equal(result.summary.correct, 12);
  assert.equal(result.summary.unmarked, 2);
  assert.equal(result.summary.wrong, 0);
  assert.equal(result.comparisons[0].verdict, "unmarked");
  assert.equal(result.comparisons[1].verdict, "unmarked");
});

test("duplicate claims across checklist and cases never inflate score; contradictions lose credit", () => {
  const session = complete();
  const original = session.checklist[0];
  session.cases = Array.from({ length: 20 }, (_, index) => ({
    ...original,
    id: `case-copy-${index}`,
  }));
  assert.equal(assess(session).score, 100);
  session.cases.push({
    ...original,
    id: "case-conflict",
    status: original.status === "Passed" ? "Failed" : "Passed",
  });
  const result = assess(session);
  assert.equal(result.summary.correct, 13);
  assert.equal(result.summary.conflicted, 1);
  assert.equal(result.summary.wrong, 0);
  assert.equal(dimension(result, "statuses"), 55.7);
  session.checklist.reverse();
  session.cases.reverse();
  assert.equal(assess(session).score, result.score);
});

test("example documents are ignored in status, report and documentation points", () => {
  const sampleOnly = complete();
  sampleOnly.checklist.forEach((item) => {
    item.title = `[NAMUNA] ${item.title}`;
  });
  sampleOnly.reports.forEach((item) => {
    item.title = `[Namuna] ${item.title}`;
  });
  const result = assess(sampleOnly);
  assert.equal(result.score, 0);
  assert.ok(result.comparisons.every((row) => row.verdict === "sample"));
  assert.ok(result.reports.every((row) => row.verdict === "sample"));
  const session = complete();
  session.cases.push({
    ...session.checklist[0],
    id: "sample-conflict",
    title: "[namuna] Example",
    status: session.checklist[0].status === "Passed" ? "Failed" : "Passed",
  });
  session.reports.push({
    ...sampleOnly.reports[0],
    id: "sample-report",
    steps: "",
    expected: "",
    actual: "",
  });
  assert.equal(assess(session).score, 100);
});

test("report linkage requires an exact concrete target and matching requirement", () => {
  const session = fresh();
  const failing = runChecks(session.scenario).find(
    (check) => check.status === "Failed",
  );
  const validReport = reportFor(failing);
  session.reports = [{ ...validReport, checkId: "" }];
  assert.equal(assess(session).reports[0].verdict, "unlinked");
  assert.equal(assess(session).summary.matchedFindings, 0);
  session.reports = [
    {
      ...validReport,
      requirementId: failing.requirementId === "REQ-01" ? "REQ-02" : "REQ-01",
    },
  ];
  assert.equal(assess(session).reports[0].verdict, "unlinked");
  session.reports = [validReport];
  assert.equal(assess(session).reports[0].verdict, "matched");
  assert.equal(assess(session).summary.matchedFindings, 1);
});

test("missing report content never counts as a confirmed complete report", () => {
  const session = fresh();
  const failing = runChecks(session.scenario).find(
    (check) => check.status === "Failed",
  );
  for (const field of ["title", "steps", "expected", "actual", "environment"]) {
    session.reports = [
      {
        ...reportFor(failing),
        [field]: field === "steps" ? ["  ", ""] : "   ",
      },
    ];
    const result = assess(session);
    assert.equal(result.reports[0].verdict, "incomplete", field);
    assert.equal(result.reports[0].missing.length, 1, field);
    assert.equal(result.summary.matchedFindings, 0, field);
    assert.ok(result.missedCheckIds.includes(failing.id));
    assert.ok(dimension(result, "documentation") < 15);
  }
});

test("a complete report on a passing criterion is not a matched finding and lowers precision", () => {
  const session = complete();
  const passing = runChecks(session.scenario).find(
    (check) => check.status === "Passed",
  );
  session.reports.push(reportFor(passing));
  const result = assess(session);
  assert.equal(result.reports.at(-1).verdict, "not-failing");
  assert.equal(result.summary.matchedFindings, session.scenario.bugs.length);
  assert.ok(dimension(result, "findings") < 25);
  assert.equal(
    dimension(result, "documentation"),
    15,
    "text presence is separate from behavioral evidence",
  );
});

test("closed reports do not assert active defects; fixed build can be correctly retested", () => {
  const session = complete();
  const closedId = session.reports[0].checkId;
  session.reports[0].status = "Closed";
  let result = assess(session);
  assert.equal(result.reports[0].verdict, "closed");
  assert.ok(result.missedCheckIds.includes(closedId));
  assert.ok(result.score < 100);

  session.fixedBugIds = session.scenario.bugs.map((bug) => bug.id);
  session.reviewUnlocked = true;
  session.reports.forEach((report) => {
    report.status = "Closed";
  });
  session.checklist.forEach((item) => {
    item.status = "Passed";
  });
  result = assess(session);
  assert.equal(result.score, 100);
  assert.equal(result.mode, "practice");
  assert.equal(result.build.label, "1.1");
  assert.equal(result.summary.totalFindings, 0);
  assert.ok(result.checks.every((check) => check.status === "Passed"));
  assert.ok(result.reports.every((report) => report.verdict === "closed"));
  session.reports[0].status = "Reopened";
  assert.equal(assess(session).reports[0].verdict, "not-failing");
});

test("duplicate reports cannot inflate findings or dilute incomplete documentation", () => {
  const session = complete();
  session.reports[0].actual = "";
  const baseline = assess(session);
  const completeReport = session.reports[1];
  session.reports.push(
    ...Array.from({ length: 30 }, (_, index) => ({
      ...completeReport,
      id: `report-copy-${index}`,
    })),
  );
  const result = assess(session);
  assert.equal(
    result.summary.matchedFindings,
    baseline.summary.matchedFindings,
  );
  assert.equal(dimension(result, "findings"), dimension(baseline, "findings"));
  assert.equal(
    dimension(result, "documentation"),
    dimension(baseline, "documentation"),
  );
  assert.equal(result.score, baseline.score);
});

test("unavailable fixtures are omitted from score denominator and cannot become matched findings", () => {
  const session = fresh();
  session.scenario.products = session.scenario.products.filter(
    (product) => product.id === "p1",
  );
  complete(session);
  const unavailable = runChecks(session.scenario).find(
    (check) => check.id === "AT-04",
  );
  assert.equal(unavailable.status, "Unavailable");
  session.cases.push({
    ...checklistFor(unavailable),
    id: "unavailable-case",
    status: "Failed",
  });
  session.reports.push(reportFor(unavailable));
  const result = assess(session);
  const availableCount = result.checks.filter(
    (check) => check.status !== "Unavailable",
  ).length;
  assert.ok(availableCount < 14);
  assert.equal(result.summary.available, availableCount);
  assert.equal(result.summary.correct, availableCount);
  assert.equal(dimension(result, "statuses"), 60);
  assert.equal(result.comparisons.at(-1).verdict, "unavailable");
  assert.equal(result.reports.at(-1).verdict, "unavailable");
  assert.ok(!result.missedCheckIds.includes(unavailable.id));
  assert.equal(result.summary.matchedFindings, result.summary.totalFindings);
});

test("fingerprint changes with document claims, content, scenario behavior and selected fixes", () => {
  const original = complete();
  const fingerprint = assessmentFingerprint(original);
  const changes = [
    (session) => {
      session.checklist[0].status = "Blocked";
    },
    (session) => {
      session.checklist[0].checkId = "";
    },
    (session) => {
      session.checklist[0].title += " — updated";
    },
    (session) => {
      session.reports[0].actual += " Changed observation.";
    },
    (session) => {
      session.reports[0].status = "Closed";
    },
    (session) => {
      session.scenario.products[0].price += 1;
    },
    (session) => {
      session.fixedBugIds.push(session.scenario.bugs[0].id);
    },
    (session) => {
      session.cases.push({ ...session.checklist[0], id: "new-case" });
    },
  ];
  for (const change of changes) {
    const session = structuredClone(original);
    change(session);
    assert.notEqual(assessmentFingerprint(session), fingerprint);
  }
});

test("fingerprint ignores activity, notes, assessment history, shop state and answer visibility", () => {
  const session = complete();
  const fingerprint = assessmentFingerprint(session);
  session.activities.push({ id: "activity", title: "Do‘kon ochildi" });
  session.notes = "Learning notes changed";
  session.assessments.push(assess(session));
  session.productState.cart.push({ productId: "p1", quantity: 2 });
  session.reviewUnlocked = true;
  assert.equal(assessmentFingerprint(session), fingerprint);
  session.fixedBugIds = session.scenario.bugs.map((bug) => bug.id);
  const fixedFingerprint = assessmentFingerprint(session);
  session.fixedBugIds.reverse();
  assert.equal(
    assessmentFingerprint(session),
    fixedFingerprint,
    "set order does not change build identity",
  );
});

test("fingerprint observes attachment identity but does not claim to inspect image content", () => {
  const session = complete();
  session.reports[0].evidence = [
    {
      id: "image1",
      name: "screenshot.png",
      type: "image/png",
      dataUrl: "data:image/png;base64,AAAA",
    },
  ];
  const original = assessmentFingerprint(session);
  session.reports[0].evidence[0].dataUrl = "data:image/png;base64,BBBB";
  assert.equal(assessmentFingerprint(session), original);
  session.reports[0].evidence[0].id = "new-screenshot";
  assert.notEqual(assessmentFingerprint(session), original);
});

test("submission is deterministic with options and never mutates a frozen learner session", () => {
  const session = complete();
  const before = structuredClone(session);
  freeze(session);
  const result = assess(session);
  assert.deepEqual(session, before);
  assert.deepEqual(result, assess(session));
  assert.equal(result.fingerprint, assessmentFingerprint(session));
});

test("assessment snapshots do not change when learner documents or repair lists change", () => {
  const session = complete();
  const result = assess(session);
  const snapshot = structuredClone(result);
  session.checklist[0].title = "Changed after submission";
  session.checklist[0].status = "Blocked";
  session.reports[0].actual = "New evidence";
  session.fixedBugIds.push(session.scenario.bugs[0].id);
  session.scenario.products[0].price += 5000;
  assert.deepEqual(result, snapshot);
  result.build.fixedBugIds.push("BUG-99");
  assert.ok(!session.fixedBugIds.includes("BUG-99"));
});

test("clean build never grants absent-report points for wrong or unmarked work", () => {
  for (const status of ["Failed", "Blocked", "Not run"]) {
    const session = fresh();
    session.fixedBugIds = session.scenario.bugs.map((bug) => bug.id);
    const checks = runChecks(session.scenario, session.fixedBugIds);
    session.checklist = [{ ...checklistFor(checks[0]), status }];
    const result = assess(session);
    assert.equal(result.score, 0, status);
    assert.ok(
      result.dimensions.every((entry) => entry.score === 0),
      status,
    );
  }
});

test("clean-build report exemptions grow only with correctly verified coverage", () => {
  const session = fresh();
  session.fixedBugIds = session.scenario.bugs.map((bug) => bug.id);
  const checks = runChecks(session.scenario, session.fixedBugIds);
  session.checklist = checks.slice(0, 7).map((check) => checklistFor(check));
  const half = assess(session);
  assert.equal(half.score, 50);
  assert.equal(dimension(half, "statuses"), 30);
  assert.equal(dimension(half, "findings"), 12.5);
  assert.equal(dimension(half, "documentation"), 7.5);
  session.cases = [
    { ...session.checklist[0], id: "conflict", status: "Failed" },
  ];
  const conflict = assess(session);
  assert.equal(conflict.summary.correct, 6);
  assert.equal(conflict.summary.conflicted, 1);
  assert.ok(
    conflict.dimensions.every(
      (entry, index) => entry.score < half.dimensions[index].score,
    ),
  );
  session.cases = [];
  session.checklist = checks.map((check) => checklistFor(check));
  assert.equal(assess(session).score, 100);
});

test("unlinked or unavailable claims do not claim clean-build coverage", () => {
  const session = fresh();
  session.fixedBugIds = session.scenario.bugs.map((bug) => bug.id);
  session.scenario.products = session.scenario.products.filter(
    (product) => product.stock > 0,
  );
  const checks = runChecks(session.scenario, session.fixedBugIds);
  session.checklist = [
    {
      ...checklistFor(checks.find((check) => check.id === "AT-04")),
      status: "Passed",
    },
    { ...checklistFor(checks[0]), requirementId: "REQ-10", status: "Passed" },
  ];
  const result = assess(session);
  assert.equal(result.score, 0);
  assert.equal(result.summary.correct, 0);
  assert.equal(result.comparisons[0].verdict, "unavailable");
  assert.equal(result.comparisons[1].verdict, "unlinked");
});

test("untouched legacy environment scaffolds are missing fields, while real environment text counts", () => {
  const session = fresh();
  const failing = runChecks(session.scenario).find(
    (check) => check.status === "Failed",
  );
  for (const environment of [
    "Brauzer: … / OS: … / Ekran o‘lchami: …",
    "  Brauzer: ... / OS: ... / Ekran o'lchami: ...  ",
  ]) {
    session.reports = [{ ...reportFor(failing), environment }];
    const result = assess(session);
    assert.equal(result.reports[0].verdict, "incomplete");
    assert.deepEqual(result.reports[0].missing, ["Muhit"]);
    assert.equal(result.summary.matchedFindings, 0);
    assert.ok(dimension(result, "documentation") < 15);
  }
  session.reports[0].environment =
    "Brauzer: Chromium / OS: Linux / Ekran o‘lchami:390×844";
  assert.equal(assess(session).reports[0].verdict, "matched");
});

test("partial imported requirements do not grade absent scope as tested", () => {
  const session = fresh();
  session.scenario.requirements = session.scenario.requirements.filter(
    (requirement) => requirement.id === "REQ-01",
  );
  complete(session);
  const result = assess(session);
  assert.equal(result.summary.available, 1);
  assert.equal(result.summary.correct, 1);
  assert.equal(
    result.checks.filter((check) => check.status === "Unavailable").length,
    13,
  );
  assert.equal(result.score, 100);
  assert.ok(result.comparisons.every((row) => row.checkId === "AT-01"));
});

test("grading revision invalidates old fingerprints without rewriting saved scores", () => {
  const session = complete();
  const historical = assess(session);
  historical.fingerprint = historical.fingerprint.replace(
    "grade-v2-",
    "grade-v1-",
  );
  session.assessments = [historical];
  const original = structuredClone(historical);
  assert.match(assessmentFingerprint(session), /^grade-v2-[a-f0-9]{8}$/);
  assert.notEqual(assessmentFingerprint(session), historical.fingerprint);
  const freshAttempt = assess(session);
  assert.equal(freshAttempt.version, 1, "snapshot schema stays compatible");
  assert.deepEqual(session.assessments[0], original);
});

test("only the leading sample marker excludes a document from grading", () => {
  const session = complete();
  for (const item of [...session.checklist, ...session.reports])
    item.title = `Tester qaydi: ${item.title} — [Namuna] yorlig‘i tekshirildi`;
  const result = assess(session);
  assert.equal(result.score, 100);
  assert.ok(result.comparisons.every((row) => row.verdict === "correct"));
  assert.ok(result.reports.every((row) => row.verdict === "matched"));
  session.checklist[0].title = `  [NAMUNA] ${session.checklist[0].title}`;
  session.reports[0].title = `  [namuna] ${session.reports[0].title}`;
  const excluded = assess(session);
  assert.equal(excluded.comparisons[0].verdict, "sample");
  assert.equal(excluded.reports[0].verdict, "sample");
  assert.ok(excluded.score < 100);
});

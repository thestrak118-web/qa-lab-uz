import test from "node:test";
import assert from "node:assert/strict";
import {
  createScenario,
  initialProductState,
  changeCart,
  simulateApi,
} from "../src/lib/scenario.js";
import { validateBackup } from "../src/lib/storage.js";
import { runChecks } from "../src/lib/checks.js";
import { createAssessment } from "../src/lib/assessment.js";

const now = "2026-10-08T10:00:00.000Z";
function session(seed = "storage-test", difficulty = "standard") {
  const scenario = createScenario(seed, difficulty);
  return {
    id: `session-${seed}-${difficulty}`,
    seed,
    difficulty,
    name: "Checkout mashqi",
    createdAt: now,
    scenario,
    productState: initialProductState(),
    checklist: [],
    cases: [],
    reports: [],
    activity: [],
    fixedBugIds: [],
    reviewUnlocked: false,
    findingLinks: {},
    notes: "",
    environment: "Chrome · Linux",
  };
}
function backup(s = session()) {
  return { version: 1, activeId: s.id, sessions: [s] };
}
function report() {
  return {
    id: "report-1",
    title: "Savat narxi yangilanmaydi",
    requirementId: "REQ-04",
    module: "Savat",
    environment: "Chrome",
    steps: "1. Savatni oching.\n2. Miqdorni oshiring.",
    expected: "Jami ko‘payadi.",
    actual: "Jami o‘zgarmadi.",
    status: "Open",
    severity: "High",
    priority: "P1",
    createdAt: now,
    updatedAt: now,
    evidence: [
      {
        id: "image-1",
        name: "evidence.png",
        type: "image/png",
        dataUrl: "data:image/png;base64,iVBORw0KGgo=",
      },
    ],
  };
}
function populated() {
  const s = session();
  s.checklist = [
    {
      id: "check-1",
      title: "Savat jamisini tekshirish",
      requirementId: "REQ-04",
      status: "Failed",
      expected: "Miqdorga mos narx",
      actual: "Mos emas",
      priority: "P2",
      updatedAt: now,
    },
  ];
  s.cases = [
    {
      id: "case-1",
      title: "Miqdorni oshirish",
      requirementId: "REQ-04",
      preconditions: "Savatda mahsulot bor",
      data: "quantity = 2",
      steps: ["Savatni oching", "Miqdorni oshiring"],
      expected: "Jami yangilanadi",
      actual: "Yangilandi",
      status: "Passed",
    },
  ];
  s.reports = [report()];
  s.activity = [
    {
      id: "activity-1",
      at: now,
      action: "API GET /cart",
      detail: "200 · 54 ms",
    },
  ];
  s.findingLinks = { [s.scenario.bugs[0].id]: s.reports[0].id };
  s.fixedBugIds = s.scenario.bugs.map((b) => b.id);
  s.reviewUnlocked = true;
  s.productState = changeCart(
    s.scenario,
    s.productState,
    s.fixedBugIds,
    "p1",
    2,
  );
  s.productState = simulateApi(s.scenario, s.productState, s.fixedBugIds, {
    method: "POST",
    path: "/orders",
    body: {
      name: "Aziza Karimova",
      phone: "+998901234567",
      address: "Toshkent, Olmazor 15",
      payment: "cash",
    },
  }).productState;
  s.productState = simulateApi(s.scenario, s.productState, s.fixedBugIds, {
    method: "POST",
    path: `/orders/${s.productState.orders[0].id}/cancel`,
  }).productState;
  s.productState = simulateApi(s.scenario, s.productState, s.fixedBugIds, {
    method: "POST",
    path: "/login",
    body: { email: "qa@lab.uz", password: "Test123!" },
  }).productState;
  s.productState.errors.name = null; // Editing a previously invalid field clears its error.
  return backup(s);
}

function assessedBackup() {
  const input = populated();
  const s = input.sessions[0];
  const checks = runChecks(s.scenario);
  const failed = checks.filter((check) => check.status === "Failed");
  s.checklist[0].checkId = "AT-06";
  s.cases[0].checkId = "AT-01";
  s.reports[0].checkId = failed[0].id;
  s.assessments = [
    {
      id: "assessment-1",
      version: 1,
      createdAt: now,
      fingerprint: "snapshot-fingerprint",
      score: 18,
      mode: "first",
      build: { label: "1.0", fixedBugIds: [] },
      dimensions: [
        {
          id: "statuses",
          label: "Holatlar",
          score: 8.6,
          max: 60,
          detail: "2 ta tekshiruv mos.",
        },
        {
          id: "findings",
          label: "Topilmalar",
          score: 4.2,
          max: 25,
          detail: "1 ta xato qayd qilingan.",
        },
        {
          id: "documentation",
          label: "Report to‘liqligi",
          score: 5,
          max: 15,
          detail: "Maydonlar to‘ldirilgan.",
        },
      ],
      summary: {
        correct: 2,
        wrong: 0,
        unmarked: 12,
        conflicted: 0,
        available: 14,
        totalChecks: 14,
        matchedFindings: 1,
        totalFindings: failed.length,
        unlinkedDocuments: 0,
      },
      checks,
      comparisons: [
        {
          id: "old-checklist",
          kind: "checklist",
          title: "Oldingi checklist",
          checkId: checks[0].id,
          claimedStatus: checks[0].status,
          expectedStatus: checks[0].status,
          verdict: "correct",
          detail: "Holat mos.",
        },
        {
          id: "old-case",
          kind: "cases",
          title: "Oldingi test-case",
          checkId: checks[1].id,
          claimedStatus: checks[1].status,
          expectedStatus: checks[1].status,
          verdict: "correct",
          detail: "Holat mos.",
        },
      ],
      reports: [
        {
          id: "old-report",
          title: "Oldingi report",
          checkId: failed[0].id,
          verdict: "matched",
          missing: [],
          detail: "Xato qayd qilingan.",
        },
      ],
      missedCheckIds: failed.slice(1).map((check) => check.id),
    },
  ];
  return input;
}

test("fresh seeded sessions and populated simulator/UI state round-trip without mutation", () => {
  const sessions = [];
  for (const difficulty of ["beginner", "standard", "expert"])
    for (let i = 0; i < 12; i++)
      sessions.push(session(`seed-${i}`, difficulty));
  const fresh = { version: 1, activeId: sessions[5].id, sessions };
  assert.equal(validateBackup(fresh), fresh);
  const input = JSON.parse(JSON.stringify(populated()));
  const before = structuredClone(input);
  assert.equal(validateBackup(input), input);
  assert.deepEqual(input, before);
  assert.equal(input.sessions[0].productState.orders[0].status, "cancelled");
  assert.equal(input.sessions[0].reports[0].evidence[0].name, "evidence.png");
});

test("legacy nine-product exercises and expanded exercises coexist without rewriting saved work", () => {
  const legacy = populated().sessions[0];
  legacy.id = "legacy-nine-products";
  legacy.scenario.products = legacy.scenario.products.filter(
    (p) => Number(p.id.slice(1)) <= 9,
  );
  for (const p of legacy.scenario.products)
    p.description = `${p.name} — kundalik ish va dam olish uchun puxta ishlangan mahsulot.`;
  const expanded = session("expanded-storage");
  expanded.productState.cart = [{ productId: "p36", quantity: 2 }];
  expanded.productState.selectedProduct = "p36";
  const input = JSON.parse(
    JSON.stringify({
      version: 1,
      activeId: legacy.id,
      sessions: [legacy, expanded],
    }),
  );
  const before = structuredClone(input);
  assert.equal(validateBackup(input), input);
  assert.deepEqual(
    input,
    before,
    "import must not regenerate or replace an old scenario",
  );
  assert.equal(input.sessions[0].scenario.products.length, 9);
  assert.equal(input.sessions[1].scenario.products.length, 39);
  assert.equal(input.sessions[0].reports[0].title, "Savat narxi yangilanmaydi");
  assert.equal(input.sessions[0].productState.orders[0].status, "cancelled");
  assert.deepEqual(input.sessions[1].productState.cart, [
    { productId: "p36", quantity: 2 },
  ]);
});

test("negative tests, stale report links and reasonable optional fields remain importable", () => {
  const b = populated(),
    s = b.sessions[0];
  s.productState.checkout = {
    name: "",
    phone: "123",
    address: "            ",
    payment: "invalid-method",
    card: "",
  };
  s.productState.cart = [{ productId: "p4", quantity: 999 }];
  s.productState.coupon = "INVALID";
  s.findingLinks = { [s.scenario.bugs[0].id]: "deleted-report" };
  delete s.productState.nextOrder;
  delete s.reports[0].evidence;
  delete s.reviewUnlocked;
  delete s.notes;
  delete s.environment;
  delete s.checklist[0].priority;
  assert.equal(validateBackup(b), b);
});

const malformed = [
  [
    "no sessions",
    (b) => {
      b.sessions = [];
    },
  ],
  [
    "unknown active session",
    (b) => {
      b.activeId = "missing";
    },
  ],
  [
    "duplicate session ID",
    (b) => {
      b.sessions.push(structuredClone(b.sessions[0]));
    },
  ],
  [
    "invalid date",
    (b) => {
      b.sessions[0].createdAt = "not-a-date";
    },
  ],
  [
    "unknown difficulty",
    (b) => {
      b.sessions[0].difficulty = "hard";
    },
  ],
  [
    "null scenario",
    (b) => {
      b.sessions[0].scenario = null;
    },
  ],
  [
    "null product",
    (b) => {
      b.sessions[0].scenario.products[0] = null;
    },
  ],
  [
    "duplicate product ID",
    (b) => {
      const s = b.sessions[0].scenario;
      s.products.push(structuredClone(s.products[0]));
    },
  ],
  [
    "negative price",
    (b) => {
      b.sessions[0].scenario.products[0].price = -1;
    },
  ],
  [
    "object product name",
    (b) => {
      b.sessions[0].scenario.products[0].name = {};
    },
  ],
  [
    "unsafe CSS color",
    (b) => {
      b.sessions[0].scenario.products[0].color =
        "url(https://example.invalid/x)";
    },
  ],
  [
    "null requirement",
    (b) => {
      b.sessions[0].scenario.requirements[0] = null;
    },
  ],
  [
    "bad bug steps",
    (b) => {
      b.sessions[0].scenario.bugs[0].steps = [{}];
    },
  ],
  [
    "invalid bug requirement",
    (b) => {
      b.sessions[0].scenario.bugs[0].requirementId = "missing";
    },
  ],
  [
    "inconsistent scenario seed",
    (b) => {
      b.sessions[0].scenario.seed = "different";
    },
  ],
  [
    "invalid variant",
    (b) => {
      b.sessions[0].scenario.variant = 8;
    },
  ],
  [
    "duplicate category",
    (b) => {
      b.sessions[0].scenario.categories.push("Barchasi");
    },
  ],
  [
    "empty product state",
    (b) => {
      b.sessions[0].productState = {};
    },
  ],
  [
    "null product state",
    (b) => {
      b.sessions[0].productState = null;
    },
  ],
  [
    "null login",
    (b) => {
      b.sessions[0].productState.login = null;
    },
  ],
  [
    "object checkout field",
    (b) => {
      b.sessions[0].productState.checkout.name = { bad: true };
    },
  ],
  [
    "invalid view",
    (b) => {
      b.sessions[0].productState.view = "missing";
    },
  ],
  [
    "invalid user",
    (b) => {
      b.sessions[0].productState.user = { name: 42, email: "a@b.c" };
    },
  ],
  [
    "null cart entry",
    (b) => {
      b.sessions[0].productState.cart = [null];
    },
  ],
  [
    "missing cart product",
    (b) => {
      b.sessions[0].productState.cart = [{ productId: "missing", quantity: 1 }];
    },
  ],
  [
    "fractional quantity",
    (b) => {
      b.sessions[0].productState.cart = [{ productId: "p1", quantity: 1.5 }];
    },
  ],
  [
    "duplicate cart product",
    (b) => {
      b.sessions[0].productState.cart = [
        { productId: "p1", quantity: 1 },
        { productId: "p1", quantity: 2 },
      ];
    },
  ],
  [
    "negative next order",
    (b) => {
      b.sessions[0].productState.nextOrder = -1;
    },
  ],
  [
    "object error",
    (b) => {
      b.sessions[0].productState.errors.name = { bad: true };
    },
  ],
  [
    "null order",
    (b) => {
      b.sessions[0].productState.orders = [null];
    },
  ],
  [
    "invalid order status",
    (b) => {
      b.sessions[0].productState.orders[0].status = "done";
    },
  ],
  [
    "null order customer",
    (b) => {
      b.sessions[0].productState.orders[0].customer = null;
    },
  ],
  [
    "null order item",
    (b) => {
      b.sessions[0].productState.orders[0].items = [null];
    },
  ],
  [
    "negative order total",
    (b) => {
      b.sessions[0].productState.orders[0].total = -100;
    },
  ],
  [
    "null checklist",
    (b) => {
      b.sessions[0].checklist = [null];
    },
  ],
  [
    "duplicate document IDs",
    (b) => {
      b.sessions[0].cases[0].id = b.sessions[0].checklist[0].id;
    },
  ],
  [
    "invalid test status",
    (b) => {
      b.sessions[0].cases[0].status = "Open";
    },
  ],
  [
    "invalid report status",
    (b) => {
      b.sessions[0].reports[0].status = "Passed";
    },
  ],
  [
    "object report body",
    (b) => {
      b.sessions[0].reports[0].actual = {};
    },
  ],
  [
    "invalid severity",
    (b) => {
      b.sessions[0].reports[0].severity = "Extreme";
    },
  ],
  [
    "invalid priority",
    (b) => {
      b.sessions[0].reports[0].priority = "P9";
    },
  ],
  [
    "unknown requirement",
    (b) => {
      b.sessions[0].reports[0].requirementId = "REQ-999";
    },
  ],
  [
    "invalid activity date",
    (b) => {
      b.sessions[0].activity[0].at = "tomorrow";
    },
  ],
  [
    "null activity",
    (b) => {
      b.sessions[0].activity = [null];
    },
  ],
  [
    "unknown fixed bug",
    (b) => {
      b.sessions[0].fixedBugIds = ["missing"];
    },
  ],
  [
    "duplicate fixed bug",
    (b) => {
      b.sessions[0].fixedBugIds.push(b.sessions[0].fixedBugIds[0]);
    },
  ],
  [
    "object finding link",
    (b) => {
      b.sessions[0].findingLinks[b.sessions[0].scenario.bugs[0].id] = {};
    },
  ],
  [
    "object notes",
    (b) => {
      b.sessions[0].notes = {};
    },
  ],
  [
    "NaN in optional metadata",
    (b) => {
      b.sessions[0].metadata = NaN;
    },
  ],
  [
    "cyclic data",
    (b) => {
      b.sessions[0].metadata = b;
    },
  ],
  [
    "prototype pollution key",
    (b) => {
      b.sessions[0].metadata = JSON.parse('{"__proto__":{"polluted":true}}');
    },
  ],
];
for (const [name, mutate] of malformed)
  test(`rejects malformed backup: ${name}`, () => {
    const input = populated();
    mutate(input);
    assert.throws(
      () => validateBackup(input),
      /QA Lab zaxira formatiga mos emas/,
    );
  });

test("rejects unsafe, inconsistent or oversized image evidence", () => {
  const changes = [
    (e) => {
      e.dataUrl = "https://example.invalid/evidence.png";
    },
    (e) => {
      e.dataUrl = "javascript:alert(1)";
    },
    (e) => {
      e.dataUrl = "data:image/svg+xml;base64,PHN2Zz4=";
      e.type = "image/svg+xml";
    },
    (e) => {
      e.type = "image/jpeg";
    },
    (e) => {
      e.name = {};
    },
    (e) => {
      e.dataUrl = "data:image/png;base64,@@@@";
    },
    (e) => {
      e.dataUrl = "data:image/png;base64,abc";
    },
    (e) => {
      e.dataUrl = "data:image/png;base64,";
    },
    (e) => {
      e.dataUrl = `data:image/png;base64,${Buffer.alloc(1024 * 1024 + 1).toString("base64")}`;
    },
    (e) => {
      e.size = 999;
    },
  ];
  for (const mutate of changes) {
    const input = populated();
    mutate(input.sessions[0].reports[0].evidence[0]);
    assert.throws(() => validateBackup(input), /zaxira formatiga mos emas/);
  }
  const repeated = populated();
  repeated.sessions[0].reports[0].evidence.push({
    ...repeated.sessions[0].reports[0].evidence[0],
  });
  assert.throws(() => validateBackup(repeated), /zaxira formatiga mos emas/);
  const tooMany = populated();
  tooMany.sessions[0].reports[0].evidence = Array.from(
    { length: 4 },
    (_, i) => ({ ...report().evidence[0], id: `image-${i}` }),
  );
  assert.throws(() => validateBackup(tooMany), /zaxira formatiga mos emas/);
});

test("rejected nested backup does not mutate supplied work", () => {
  const input = populated();
  input.sessions[0].reports[0].evidence[0].type = "image/svg+xml";
  const before = structuredClone(input);
  assert.throws(() => validateBackup(input));
  assert.deepEqual(input, before);
});

test("optional check links accept known targets and leave requirement mismatches for the grader", () => {
  for (const key of ["checklist", "cases", "reports"]) {
    for (const value of ["", "AT-01", "AT-14"]) {
      const input = populated();
      input.sessions[0][key][0].checkId = value;
      assert.equal(validateBackup(input), input);
    }
    for (const value of [
      null,
      1,
      true,
      {},
      "AT-00",
      "AT-15",
      "AT-1",
      "BUG-01",
      "at-01",
    ]) {
      const input = populated();
      input.sessions[0][key][0].checkId = value;
      assert.throws(() => validateBackup(input), /zaxira formatiga mos emas/);
    }
  }
});

test("assessment history round-trips immutable snapshots even after source documents are deleted", () => {
  const input = assessedBackup();
  const s = input.sessions[0];
  const next = structuredClone(s.assessments[0]);
  next.id = "assessment-2";
  next.mode = "practice";
  next.createdAt = "2026-10-08T11:00:00.000Z";
  next.build = {
    label: "1.1",
    fixedBugIds: s.scenario.bugs.map((bug) => bug.id),
  };
  s.assessments.push(next);
  s.checklist = [];
  s.cases = [];
  s.reports = [];
  const before = structuredClone(input);
  const roundTrip = JSON.parse(JSON.stringify(input));
  assert.equal(validateBackup(roundTrip), roundTrip);
  assert.deepEqual(roundTrip, before);
  assert.equal(
    roundTrip.sessions[0].assessments[0].comparisons[0].id,
    "old-checklist",
  );
  assert.equal(
    roundTrip.sessions[0].assessments[0].reports[0].id,
    "old-report",
  );
  const legacy = populated();
  assert.equal(validateBackup(legacy), legacy);
  assert.equal(Object.hasOwn(legacy.sessions[0], "assessments"), false);
  legacy.sessions[0].assessments = [];
  assert.equal(validateBackup(legacy), legacy);
});

test("real grader results round-trip for each difficulty, fixed build and unavailable fixture", () => {
  const sessions = [];
  for (const difficulty of ["beginner", "standard", "expert"]) {
    const s = session(`graded-${difficulty}`, difficulty);
    s.checklist = runChecks(s.scenario).map((result) => ({
      id: `check-${result.id}`,
      title: result.title,
      requirementId: result.requirementId,
      checkId: result.id,
      expected: result.expected,
      actual: result.actual,
      status: result.status,
    }));
    s.assessments = [
      createAssessment(s, { id: "first-attempt", createdAt: now }),
    ];
    s.fixedBugIds = s.scenario.bugs.map((bug) => bug.id);
    s.reviewUnlocked = true;
    s.assessments.push(
      createAssessment(s, {
        id: "fixed-attempt",
        createdAt: "2026-10-08T11:00:00.000Z",
      }),
    );
    sessions.push(s);
  }
  const legacy = session("graded-legacy");
  legacy.scenario.products = legacy.scenario.products.filter(
    (product) => Number(product.id.slice(1)) <= 9,
  );
  legacy.assessments = [
    createAssessment(legacy, { id: "legacy-attempt", createdAt: now }),
  ];
  sessions.push(legacy);
  const incomplete = session("graded-incomplete-fixture");
  incomplete.scenario.products = incomplete.scenario.products.filter(
    (product) => product.id === "p1",
  );
  incomplete.assessments = [
    createAssessment(incomplete, { id: "unavailable-attempt", createdAt: now }),
  ];
  assert.ok(
    incomplete.assessments[0].checks.some(
      (check) => check.status === "Unavailable",
    ),
  );
  sessions.push(incomplete);
  const input = JSON.parse(
    JSON.stringify({ version: 1, activeId: sessions[0].id, sessions }),
  );
  const before = structuredClone(input);
  assert.equal(validateBackup(input), input);
  assert.deepEqual(input, before);
});

test("assessment snapshots retain every supported non-scored and report verdict", () => {
  const input = assessedBackup();
  const a = input.sessions[0].assessments[0];
  a.checks[0].status = "Unavailable";
  a.comparisons = [
    "correct",
    "wrong",
    "unmarked",
    "unlinked",
    "unavailable",
    "sample",
  ].map((verdict, i) => ({
    id: `historical-case-${i}`,
    kind: i % 2 ? "cases" : "checklist",
    title: "Tarixiy tekshiruv",
    checkId: i === 3 ? "" : "AT-01",
    claimedStatus: ["Not run", "Passed", "Failed", "Blocked"][i % 4],
    expectedStatus: i === 3 ? null : "Unavailable",
    verdict,
    detail: "Izoh",
  }));
  a.reports = [
    "matched",
    "incomplete",
    "not-failing",
    "unlinked",
    "closed",
    "sample",
    "unavailable",
  ].map((verdict, i) => ({
    id: `historical-report-${i}`,
    title: "Tarixiy report",
    checkId: i === 3 ? "" : "AT-01",
    verdict,
    missing: i === 1 ? ["Qadamlar", "Haqiqiy natija"] : [],
    detail: "Izoh",
  }));
  assert.equal(validateBackup(input), input);
});

const malformedAssessment = [
  [
    "null history",
    (s) => {
      s.assessments = null;
    },
  ],
  [
    "object history",
    (s) => {
      s.assessments = {};
    },
  ],
  [
    "null attempt",
    (s) => {
      s.assessments = [null];
    },
  ],
  [
    "duplicate attempt IDs",
    (s) => {
      s.assessments.push(structuredClone(s.assessments[0]));
    },
  ],
  [
    "unsupported version",
    (s, a) => {
      a.version = 2;
    },
  ],
  [
    "invalid timestamp",
    (s, a) => {
      a.createdAt = "2026-10-08";
    },
  ],
  [
    "empty fingerprint",
    (s, a) => {
      a.fingerprint = " ";
    },
  ],
  [
    "invalid mode",
    (s, a) => {
      a.mode = "verified";
    },
  ],
  [
    "negative score",
    (s, a) => {
      a.score = -1;
    },
  ],
  [
    "score above maximum",
    (s, a) => {
      a.score = 101;
    },
  ],
  [
    "fractional total",
    (s, a) => {
      a.score = 18.5;
    },
  ],
  [
    "score inconsistent with dimensions",
    (s, a) => {
      a.score = 100;
    },
  ],
  [
    "missing build",
    (s, a) => {
      delete a.build;
    },
  ],
  [
    "invalid build label",
    (s, a) => {
      a.build.label = "2.0";
    },
  ],
  [
    "unknown fixed bug",
    (s, a) => {
      a.build.fixedBugIds = ["BUG-99"];
    },
  ],
  [
    "inactive fixed bug",
    (s, a) => {
      a.build.fixedBugIds = [
        a.checks.find(
          (check) => !s.scenario.bugs.some((bug) => bug.id === check.bugId),
        ).bugId,
      ];
    },
  ],
  [
    "duplicate fixed bug",
    (s, a) => {
      a.build.fixedBugIds = [s.scenario.bugs[0].id, s.scenario.bugs[0].id];
    },
  ],
  [
    "missing dimension",
    (s, a) => {
      a.dimensions.pop();
    },
  ],
  [
    "duplicate dimension",
    (s, a) => {
      a.dimensions[1] = structuredClone(a.dimensions[0]);
    },
  ],
  [
    "unknown dimension",
    (s, a) => {
      a.dimensions[0].id = "arbitrary";
    },
  ],
  [
    "incorrect dimension maximum",
    (s, a) => {
      a.dimensions[0].max = 100;
    },
  ],
  [
    "dimension above maximum",
    (s, a) => {
      a.dimensions[0].score = 61;
    },
  ],
  [
    "excess dimension precision",
    (s, a) => {
      a.dimensions[0].score = 8.61;
    },
  ],
  [
    "object dimension label",
    (s, a) => {
      a.dimensions[0].label = {};
    },
  ],
  [
    "null summary",
    (s, a) => {
      a.summary = null;
    },
  ],
  [
    "missing summary count",
    (s, a) => {
      delete a.summary.unlinkedDocuments;
    },
  ],
  [
    "fractional summary count",
    (s, a) => {
      a.summary.wrong = 0.5;
    },
  ],
  [
    "negative summary count",
    (s, a) => {
      a.summary.correct = -1;
    },
  ],
  [
    "too many matches",
    (s, a) => {
      a.summary.matchedFindings = 15;
    },
  ],
  [
    "wrong check count",
    (s, a) => {
      a.summary.totalChecks = 13;
    },
  ],
  [
    "null check",
    (s, a) => {
      a.checks[0] = null;
    },
  ],
  [
    "missing check",
    (s, a) => {
      a.checks.pop();
    },
  ],
  [
    "duplicate check",
    (s, a) => {
      a.checks[1] = structuredClone(a.checks[0]);
    },
  ],
  [
    "unknown check",
    (s, a) => {
      a.checks[0].id = "AT-99";
    },
  ],
  [
    "unknown check requirement",
    (s, a) => {
      a.checks[0].requirementId = "REQ-99";
    },
  ],
  [
    "mismatched check bug",
    (s, a) => {
      a.checks[0].bugId = "BUG-02";
    },
  ],
  [
    "invalid check status",
    (s, a) => {
      a.checks[0].status = "Not run";
    },
  ],
  [
    "object check result",
    (s, a) => {
      a.checks[0].actual = {};
    },
  ],
  [
    "null comparison",
    (s, a) => {
      a.comparisons[0] = null;
    },
  ],
  [
    "duplicate comparison",
    (s, a) => {
      a.comparisons.push(structuredClone(a.comparisons[0]));
    },
  ],
  [
    "invalid comparison kind",
    (s, a) => {
      a.comparisons[0].kind = "reports";
    },
  ],
  [
    "unknown comparison link",
    (s, a) => {
      a.comparisons[0].checkId = "AT-99";
    },
  ],
  [
    "invalid claimed status",
    (s, a) => {
      a.comparisons[0].claimedStatus = "Open";
    },
  ],
  [
    "invalid expected status",
    (s, a) => {
      a.comparisons[0].expectedStatus = "Blocked";
    },
  ],
  [
    "invalid comparison verdict",
    (s, a) => {
      a.comparisons[0].verdict = "approved";
    },
  ],
  [
    "object comparison title",
    (s, a) => {
      a.comparisons[0].title = {};
    },
  ],
  [
    "null report snapshot",
    (s, a) => {
      a.reports[0] = null;
    },
  ],
  [
    "duplicate report snapshot",
    (s, a) => {
      a.reports.push(structuredClone(a.reports[0]));
    },
  ],
  [
    "cross-kind duplicate snapshot ID",
    (s, a) => {
      a.reports[0].id = a.comparisons[0].id;
    },
  ],
  [
    "invalid report verdict",
    (s, a) => {
      a.reports[0].verdict = "approved";
    },
  ],
  [
    "invalid report link",
    (s, a) => {
      a.reports[0].checkId = {};
    },
  ],
  [
    "invalid missing fields",
    (s, a) => {
      a.reports[0].missing = [null];
    },
  ],
  [
    "duplicate missing fields",
    (s, a) => {
      a.reports[0].missing = ["Qadamlar", "Qadamlar"];
    },
  ],
  [
    "null missed checks",
    (s, a) => {
      a.missedCheckIds = null;
    },
  ],
  [
    "unknown missed check",
    (s, a) => {
      a.missedCheckIds = ["AT-99"];
    },
  ],
  [
    "duplicate missed check",
    (s, a) => {
      a.missedCheckIds = ["AT-01", "AT-01"];
    },
  ],
];
for (const [name, mutate] of malformedAssessment)
  test(`rejects malformed assessment metadata: ${name}`, () => {
    const input = assessedBackup();
    mutate(input.sessions[0], input.sessions[0].assessments[0]);
    const before = structuredClone(input);
    assert.throws(
      () => validateBackup(input),
      /QA Lab zaxira formatiga mos emas/,
    );
    assert.deepEqual(
      input,
      before,
      "rejected history must not alter the backup",
    );
  });

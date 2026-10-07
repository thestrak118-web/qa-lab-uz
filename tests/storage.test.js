import test from "node:test";
import assert from "node:assert/strict";
import {
  createScenario,
  initialProductState,
  changeCart,
  simulateApi,
} from "../src/lib/scenario.js";
import { validateBackup } from "../src/lib/storage.js";

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

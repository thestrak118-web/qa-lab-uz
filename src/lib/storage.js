import { CHECK_DEFINITIONS } from "./checks.js";

const DB = "qa-lab-workspace-v1";
let opening;
function openDB() {
  if (!opening)
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("workspace");
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        db.onclose = () => {
          opening = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        opening = null;
        reject(request.error);
      };
    });
  return opening;
}
export async function loadWorkspace() {
  return (await loadWorkspaceSnapshot()).data;
}
export async function loadWorkspaceSnapshot() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workspace");
    const store = tx.objectStore("workspace");
    const data = store.get("state"),
      revision = store.get("revision");
    tx.oncomplete = () =>
      resolve({ data: data.result || null, revision: revision.result || 0 });
    tx.onerror = (event) =>
      reject(
        tx.error ||
          event.target?.error ||
          new Error("Ma’lumotlarni o‘qib bo‘lmadi"),
      );
    tx.onabort = () => reject(tx.error || new Error("O‘qish bekor bo‘ldi"));
  });
}
export class WorkspaceConflictError extends Error {
  constructor() {
    super(
      "Boshqa oynada yangi o‘zgarishlar saqlangan. Ularning ustiga yozilmadi.",
    );
    this.name = "WorkspaceConflictError";
  }
}
export async function saveWorkspace(state, { expectedRevision } = {}) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workspace", "readwrite");
    const store = tx.objectStore("workspace");
    const request = store.get("revision");
    let nextRevision, conflict;
    request.onsuccess = () => {
      const currentRevision = request.result || 0;
      if (
        expectedRevision !== undefined &&
        expectedRevision !== currentRevision
      ) {
        conflict = new WorkspaceConflictError();
        tx.abort();
        return;
      }
      nextRevision = currentRevision + 1;
      store.put(state, "state");
      store.put(nextRevision, "revision");
    };
    tx.oncomplete = () => resolve(nextRevision);
    tx.onerror = (event) =>
      reject(
        tx.error ||
          event.target?.error ||
          new Error("Ma’lumotlarni saqlab bo‘lmadi"),
      );
    tx.onabort = () =>
      reject(conflict || tx.error || new Error("Saqlash bekor bo‘ldi"));
  });
}
export function downloadFile(name, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function validateBackup(data) {
  const fail = () => {
    throw new Error("Fayl QA Lab zaxira formatiga mos emas.");
  };
  const record = (v) =>
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(v));
  const text = (v) => typeof v === "string";
  const nonempty = (v) => text(v) && v.trim().length > 0;
  const number = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
  const integer = (v) => number(v) && Number.isSafeInteger(v);
  const date = (v) =>
    text(v) &&
    /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v) &&
    Number.isFinite(Date.parse(v));
  const check = (condition) => {
    if (!condition) fail();
  };
  const fields = (item, names) =>
    check(record(item) && names.every((key) => text(item[key])));
  const optional = (item, key, predicate) =>
    check(item[key] === undefined || predicate(item[key]));
  const unique = (items, key = "id") => {
    check(Array.isArray(items));
    const seen = new Set();
    for (const item of items) {
      check(record(item) && nonempty(item[key]) && !seen.has(item[key]));
      seen.add(item[key]);
    }
    return seen;
  };
  const strings = (items) => check(Array.isArray(items) && items.every(text));
  const steps = (value) =>
    text(value) || (Array.isArray(value) && value.every(text));
  const testStatuses = ["Not run", "Passed", "Failed", "Blocked"];
  const reportStatuses = [
    "Open",
    "In progress",
    "Ready for retest",
    "Closed",
    "Reopened",
  ];
  const severities = ["Critical", "High", "Medium", "Low"];
  const difficulties = ["beginner", "standard", "expert"];
  const checkId = (value) =>
    text(value) && /^AT-(?:0[1-9]|1[0-4])$/.test(value);
  const linkId = (value) => value === "" || checkId(value);
  const checkStatuses = ["Passed", "Failed", "Unavailable"];
  const definitions = new Map(CHECK_DEFINITIONS.map((item) => [item.id, item]));
  const dimensionMaximums = { statuses: 60, findings: 25, documentation: 15 };
  const decimalScore = (value, max) =>
    number(value) &&
    value <= max &&
    Math.abs(value * 10 - Math.round(value * 10)) < 1e-8;
  const timestamp = (value) =>
    date(value) && new Date(value).toISOString() === value;

  function assessments(items, scenarioBugIds, scenarioRequirementIds) {
    unique(items);
    for (const attempt of items) {
      fields(attempt, ["createdAt", "fingerprint", "mode"]);
      check(
        attempt.version === 1 &&
          timestamp(attempt.createdAt) &&
          nonempty(attempt.fingerprint) &&
          integer(attempt.score) &&
          attempt.score <= 100 &&
          ["first", "practice"].includes(attempt.mode),
      );
      fields(attempt.build, ["label"]);
      check(["1.0", "1.1"].includes(attempt.build.label));
      strings(attempt.build.fixedBugIds);
      check(
        new Set(attempt.build.fixedBugIds).size ===
          attempt.build.fixedBugIds.length &&
          attempt.build.fixedBugIds.every((id) => scenarioBugIds.has(id)),
      );
      unique(attempt.dimensions);
      check(attempt.dimensions.length === 3);
      for (const dimension of attempt.dimensions) {
        fields(dimension, ["label", "detail"]);
        check(
          Object.hasOwn(dimensionMaximums, dimension.id) &&
            dimension.max === dimensionMaximums[dimension.id] &&
            nonempty(dimension.label) &&
            decimalScore(dimension.score, dimension.max),
        );
      }
      check(
        attempt.score ===
          Math.round(
            attempt.dimensions.reduce((sum, item) => sum + item.score, 0),
          ),
      );
      check(record(attempt.summary));
      for (const field of [
        "correct",
        "wrong",
        "unmarked",
        "conflicted",
        "available",
        "totalChecks",
        "matchedFindings",
        "totalFindings",
        "unlinkedDocuments",
      ])
        check(integer(attempt.summary[field]));
      check(
        attempt.summary.totalChecks === 14 &&
          [
            "correct",
            "wrong",
            "unmarked",
            "conflicted",
            "available",
            "totalFindings",
          ].every((key) => attempt.summary[key] <= 14) &&
          attempt.summary.matchedFindings <= attempt.summary.totalFindings,
      );
      const snapshotCheckIds = unique(attempt.checks);
      check(snapshotCheckIds.size === 14);
      const snapshotBugIds = unique(attempt.checks, "bugId");
      check(snapshotBugIds.size === 14);
      for (const result of attempt.checks) {
        fields(result, [
          "requirementId",
          "title",
          "description",
          "expected",
          "actual",
        ]);
        check(
          checkId(result.id) &&
            result.bugId === `BUG-${result.id.slice(3)}` &&
            definitions.get(result.id)?.requirementId ===
              result.requirementId &&
            (result.status === "Unavailable" ||
              scenarioRequirementIds.has(result.requirementId)) &&
            nonempty(result.title) &&
            checkStatuses.includes(result.status),
        );
      }
      const comparisonIds = unique(attempt.comparisons);
      const resultsById = new Map(
        attempt.checks.map((result) => [result.id, result]),
      );
      for (const comparison of attempt.comparisons) {
        fields(comparison, ["title", "detail"]);
        check(
          ["checklist", "cases"].includes(comparison.kind) &&
            linkId(comparison.checkId) &&
            testStatuses.includes(comparison.claimedStatus) &&
            (comparison.expectedStatus === null ||
              checkStatuses.includes(comparison.expectedStatus)) &&
            [
              "correct",
              "wrong",
              "unmarked",
              "unlinked",
              "unavailable",
              "sample",
            ].includes(comparison.verdict),
        );
        check(
          comparison.expectedStatus ===
            (resultsById.get(comparison.checkId)?.status || null),
        );
        if (["correct", "wrong"].includes(comparison.verdict))
          check(
            ["Passed", "Failed"].includes(comparison.claimedStatus) &&
              ["Passed", "Failed"].includes(comparison.expectedStatus) &&
              (comparison.claimedStatus === comparison.expectedStatus) ===
                (comparison.verdict === "correct"),
          );
        if (comparison.verdict === "unavailable")
          check(comparison.expectedStatus === "Unavailable");
        if (comparison.verdict === "unmarked")
          check(["Not run", "Blocked"].includes(comparison.claimedStatus));
      }
      unique(attempt.reports);
      for (const finding of attempt.reports) {
        fields(finding, ["title", "detail"]);
        check(
          !comparisonIds.has(finding.id) &&
            linkId(finding.checkId) &&
            [
              "matched",
              "incomplete",
              "not-failing",
              "unlinked",
              "closed",
              "sample",
              "unavailable",
            ].includes(finding.verdict),
        );
        strings(finding.missing);
        const status = resultsById.get(finding.checkId)?.status;
        if (finding.verdict === "matched")
          check(status === "Failed" && finding.missing.length === 0);
        if (finding.verdict === "incomplete")
          check(status === "Failed" && finding.missing.length > 0);
        if (finding.verdict === "not-failing") check(status === "Passed");
        if (finding.verdict === "unavailable") check(status === "Unavailable");
        check(
          finding.missing.every(nonempty) &&
            new Set(finding.missing).size === finding.missing.length,
        );
      }
      strings(attempt.missedCheckIds);
      check(
        new Set(attempt.missedCheckIds).size ===
          attempt.missedCheckIds.length &&
          attempt.missedCheckIds.every((id) => snapshotCheckIds.has(id)),
      );
      const available = attempt.checks.filter(
        (result) => result.status !== "Unavailable",
      );
      const failed = available.filter((result) => result.status === "Failed");
      const groups = available.map((result) =>
        attempt.comparisons.filter(
          (row) =>
            row.checkId === result.id &&
            ["correct", "wrong"].includes(row.verdict),
        ),
      );
      const correct = groups.filter(
        (rows) => rows.length && rows.every((row) => row.verdict === "correct"),
      ).length;
      const wrong = groups.filter(
        (rows) => rows.length && rows.every((row) => row.verdict === "wrong"),
      ).length;
      const conflicted = groups.filter(
        (rows) => new Set(rows.map((row) => row.claimedStatus)).size > 1,
      ).length;
      const supported = new Set(
        attempt.reports
          .filter((row) => row.verdict === "matched")
          .map((row) => row.checkId),
      );
      const expectedSummary = {
        correct,
        wrong,
        conflicted,
        unmarked: available.length - correct - wrong - conflicted,
        available: available.length,
        totalChecks: attempt.checks.length,
        matchedFindings: supported.size,
        totalFindings: failed.length,
        unlinkedDocuments: [...attempt.comparisons, ...attempt.reports].filter(
          (row) => row.verdict === "unlinked",
        ).length,
      };
      check(
        Object.entries(expectedSummary).every(
          ([key, value]) => attempt.summary[key] === value,
        ),
      );
      const missed = failed
        .filter((result) => !supported.has(result.id))
        .map((result) => result.id);
      check(
        missed.length === attempt.missedCheckIds.length &&
          missed.every((id) => attempt.missedCheckIds.includes(id)),
      );
    }
  }

  // Validate without changing the supplied backup: a rejected import must not
  // partially repair or replace any of the current user's work.
  const ancestors = new Set();
  function jsonValue(value, depth = 0) {
    check(depth <= 40);
    if (value === null || text(value) || typeof value === "boolean") return;
    if (typeof value === "number") {
      check(Number.isFinite(value));
      return;
    }
    check((record(value) || Array.isArray(value)) && !ancestors.has(value));
    ancestors.add(value);
    for (const key of Object.keys(value)) {
      check(!["__proto__", "prototype", "constructor"].includes(key));
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      check(descriptor && "value" in descriptor);
      jsonValue(descriptor.value, depth + 1);
    }
    ancestors.delete(value);
  }
  jsonValue(data);
  check(
    record(data) &&
      data.version === 1 &&
      Array.isArray(data.sessions) &&
      data.sessions.length > 0,
  );
  const ids = unique(data.sessions);
  check(ids.has(data.activeId));
  for (const s of data.sessions) {
    fields(s, ["seed", "name", "createdAt"]);
    check(
      nonempty(s.name) &&
        date(s.createdAt) &&
        difficulties.includes(s.difficulty),
    );
    const scenario = s.scenario;
    fields(scenario, ["seed", "name", "brand", "today", "difficulty"]);
    check(
      scenario.seed === s.seed &&
        scenario.difficulty === s.difficulty &&
        nonempty(scenario.brand) &&
        date(scenario.today),
    );
    check(
      Number.isInteger(scenario.variant) &&
        scenario.variant >= 0 &&
        scenario.variant <= 2,
    );
    check(number(scenario.deliveryThreshold) && number(scenario.deliveryFee));
    optional(scenario, "availableBugCount", integer);
    strings(scenario.categories);
    check(
      scenario.categories.length > 0 &&
        new Set(scenario.categories).size === scenario.categories.length,
    );
    fields(scenario.testAccount, ["email", "password", "name"]);
    const productIds = unique(scenario.products),
      requirementIds = unique(scenario.requirements),
      bugIds = unique(scenario.bugs);
    check(productIds.size > 0 && requirementIds.size > 0);
    for (const p of scenario.products) {
      fields(p, ["name", "category", "icon", "color", "sku", "description"]);
      check(
        nonempty(p.name) &&
          scenario.categories.includes(p.category) &&
          /^#[\da-f]{6}$/i.test(p.color),
      );
      check(
        number(p.price) &&
          integer(p.stock) &&
          number(p.rating) &&
          p.rating <= 5 &&
          integer(p.reviews),
      );
    }
    for (const r of scenario.requirements)
      fields(r, ["module", "title", "description"]);
    for (const b of scenario.bugs) {
      fields(b, ["module", "title", "requirementId", "expected", "actual"]);
      check(
        requirementIds.has(b.requirementId) &&
          steps(b.steps) &&
          severities.includes(b.severity),
      );
    }

    const state = s.productState;
    fields(state, [
      "view",
      "query",
      "category",
      "sort",
      "couponInput",
      "couponMessage",
      "notice",
    ]);
    check(
      ["catalog", "cart", "checkout", "orders", "account"].includes(state.view),
    );
    check(
      ["popular", "price-asc", "price-desc", "rating"].includes(state.sort) &&
        scenario.categories.includes(state.category),
    );
    check(state.coupon === null || text(state.coupon));
    check(
      state.selectedProduct === null || productIds.has(state.selectedProduct),
    );
    if (state.user !== null) fields(state.user, ["email", "name"]);
    fields(state.login, ["email", "password"]);
    // Invalid string input is part of a valid negative test. Shape validation
    // must not require a valid phone/address or clamp intentionally buggy stock.
    fields(state.checkout, ["name", "phone", "address", "payment", "card"]);
    check(
      record(state.errors) &&
        Object.values(state.errors).every((v) => v === null || text(v)),
    );
    optional(state, "nextOrder", (v) => integer(v) && v >= 1);
    unique(state.cart, "productId");
    for (const line of state.cart)
      check(
        productIds.has(line.productId) &&
          integer(line.quantity) &&
          line.quantity >= 1,
      );
    unique(state.orders);
    for (const order of state.orders) {
      check(
        date(order.date) &&
          ["new", "cancelled"].includes(order.status) &&
          ["cash", "card"].includes(order.payment),
      );
      fields(order.customer, ["name", "phone", "address"]);
      check(
        ["subtotal", "discount", "delivery", "total"].every((key) =>
          number(order[key]),
        ),
      );
      unique(order.items, "productId");
      check(order.items.length > 0);
      for (const item of order.items) {
        fields(item, ["name"]);
        check(
          productIds.has(item.productId) &&
            number(item.price) &&
            integer(item.quantity) &&
            item.quantity >= 1,
        );
      }
    }

    const documentIds = new Set(),
      evidenceIds = new Set();
    for (const key of ["checklist", "cases", "reports"]) {
      unique(s[key]);
      for (const item of s[key]) {
        check(!documentIds.has(item.id));
        documentIds.add(item.id);
        fields(item, ["title", "expected", "actual", "status"]);
        check(nonempty(item.title));
        check(
          (key === "reports" ? reportStatuses : testStatuses).includes(
            item.status,
          ),
        );
        optional(item, "priority", (v) => ["P1", "P2", "P3"].includes(v));
        optional(
          item,
          "requirementId",
          (v) => v === "" || requirementIds.has(v),
        );
        for (const field of ["module", "environment", "preconditions", "data"])
          optional(item, field, text);
        for (const field of ["createdAt", "updatedAt"])
          optional(item, field, date);
        optional(item, "checkId", linkId);
        optional(item, "steps", steps);
        if (key !== "checklist") check(steps(item.steps));
        if (key === "reports") check(severities.includes(item.severity));
        if (item.evidence !== undefined) {
          unique(item.evidence);
          check(item.evidence.length <= 3);
          for (const e of item.evidence) {
            fields(e, ["name", "type", "dataUrl"]);
            check(nonempty(e.name) && !evidenceIds.has(e.id));
            evidenceIds.add(e.id);
            const match = e.dataUrl.match(
              /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/,
            );
            check(match && match[1] === e.type && match[2].length % 4 === 0);
            const bytes =
              (match[2].length / 4) * 3 -
              (match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0);
            check(bytes > 0 && bytes <= 1024 * 1024);
            optional(e, "size", (v) => integer(v) && v === bytes);
          }
        }
      }
    }
    unique(s.activity);
    for (const a of s.activity) {
      fields(a, ["action", "detail"]);
      check(date(a.at));
    }
    strings(s.fixedBugIds);
    check(
      new Set(s.fixedBugIds).size === s.fixedBugIds.length &&
        s.fixedBugIds.every((id) => bugIds.has(id)),
    );
    if (s.assessments !== undefined)
      assessments(s.assessments, bugIds, requirementIds);
    optional(s, "reviewUnlocked", (v) => typeof v === "boolean");
    optional(s, "notes", text);
    optional(s, "environment", text);
    if (s.findingLinks !== undefined) {
      check(record(s.findingLinks));
      // A report can be deleted after linking; stale string IDs are harmless
      // and are retained so an undo can restore the relationship.
      for (const [bugId, reportId] of Object.entries(s.findingLinks))
        check(bugIds.has(bugId) && text(reportId));
    }
  }
  return data;
}

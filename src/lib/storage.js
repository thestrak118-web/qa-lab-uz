const DB = "qa-lab-workspace-v1";
let opening;
function openDB() {
  if (!opening)
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("workspace");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        opening = null;
        reject(request.error);
      };
    });
  return opening;
}
export async function loadWorkspace() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("workspace")
      .objectStore("workspace")
      .get("state");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
export async function saveWorkspace(state) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workspace", "readwrite");
    tx.objectStore("workspace").put(state, "state");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Saqlash bekor bo‘ldi"));
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

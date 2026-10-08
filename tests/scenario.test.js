import test from "node:test";
import assert from "node:assert/strict";
import {
  createScenario,
  initialProductState,
  filterProducts,
  calculateCart,
  changeCart,
  simulateApi,
  TEST_ACCOUNT,
  checkoutErrors,
  validateCoupon,
} from "../src/lib/scenario.js";

const base = createScenario("unit-base", "expert");
const catalog = new Map();
for (let i = 0; i < 100; i++)
  for (const bug of createScenario(`coverage-${i}`, "expert").bugs)
    catalog.set(bug.id, bug);
const clean = { ...base, bugs: [] };
const broken = (id) => ({ ...base, bugs: [catalog.get(id)] });
const stateWith = (productId = "p1", quantity = 1) => ({
  ...initialProductState(base),
  cart: [{ productId, quantity }],
});
const validFields = {
  name: "Aziza Karimova",
  phone: "+998 90 123 45 67",
  address: "Toshkent, Olmazor ko‘chasi 15",
  payment: "cash",
};
const call = (scenario, state, path, body, fixes = []) =>
  simulateApi(scenario, state, fixes, { method: "POST", path, body });

test("seed regenerates an identical scenario, difficulty spreads defects across flows", () => {
  assert.deepEqual(
    createScenario("same", "standard"),
    createScenario("same", "standard"),
  );
  assert.notDeepEqual(createScenario("a"), createScenario("b"));
  for (const [difficulty, count] of [
    ["beginner", 4],
    ["standard", 6],
    ["expert", 8],
  ]) {
    const s = createScenario("difficulty", difficulty);
    assert.equal(s.bugs.length, count);
    assert.equal(new Set(s.bugs.map((b) => b.id)).size, count);
    assert.ok(s.bugs.some((b) => b.module === "Katalog"));
    assert.ok(s.bugs.some((b) => b.module === "Savat"));
    assert.ok(s.bugs.some((b) => b.module === "Kupon"));
    for (const b of s.bugs)
      assert.ok(s.requirements.find((r) => r.id === b.requirementId));
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  }
  assert.equal(catalog.size, 14);
});

test("expanded catalog contains distinct products with useful details and boundary-test stock", () => {
  const s = createScenario("expanded-catalog");
  assert.equal(s.products.length, 39);
  for (const key of ["id", "name", "sku", "description"])
    assert.equal(new Set(s.products.map((p) => p[key])).size, 39, key);
  const photoTypes = new Set([
    "headphones",
    "speaker",
    "mouse",
    "keyboard",
    "bottle",
    "lamp",
    "watch",
    "earbuds",
    "box",
  ]);
  for (const p of s.products) {
    assert.ok(
      photoTypes.has(p.icon),
      `${p.id} must have a local product photo`,
    );
    assert.ok(
      p.description.length > 70 && /\d/.test(p.description),
      `${p.id} has concrete product specifications`,
    );
    assert.ok(s.categories.includes(p.category));
  }
  for (const category of s.categories.filter(
    (category) => category !== "Barchasi",
  ))
    assert.ok(s.products.filter((p) => p.category === category).length >= 6);
  assert.ok(s.products.filter((p) => p.stock === 0).length >= 3);
  assert.ok(s.products.some((p) => p.price < 100000 && p.stock > 0));
  assert.ok(s.products.some((p) => p.price > 300000 && p.stock === 2));
  assert.equal(s.products.find((p) => p.id === "p4").stock, 2);
  assert.equal(s.products.find((p) => p.id === "p8").stock, 0);
});

test("catalog expansion preserves established seed defect selections and layouts", () => {
  const s = createScenario("QA-2026");
  assert.equal(s.brand, "Noma");
  assert.equal(s.variant, 2);
  assert.deepEqual(
    s.bugs.map((b) => b.id),
    ["BUG-12", "BUG-13", "BUG-09", "BUG-01", "BUG-14", "BUG-06"],
  );
  assert.deepEqual(s.products, createScenario("QA-2026").products);
  assert.notDeepEqual(
    s.products.map((p) => p.id),
    createScenario("another-catalog").products.map((p) => p.id),
  );
});

test("new catalog products participate in API search, totals and order snapshots", () => {
  const s = { ...createScenario("expanded-api"), bugs: [] };
  const all = simulateApi(s, initialProductState(), [], { path: "/products" });
  assert.equal(all.body.total, 39);
  const headset = s.products.find((p) => p.id === "p33");
  const result = simulateApi(s, initialProductState(), [], {
    path: `/products?search=${headset.sku}&category=Audio`,
  });
  assert.deepEqual(
    result.body.data.map((p) => p.id),
    [headset.id],
  );
  let state = changeCart(s, initialProductState(), [], "p33", 2);
  state = changeCart(s, state, [], "p36", 1);
  const mug = s.products.find((p) => p.id === "p36");
  const totals = calculateCart(s, state);
  assert.equal(totals.subtotal, headset.price * 2 + mug.price);
  assert.equal(totals.delivery, 0);
  const order = call(s, state, "/orders", validFields);
  assert.equal(order.status, 201);
  assert.deepEqual(
    order.body.order.items.map((p) => p.productId),
    ["p33", "p36"],
  );
  assert.equal(order.body.order.total, totals.total);
  assert.equal(order.productState.cart.length, 0);
});

test("the three added products can be searched, purchased and preserved in order snapshots", () => {
  const s = { ...createScenario("catalog-39-orders"), bugs: [] };
  let state = initialProductState();
  const ids = ["p37", "p38", "p39"];
  for (const id of ids) {
    const product = s.products.find((item) => item.id === id);
    assert.ok(product.stock > 0);
    const result = simulateApi(s, state, [], {
      path: `/products?search=${product.sku.toLowerCase()}&category=${encodeURIComponent(product.category)}`,
    });
    assert.equal(result.status, 200);
    assert.deepEqual(
      result.body.data.map((item) => item.id),
      [id],
    );
    state = changeCart(s, state, [], id, 1);
  }
  assert.equal(state.cart.length, 3);
  const expectedSubtotal = ids.reduce(
    (sum, id) => sum + s.products.find((product) => product.id === id).price,
    0,
  );
  assert.equal(calculateCart(s, state).total, expectedSubtotal);
  const response = call(s, state, "/orders", validFields);
  assert.equal(response.status, 201);
  assert.deepEqual(
    response.body.order.items.map((item) => item.productId),
    ids,
  );
  assert.equal(response.body.order.total, expectedSubtotal);
  assert.equal(response.productState.cart.length, 0);
});

test("catalog query is case insensitive and intersects category, sorting; regressions can be fixed", () => {
  const query = { ...initialProductState(), query: "AIR" };
  assert.equal(filterProducts(clean, query).length, 2);
  assert.equal(filterProducts(broken("BUG-01"), query).length, 0);
  assert.equal(filterProducts(broken("BUG-01"), query, ["BUG-01"]).length, 2);
  const category = { ...initialProductState(), category: "Audio" };
  assert.ok(
    filterProducts(clean, category).every((p) => p.category === "Audio"),
  );
  assert.ok(
    filterProducts(broken("BUG-02"), category).some(
      (p) => p.category !== "Audio",
    ),
  );
  assert.ok(
    filterProducts(broken("BUG-02"), category, ["BUG-02"]).every(
      (p) => p.category === "Audio",
    ),
  );
  const sort = { ...initialProductState(), sort: "price-asc" };
  const results = filterProducts(clean, sort);
  assert.ok(results.every((p, i) => !i || results[i - 1].price <= p.price));
  const wrong = filterProducts(broken("BUG-03"), sort);
  assert.ok(wrong[0].price > wrong.at(-1).price);
  assert.deepEqual(filterProducts(broken("BUG-03"), sort, ["BUG-03"]), results);
  const api = simulateApi(clean, initialProductState(), [], {
    path: "/api/products?search=AIR&category=Audio&sort=price-asc",
  });
  assert.equal(api.status, 200);
  assert.equal(api.body.total, 2);
});

test("stock-zero product and quantities beyond stock are rejected unless relevant defect is active", () => {
  const state = initialProductState();
  assert.equal(changeCart(clean, state, [], "p8", 1).cart.length, 0);
  assert.equal(changeCart(broken("BUG-04"), state, [], "p8", 1).cart.length, 1);
  assert.equal(
    changeCart(broken("BUG-04"), state, ["BUG-04"], "p8", 1).cart.length,
    0,
  );
  assert.equal(changeCart(clean, state, [], "p4", 3).cart.length, 0);
  assert.equal(
    changeCart(broken("BUG-05"), state, [], "p4", 3).cart[0].quantity,
    3,
  );
  assert.equal(
    changeCart(broken("BUG-05"), state, ["BUG-05"], "p4", 3).cart.length,
    0,
  );
  assert.equal(changeCart(clean, stateWith("p4"), [], "p4", 0).cart.length, 0);
  assert.equal(changeCart(clean, state, [], "p4", -1).cart.length, 0);
  assert.equal(changeCart(clean, state, [], "p4", 1.5).cart.length, 0);
});

test("cart totals respect quantity and delivery threshold; fixed defect restores both", () => {
  const state = stateWith("p1", 2);
  const price = clean.products.find((p) => p.id === "p1").price;
  assert.equal(calculateCart(clean, state).subtotal, price * 2);
  assert.equal(calculateCart(broken("BUG-06"), state).subtotal, price);
  assert.equal(
    calculateCart(broken("BUG-06"), state, ["BUG-06"]).subtotal,
    price * 2,
  );
  assert.equal(calculateCart(clean, stateWith("p4")).delivery, 0);
  assert.equal(
    calculateCart(broken("BUG-09"), stateWith("p4")).delivery,
    20000,
  );
  assert.equal(
    calculateCart(broken("BUG-09"), stateWith("p4"), ["BUG-09"]).delivery,
    0,
  );
  assert.equal(calculateCart(clean, initialProductState()).delivery, 0);
  assert.equal(calculateCart(clean, stateWith("p3")).delivery, 20000);
});

test("coupon date, case and minimum rules are independent and fixable", () => {
  assert.equal(validateCoupon(clean, [], "OLD20", 200000).valid, false);
  assert.equal(
    validateCoupon(broken("BUG-07"), [], "OLD20", 200000).valid,
    true,
  );
  assert.equal(
    validateCoupon(broken("BUG-07"), ["BUG-07"], "OLD20", 200000).valid,
    false,
  );
  assert.equal(validateCoupon(clean, [], "qa10", 200000).valid, true);
  assert.equal(
    validateCoupon(broken("BUG-08"), [], "qa10", 200000).valid,
    false,
  );
  assert.equal(
    validateCoupon(broken("BUG-08"), ["BUG-08"], "qa10", 200000).valid,
    true,
  );
  assert.equal(validateCoupon(clean, [], "QA10", 99999).valid, false);
  assert.equal(validateCoupon(clean, [], "QA10", 100000).valid, true);
  assert.equal(validateCoupon(broken("BUG-14"), [], "QA10", 79000).valid, true);
  assert.equal(
    validateCoupon(broken("BUG-14"), ["BUG-14"], "QA10", 79000).valid,
    false,
  );
  assert.equal(validateCoupon(clean, [], "INVENTED", 500000).valid, false);
  const state = stateWith("p3", 2);
  const response = call(clean, state, "/coupons/check", { code: "qa10" });
  assert.equal(response.status, 200);
  assert.equal(
    calculateCart(clean, response.productState).discount,
    Math.round(calculateCart(clean, state).subtotal * 0.1),
  );
  const reduced = changeCart(clean, response.productState, [], "p3", 1);
  assert.equal(
    calculateCart(clean, reduced).discount,
    0,
    "changing cart must revalidate a coupon",
  );
});

test("authentication requires exact password, preserves demo account only, and can be retested after fix", () => {
  const state = initialProductState();
  assert.equal(
    call(clean, state, "/login", {
      email: " QA@LAB.UZ ",
      password: TEST_ACCOUNT.password,
    }).status,
    200,
  );
  assert.equal(
    call(clean, state, "/login", {
      email: TEST_ACCOUNT.email,
      password: "wrong",
    }).status,
    401,
  );
  const result = call(broken("BUG-10"), state, "/login", {
    email: TEST_ACCOUNT.email,
    password: "wrong",
  });
  assert.equal(result.status, 200);
  assert.equal(result.productState.user.email, TEST_ACCOUNT.email);
  assert.equal(
    call(
      broken("BUG-10"),
      state,
      "/login",
      { email: TEST_ACCOUNT.email, password: "wrong" },
      ["BUG-10"],
    ).status,
    401,
  );
  assert.equal(
    call(broken("BUG-10"), state, "/login", {
      email: "other@lab.uz",
      password: "wrong",
    }).status,
    401,
  );
});

test("checkout requires valid phone and trimmed address, with separately reproducible defects", () => {
  const state = stateWith();
  assert.deepEqual(checkoutErrors(clean, state, [], validFields), {});
  assert.ok(
    checkoutErrors(clean, state, [], { ...validFields, phone: "123" }).phone,
  );
  assert.ok(
    !checkoutErrors(broken("BUG-11"), state, [], {
      ...validFields,
      phone: "123",
    }).phone,
  );
  assert.ok(
    checkoutErrors(broken("BUG-11"), state, ["BUG-11"], {
      ...validFields,
      phone: "123",
    }).phone,
  );
  assert.ok(
    checkoutErrors(clean, state, [], {
      ...validFields,
      address: "            ",
    }).address,
  );
  assert.ok(
    !checkoutErrors(broken("BUG-12"), state, [], {
      ...validFields,
      address: "            ",
    }).address,
  );
  assert.ok(
    checkoutErrors(broken("BUG-12"), state, ["BUG-12"], {
      ...validFields,
      address: "            ",
    }).address,
  );
  assert.ok(
    checkoutErrors(clean, state, [], {
      ...validFields,
      payment: "card",
      card: "5555555555554444",
    }).card,
  );
  assert.ok(
    !checkoutErrors(clean, state, [], {
      ...validFields,
      payment: "card",
      card: "4242 4242 4242 4242",
    }).card,
  );
  assert.equal(
    call(clean, initialProductState(), "/orders", validFields).status,
    422,
  );
});

test("order creation snapshots totals and clears cart; cancellation preserves history; retest works", () => {
  const response = call(clean, stateWith(), "/orders", validFields);
  assert.equal(response.status, 201);
  assert.equal(response.productState.cart.length, 0);
  assert.equal(response.productState.orders.length, 1);
  assert.equal(response.productState.view, "orders");
  const id = response.body.order.id;
  const cancelled = call(
    clean,
    response.productState,
    `/orders/${id}/cancel`,
    {},
  );
  assert.equal(cancelled.productState.orders[0].status, "cancelled");
  assert.equal(
    cancelled.productState.orders[0].total,
    response.body.order.total,
  );
  assert.equal(
    call(clean, cancelled.productState, `/orders/${id}/cancel`, {}).status,
    409,
  );
  const wrong = call(
    broken("BUG-13"),
    response.productState,
    `/orders/${id}/cancel`,
    {},
  );
  assert.equal(wrong.status, 200);
  assert.equal(wrong.productState.orders[0].status, "new");
  assert.equal(
    call(broken("BUG-13"), wrong.productState, `/orders/${id}/cancel`, {}, [
      "BUG-13",
    ]).productState.orders[0].status,
    "cancelled",
  );
  assert.equal(
    simulateApi(clean, cancelled.productState, [], { path: "/orders" }).body
      .data[0].status,
    "cancelled",
  );
  const second = call(
    clean,
    { ...response.productState, cart: [{ productId: "p1", quantity: 1 }] },
    "/orders",
    validFields,
  );
  assert.notEqual(second.body.order.id, id);
});

test("API errors are explicit, never fetch remote URLs, and support JSON strings", () => {
  assert.equal(
    simulateApi(clean, initialProductState(), [], {
      method: "POST",
      path: "/login",
      body: "oops",
    }).status,
    400,
  );
  assert.equal(
    simulateApi(clean, initialProductState(), [], {
      method: "POST",
      path: "/login",
      body: "[]",
    }).status,
    400,
  );
  assert.equal(
    simulateApi(clean, initialProductState(), [], {
      method: "POST",
      path: "/login",
      body: JSON.stringify({email: TEST_ACCOUNT.email, password: TEST_ACCOUNT.password}),
    }).status,
    200,
  );
  assert.equal(
    simulateApi(clean, initialProductState(), [], { path: "/unknown" }).status,
    404,
  );
  assert.equal(
    simulateApi(clean, initialProductState(), [], {
      path: "http://outside.invalid/products",
    }).status,
    400,
  );
});

test("malformed order fields return 400 without state mutation", () => {
  const state = stateWith();
  const before = JSON.stringify(state);
  for (const key of ["name", "phone", "address", "payment", "card"]) {
    for (const value of [null, 42, {}, [], true]) {
      const response = call(clean, state, "/orders", {
        ...validFields,
        [key]: value,
      });
      assert.equal(response.status, 400);
      assert.equal(response.productState, undefined);
    }
  }
  for (const key of ["unknown", "__proto__", "constructor"]) {
    const body = JSON.parse(JSON.stringify(validFields));
    Object.defineProperty(body, key, { value: "unexpected", enumerable: true });
    assert.equal(call(clean, state, "/orders", body).status, 400);
  }
  assert.equal(JSON.stringify(state), before);
});

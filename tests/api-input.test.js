import test from "node:test";
import assert from "node:assert/strict";
import {
  createScenario,
  initialProductState,
  simulateApi,
} from "../src/lib/scenario.js";

const scenario = createScenario("api-input-audit");
const state = initialProductState(scenario);
const request = (body, path = "/login") =>
  simulateApi(scenario, state, [], { method: "POST", path, body });
test("JSON primitive bodies are rejected without changing the store", () => {
  const before = structuredClone(state);
  for (const body of [
    null,
    false,
    true,
    0,
    123,
    [],
    "null",
    "false",
    "0",
    "[]",
    '"text"',
  ]) {
    const response = request(body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(response.productState, undefined);
  }
  assert.deepEqual(state, before);
});
test("API paths stay local and prefix matching is exact", () => {
  for (const path of [
    "https://outside.invalid/products",
    "//outside.invalid/products",
    "/\\outside.invalid/products",
    "products",
    "",
    null,
    42,
  ])
    assert.equal(
      simulateApi(scenario, state, [], { path }).status,
      400,
      String(path),
    );
  for (const path of ["/products", "/api/products", "/api/products/"])
    assert.equal(simulateApi(scenario, state, [], { path }).status, 200, path);
  for (const path of ["/apiproducts", "/apiary/products", "/api/api/products"])
    assert.equal(simulateApi(scenario, state, [], { path }).status, 404, path);
});
test("login and coupon fields reject arrays, numbers and objects instead of coercing them", () => {
  for (const value of [null, 42, true, {}, ["qa@lab.uz"]]) {
    assert.equal(request({ email: value, password: "Test123!" }).status, 400);
    assert.equal(request({ email: "qa@lab.uz", password: value }).status, 400);
    assert.equal(request({ code: value }, "/coupons/check").status, 400);
  }
  assert.equal(
    request({ email: "qa@lab.uz", password: "Test123!", extra: "x" }).status,
    400,
  );
  assert.equal(
    request({ code: "QA10", extra: "x" }, "/coupons/check").status,
    400,
  );
  const fixed = scenario.bugs.map((b) => b.id);
  assert.equal(
    simulateApi(scenario, state, fixed, {
      method: "POST",
      path: "/login",
      body: { email: "qa@lab.uz", password: "Test123!" },
    }).status,
    200,
  );
  assert.equal(
    simulateApi(scenario, state, fixed, {
      method: "POST",
      path: "/login",
      body: { email: "qa@lab.uz", password: "wrong" },
    }).status,
    401,
  );
});
test("invalid request containers fail cleanly", () => {
  for (const request of [null, false, 42, "/products", []])
    assert.equal(simulateApi(scenario, state, [], request).status, 400);
});

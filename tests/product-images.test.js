import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createScenario } from "../src/lib/scenario.js";
import { PRODUCT_PHOTOS, productPhoto } from "../src/lib/productImages.js";

test("all 39 catalog products have distinct bundled photographs, not duplicate image bytes", () => {
  const products = createScenario("photo-regression").products;
  const paths = new Set();
  const hashes = new Set();
  for (const product of products) {
    const photo = productPhoto(product);
    assert.match(photo.src, /^\/products\/[a-z0-9-]+\.jpg$/);
    assert.ok(
      !paths.has(photo.src),
      `${product.id} reuses another product photograph`,
    );
    paths.add(photo.src);
    const bytes = readFileSync(
      new URL(`../public${photo.src}`, import.meta.url),
    );
    assert.equal(
      bytes.subarray(0, 2).toString("hex"),
      "ffd8",
      `${photo.src} must be a JPEG`,
    );
    const digest = createHash("sha256").update(bytes).digest("hex");
    assert.ok(
      !hashes.has(digest),
      `${product.id} contains a duplicated photograph`,
    );
    hashes.add(digest);
  }
  assert.equal(paths.size, 39);
  assert.equal(hashes.size, 39);
  assert.equal(Object.keys(PRODUCT_PHOTOS).length, 39);
});

test("photos follow product identity across shuffled and historical catalog snapshots", () => {
  const first = createScenario("first-photos");
  const next = createScenario("next-photos");
  const before = JSON.stringify(first);
  for (const product of first.products) {
    assert.deepEqual(
      productPhoto(product),
      productPhoto(next.products.find((p) => p.id === product.id)),
    );
    assert.deepEqual(
      productPhoto(product),
      productPhoto({ id: product.id, icon: product.icon }),
    );
  }
  assert.equal(JSON.stringify(first), before);
});

test("unknown imported product identifiers use a bundled safe fallback", () => {
  assert.equal(
    productPhoto({ id: "legacy-custom", icon: "mouse" }).src,
    "/products/mouse.jpg",
  );
  for (const id of ["__proto__", "constructor", "../outside", undefined]) {
    assert.equal(
      productPhoto({ id, icon: "../outside" }).src,
      "/products/box.jpg",
    );
  }
  assert.equal(productPhoto(null).src, "/products/box.jpg");
});

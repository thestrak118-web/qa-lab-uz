import {
  calculateCart,
  changeCart,
  filterProducts,
  initialProductState,
  simulateApi,
  TEST_ACCOUNT,
} from "./scenario.js";

// Stable targets are shared by the learner's documents and the grader. Titles
// describe actions, without disclosing which defects this exercise contains.
export const CHECK_DEFINITIONS = Object.freeze(
  [
    [
      "REQ-01",
      "Qidiruv: harf registri",
      "Katalogdagi mavjud mahsulot nomidan bir so‘zni kichik va katta harfda qidiring. Ikkala natijada ham shu mahsulot chiqishi kerak; ikkala natijaning bo‘shligi muvaffaqiyat emas.",
    ],
    [
      "REQ-02",
      "Kategoriya filtri",
      "Audio kategoriyasini tanlab, natijalarning barcha sahifalaridagi kategoriyalarini tekshiring.",
    ],
    [
      "REQ-02",
      "Narx bo‘yicha saralash",
      "Barcha mahsulotlarda “Arzon avval”ni tanlab, narxlar ketma-ketligini tekshiring.",
    ],
    [
      "REQ-03",
      "Qoldiq: 0 dona",
      "Omborda 0 dona qolgan mahsulotni savatga qo‘shishga urinib ko‘ring.",
    ],
    [
      "REQ-03",
      "Qoldiq chegarasi",
      "Savatdagi mahsulot miqdorini ombor qoldig‘idan bir donaga oshirib ko‘ring.",
    ],
    [
      "REQ-04",
      "Ikki dona mahsulot jami",
      "Bitta mahsulotdan 2 dona qo‘shib, mahsulotlar jami qiymatini tekshiring.",
    ],
    [
      "REQ-05",
      "OLD20 kuponi",
      "Savatga mahsulot qo‘shib, OLD20 kuponini qo‘llang.",
    ],
    [
      "REQ-05",
      "qa10 kichik harfli kuponi",
      "Kamida 100 000 so‘mlik savatda qa10 kuponini kichik harfda qo‘llang.",
    ],
    [
      "REQ-06",
      "Bepul yetkazish chegarasi",
      "Narxi kamida 300 000 so‘m bo‘lgan bir dona mahsulotning yetkazish haqini tekshiring.",
    ],
    [
      "REQ-07",
      "Noto‘g‘ri parol bilan kirish",
      "qa@lab.uz va Wrong123! paroli bilan kirishga urinib ko‘ring.",
    ],
    [
      "REQ-08",
      "Telefon: 123",
      "Mavjud mahsulot uchun ism va manzilni to‘g‘ri to‘ldirib, telefon maydoniga 123 kiriting.",
    ],
    [
      "REQ-08",
      "Manzil: bo‘sh joylar",
      "Mavjud mahsulot uchun ism va telefonni to‘g‘ri to‘ldirib, manzilga 12 ta bo‘sh joy kiriting.",
    ],
    [
      "REQ-10",
      "Buyurtmani bekor qilish",
      "To‘g‘ri ma’lumotlar bilan yangi buyurtma yaratib, uni bekor qiling va holatini tekshiring.",
    ],
    [
      "REQ-05",
      "QA10 minimal summa",
      "Narxi 100 000 so‘mdan kam bir dona mahsulot uchun QA10 kuponini qo‘llang.",
    ],
  ].map(([requirementId, title, description], index) => {
    const suffix = String(index + 1).padStart(2, "0");
    return Object.freeze({
      id: `AT-${suffix}`,
      requirementId,
      title,
      description,
      bugId: `BUG-${suffix}`,
    });
  }),
);

class MissingFixture extends Error {}
const need = (condition, reason) => {
  if (!condition) throw new MissingFixture(reason);
};
const amount = (value) => `${value} so‘m`;
const positiveStock = (product) =>
  Number.isInteger(product.stock) &&
  product.stock > 0 &&
  Number.isFinite(product.price) &&
  product.price > 0;
const productFor = (scenario, preferredId, predicate, reason) => {
  const products = scenario.products || [];
  const product =
    products.find((p) => p.id === preferredId && predicate(p)) ||
    products.find(predicate);
  need(product, reason);
  return product;
};
const sameIds = (left, right) => {
  const leftIds = left.map((p) => p.id).sort();
  const rightIds = right.map((p) => p.id).sort();
  return JSON.stringify(leftIds) === JSON.stringify(rightIds);
};
const outcome = (passed, expected, actual) => ({
  status: passed ? "Passed" : "Failed",
  expected,
  actual,
});
const post = (scenario, state, fixes, path, body = {}) =>
  simulateApi(scenario, state, fixes, { method: "POST", path, body });
const validFields = () => ({
  name: "Aziza Karimova",
  phone: "+998901234567",
  address: "Toshkent, Olmazor ko‘chasi 15",
  payment: "cash",
  card: "",
});
const withProduct = (scenario, fixes, product, quantity = 1) => {
  const state = changeCart(
    scenario,
    initialProductState(),
    fixes,
    product.id,
    quantity,
  );
  need(
    state.cart.length === 1 && state.cart[0].quantity === quantity,
    "Tekshiruv uchun mahsulotni savatga qo‘shib bo‘lmadi.",
  );
  return state;
};
const stockProduct = (scenario) =>
  productFor(
    scenario,
    "p1",
    positiveStock,
    "Omborda mavjud mahsulot topilmadi.",
  );

const runners = [
  (scenario, fixes) => {
    const product = productFor(
      scenario,
      "p1",
      (p) => /[a-z]/i.test(p.name || ""),
      "Harfli nomga ega mahsulot topilmadi.",
    );
    const query = product.name.match(/[a-z]+/i)[0];
    const expectedProducts = scenario.products.filter((p) =>
      `${p.name} ${p.sku}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    );
    const lower = filterProducts(
      scenario,
      { ...initialProductState(), query: query.toLocaleLowerCase() },
      fixes,
    );
    const upper = filterProducts(
      scenario,
      { ...initialProductState(), query: query.toLocaleUpperCase() },
      fixes,
    );
    return outcome(
      sameIds(lower, expectedProducts) && sameIds(upper, expectedProducts),
      `“${query.toLocaleLowerCase()}” va “${query.toLocaleUpperCase()}”: bir xil ${expectedProducts.length} ta mahsulot.`,
      `Kichik harf: ${lower.length} ta; katta harf: ${upper.length} ta. Mahsulotlar talabga ${sameIds(lower, expectedProducts) && sameIds(upper, expectedProducts) ? "mos" : "mos emas"}.`,
    );
  },
  (scenario, fixes) => {
    const products = scenario.products || [];
    const category = products.some((p) => p.category === "Audio")
      ? "Audio"
      : products[0]?.category;
    need(
      category && products.some((p) => p.category !== category),
      "Filtrni tekshirish uchun kamida ikki kategoriya kerak.",
    );
    const expectedProducts = products.filter((p) => p.category === category);
    const result = filterProducts(
      scenario,
      { ...initialProductState(), category },
      fixes,
    );
    return outcome(
      sameIds(result, expectedProducts),
      `Faqat ${category}: ${expectedProducts.length} ta mahsulot.`,
      `${result.length} ta natija, shundan ${result.filter((p) => p.category !== category).length} tasi boshqa kategoriyadan.`,
    );
  },
  (scenario, fixes) => {
    const products = scenario.products || [];
    need(
      products.every((p) => Number.isFinite(p.price)) &&
        new Set(products.map((p) => p.price)).size > 1,
      "Saralash uchun narxi turlicha kamida ikki mahsulot kerak.",
    );
    const result = filterProducts(
      scenario,
      { ...initialProductState(), sort: "price-asc" },
      fixes,
    );
    const ascending = result.every(
      (p, i) => !i || result[i - 1].price <= p.price,
    );
    return outcome(
      sameIds(result, products) && ascending,
      "Barcha narxlar kichikdan kattaga ketma-ket joylashadi.",
      `Birinchi narx: ${amount(result[0]?.price)}; oxirgi: ${amount(result.at(-1)?.price)}. Ketma-ketlik ${ascending ? "o‘suvchi" : "o‘suvchi emas"}.`,
    );
  },
  (scenario, fixes) => {
    const product = productFor(
      scenario,
      "p8",
      (p) => p.stock === 0,
      "Qoldig‘i 0 bo‘lgan mahsulot topilmadi.",
    );
    const state = changeCart(
      scenario,
      initialProductState(),
      fixes,
      product.id,
      1,
    );
    return outcome(
      state.cart.length === 0 && Boolean(state.notice),
      `${product.name}: savatga qo‘shilmaydi va xabar chiqadi.`,
      `Savat: ${state.cart.length} ta qator. ${state.notice || "Xabar yo‘q."}`,
    );
  },
  (scenario, fixes) => {
    const product = productFor(
      scenario,
      "p4",
      positiveStock,
      "Qoldig‘i musbat mahsulot topilmadi.",
    );
    const state = withProduct(scenario, fixes, product, product.stock);
    const result = changeCart(
      scenario,
      state,
      fixes,
      product.id,
      product.stock + 1,
    );
    const quantity = result.cart.find(
      (line) => line.productId === product.id,
    )?.quantity;
    return outcome(
      quantity === product.stock && Boolean(result.notice),
      `${product.name}: ${product.stock + 1} so‘ralganda miqdor ${product.stock} da qoladi va xabar chiqadi.`,
      `Savatdagi miqdor: ${quantity}. ${result.notice || "Xabar yo‘q."}`,
    );
  },
  (scenario, fixes) => {
    const product = productFor(
      scenario,
      "p1",
      (p) => positiveStock(p) && p.stock >= 2,
      "Qoldig‘i kamida 2 dona mahsulot topilmadi.",
    );
    const state = withProduct(scenario, fixes, product, 2);
    const totals = calculateCart(scenario, state, fixes);
    return outcome(
      totals.subtotal === product.price * 2,
      `${product.name}: ${amount(product.price)} × 2 = ${amount(product.price * 2)}.`,
      `Mahsulotlar jami: ${amount(totals.subtotal)}.`,
    );
  },
  (scenario, fixes) => {
    const state = withProduct(scenario, fixes, stockProduct(scenario));
    const response = post(scenario, state, fixes, "/coupons/check", {
      code: "OLD20",
    });
    const resultState = response.productState || state;
    const totals = calculateCart(scenario, resultState, fixes);
    return outcome(
      response.status === 422 && !resultState.coupon && totals.discount === 0,
      "OLD20 muddati tugagan: rad etiladi, chegirma 0 so‘m.",
      `HTTP ${response.status}; chegirma ${amount(totals.discount)}. ${response.body.error || "Kupon qabul qilindi."}`,
    );
  },
  (scenario, fixes) => {
    const product = productFor(
      scenario,
      "p1",
      (p) => positiveStock(p) && p.price >= 100000,
      "Kamida 100 000 so‘mlik mavjud mahsulot topilmadi.",
    );
    const state = withProduct(scenario, fixes, product);
    const response = post(scenario, state, fixes, "/coupons/check", {
      code: "qa10",
    });
    const totals = calculateCart(
      scenario,
      response.productState || state,
      fixes,
    );
    const discount = Math.round(product.price * 0.1);
    return outcome(
      response.status === 200 &&
        response.body.code === "QA10" &&
        totals.discount === discount,
      `qa10 qabul qilinadi: 10% yoki ${amount(discount)} chegirma.`,
      `HTTP ${response.status}; chegirma ${amount(totals.discount)}. ${response.body.error || "Kupon qabul qilindi."}`,
    );
  },
  (scenario, fixes) => {
    const product = productFor(
      scenario,
      "p4",
      (p) => positiveStock(p) && p.price >= 300000,
      "Narxi kamida 300 000 so‘m bo‘lgan mavjud mahsulot topilmadi.",
    );
    const totals = calculateCart(
      scenario,
      withProduct(scenario, fixes, product),
      fixes,
    );
    return outcome(
      totals.delivery === 0,
      `${amount(product.price)} mahsulotlar jami uchun yetkazish: 0 so‘m.`,
      `Yetkazish: ${amount(totals.delivery)}.`,
    );
  },
  (scenario, fixes) => {
    const state = initialProductState();
    const response = post(scenario, state, fixes, "/login", {
      email: TEST_ACCOUNT.email,
      password: "Wrong123!",
    });
    const user = (response.productState || state).user;
    return outcome(
      response.status === 401 && !user,
      "Noto‘g‘ri parol rad etiladi (HTTP 401); hisobga kirilmaydi.",
      `HTTP ${response.status}; foydalanuvchi ${user ? "hisobga kirdi" : "hisobga kirmadi"}.`,
    );
  },
  (scenario, fixes) => {
    const state = withProduct(scenario, fixes, stockProduct(scenario));
    const response = post(scenario, state, fixes, "/orders", {
      ...validFields(),
      phone: "123",
    });
    const resultState = response.productState || state;
    return outcome(
      response.status === 422 &&
        Boolean(response.body.errors?.phone) &&
        resultState.orders.length === 0,
      "123 telefoni rad etiladi; telefon xatosi chiqadi, buyurtma yaratilmaydi.",
      `HTTP ${response.status}; buyurtmalar: ${resultState.orders.length}. ${response.body.errors?.phone || "Telefon validatsiya xatosi yo‘q."}`,
    );
  },
  (scenario, fixes) => {
    const state = withProduct(scenario, fixes, stockProduct(scenario));
    const response = post(scenario, state, fixes, "/orders", {
      ...validFields(),
      address: " ".repeat(12),
    });
    const resultState = response.productState || state;
    return outcome(
      response.status === 422 &&
        Boolean(response.body.errors?.address) &&
        resultState.orders.length === 0,
      "12 ta bo‘sh joy manzil sifatida rad etiladi; buyurtma yaratilmaydi.",
      `HTTP ${response.status}; buyurtmalar: ${resultState.orders.length}. ${response.body.errors?.address || "Manzil validatsiya xatosi yo‘q."}`,
    );
  },
  (scenario, fixes) => {
    const state = withProduct(scenario, fixes, stockProduct(scenario));
    const created = post(scenario, state, fixes, "/orders", validFields());
    need(
      created.status === 201 && created.body.order && created.productState,
      "Bekor qilishni tekshirish uchun yangi buyurtma yaratib bo‘lmadi.",
    );
    const original = created.body.order;
    const cancelled = post(
      scenario,
      created.productState,
      fixes,
      `/orders/${original.id}/cancel`,
    );
    const resultState = cancelled.productState || created.productState;
    const order = resultState.orders.find((entry) => entry.id === original.id);
    const repeated = post(
      scenario,
      resultState,
      fixes,
      `/orders/${original.id}/cancel`,
    );
    const unchanged =
      order &&
      order.total === original.total &&
      JSON.stringify(order.items) === JSON.stringify(original.items);
    return outcome(
      cancelled.status === 200 &&
        order?.status === "cancelled" &&
        unchanged &&
        repeated.status === 409,
      "Holat “Bekor qilingan”; tarkib va summa saqlanadi; qayta bekor qilish rad etiladi.",
      `Holat: ${order?.status === "cancelled" ? "Bekor qilingan" : order?.status === "new" ? "Yangi" : "topilmadi"}. Qayta bekor qilish: HTTP ${repeated.status}. Tarkib va summa ${unchanged ? "saqlandi" : "o‘zgardi"}.`,
    );
  },
  (scenario, fixes) => {
    const product = productFor(
      scenario,
      "p3",
      (p) => positiveStock(p) && p.price < 100000,
      "100 000 so‘mdan arzon mavjud mahsulot topilmadi.",
    );
    const state = withProduct(scenario, fixes, product);
    const response = post(scenario, state, fixes, "/coupons/check", {
      code: "QA10",
    });
    const resultState = response.productState || state;
    const totals = calculateCart(scenario, resultState, fixes);
    return outcome(
      response.status === 422 && !resultState.coupon && totals.discount === 0,
      `${amount(product.price)} jami 100 000 dan kam: QA10 rad etiladi, chegirma 0 so‘m.`,
      `HTTP ${response.status}; chegirma ${amount(totals.discount)}. ${response.body.error || "Kupon qabul qilindi."}`,
    );
  },
];

/**
 * Execute the actual domain behavior on fresh fixtures. No learner cart, orders,
 * or bug flag lookup is used to manufacture a result. Each runner gets its own
 * scenario copy so a check can never alter the next check or the saved exercise.
 */
export function runChecks(scenario, fixedBugIds = []) {
  return CHECK_DEFINITIONS.map((definition, index) => {
    try {
      need(
        Array.isArray(scenario?.requirements) &&
          scenario.requirements.some(
            (requirement) => requirement.id === definition.requirementId,
          ),
        `Bu mezonning ${definition.requirementId} talabi mashqda mavjud emas.`,
      );
      const result = runners[index](structuredClone(scenario), [
        ...fixedBugIds,
      ]);
      return { ...definition, ...result };
    } catch (error) {
      return {
        ...definition,
        status: "Unavailable",
        expected: definition.description,
        actual:
          error instanceof MissingFixture
            ? error.message
            : "Tekshiruvni bajarib bo‘lmadi. Mashq ma’lumotlarini tekshiring.",
      };
    }
  });
}

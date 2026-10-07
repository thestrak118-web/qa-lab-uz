/** Deterministic, local-only QA practice domain. No request leaves this browser. */
export const TEST_ACCOUNT = {
  email: "qa@lab.uz",
  password: "Test123!",
  name: "Aziza Karimova",
};
export const SIMULATED_DATE = "2026-10-08";
export const money = (value) =>
  `${String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")} so‘m`;

function hash(value) {
  let h = 2166136261;
  for (const c of String(value)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let x = hash(seed);
  return () => {
    x += 0x6d2b79f5;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(items, random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const requirements = [
  {
    id: "REQ-01",
    module: "Katalog",
    title: "Qidiruv katta-kichik harfga bog‘liq emas",
    description:
      "Qidiruv mahsulot nomi va SKU ichidan qidiradi, bosh/oxiridagi bo‘sh joylarni olib tashlaydi. Masalan, katalogdagi “Air” so‘zi va “AIR” bir xil mahsulotlarni qaytaradi. Natija bo‘lmasa, bo‘sh holat ko‘rinadi.",
  },
  {
    id: "REQ-02",
    module: "Katalog",
    title: "Kategoriya va narx saralashi",
    description:
      "Kategoriya tanlansa, faqat shu kategoriyadagi mahsulotlar chiqadi. “Arzon avval” narxni o‘sish tartibida, “Qimmat avval” kamayish tartibida saralaydi. Qidiruv, kategoriya va saralash birgalikda ishlaydi.",
  },
  {
    id: "REQ-03",
    module: "Savat",
    title: "Ombordagi qoldiqni tekshirish",
    description:
      "Qoldig‘i 0 bo‘lgan mahsulot savatga qo‘shilmaydi. Savat miqdori 1 dan ombordagi qoldiqqacha bo‘ladi. Chegaradan oshirilsa, miqdor o‘zgarmaydi va xabar chiqadi. O‘chirish savatdan butun qatorni olib tashlaydi.",
  },
  {
    id: "REQ-04",
    module: "Savat",
    title: "Jami qiymatni hisoblash",
    description:
      "Mahsulotlar jami = har bir mahsulot narxi × miqdori yig‘indisi. Chegirma mahsulotlar jamisidan olinadi. Yakuniy to‘lov = mahsulotlar jami − chegirma + yetkazish. Barcha narxlar so‘mda, butun songa yaxlitlanadi.",
  },
  {
    id: "REQ-05",
    module: "Kupon",
    title: "Kupon shartlari va muddatlari",
    description:
      "Simulyatsiya sanasi doim 2026-10-08. QA10 — 10% chegirma, mahsulotlar jami kamida 100 000 so‘m, amal qilish muddati 2026-12-31. Harf registri ahamiyatsiz: qa10 ham ishlaydi. OLD20 2026-09-30 kuni tugagan va doim rad etiladi. Boshqa kodlar yaroqsiz. Bitta kupon qo‘llanadi; miqdor o‘zgarsa, shart qayta tekshiriladi.",
  },
  {
    id: "REQ-06",
    module: "Buyurtma",
    title: "Yetkazib berish chegarasi",
    description:
      "Chegirmadan OLDINGI mahsulotlar jami 300 000 so‘m yoki ko‘p bo‘lsa, yetkazish bepul. Bundan past summada 20 000 so‘m. Bo‘sh savatga yetkazish haqi hisoblanmaydi.",
  },
  {
    id: "REQ-07",
    module: "Kirish",
    title: "Test hisobiga kirish",
    description:
      "Demo hisob: qa@lab.uz / Test123! Email katta-kichik harfga bog‘liq emas va chetki bo‘sh joylar olib tashlanadi. Parol aynan mos kelishi kerak. Noto‘g‘ri ma’lumotda umumiy xato chiqadi, foydalanuvchi tizimga kirmaydi. Chiqish sessiyani tozalaydi. Mehmon ham buyurtma bera oladi.",
  },
  {
    id: "REQ-08",
    module: "Buyurtma",
    title: "Telefon va manzil validatsiyasi",
    description:
      "Ism kamida 2 ta belgi. Telefon +998 bilan boshlanib, undan keyin aynan 9 ta raqam bo‘lishi kerak; bo‘sh joy, qavs va tire e’tiborga olinmaydi. Manzil chetki bo‘sh joylarsiz kamida 10 ta belgi. Faqat bo‘sh joy manzil hisoblanmaydi. Xato bo‘lsa, buyurtma yaratilmaydi va maydon ostida izoh chiqadi.",
  },
  {
    id: "REQ-09",
    module: "Buyurtma",
    title: "To‘lov va buyurtma yaratish",
    description:
      "“Qabul qilganda” yoki “Demo karta” tanlanadi. Demo karta uchun faqat 4242 4242 4242 4242 raqami qabul qilinadi; haqiqiy karta kiritmang. Bo‘sh savatga buyurtma berilmaydi. Muvaffaqiyatli buyurtma “Buyurtmalar”ga saqlanadi, savat va kupon tozalanadi. Hech qanday haqiqiy to‘lov yoki yuborish sodir bo‘lmaydi.",
  },
  {
    id: "REQ-10",
    module: "Buyurtmalar",
    title: "Buyurtmani bekor qilish",
    description:
      "“Yangi” buyurtma bekor qilinsa, holati darhol “Bekor qilingan”ga o‘zgaradi. U tarixda saqlanadi va qayta bekor qilish tugmasi chiqmaydi. Bekor qilingan buyurtma faol buyurtmalar soniga kirmaydi. Buyurtma tarkibi va summasi o‘zgarmaydi.",
  },
  {
    id: "REQ-11",
    module: "Ilova",
    title: "Mashq davomiyligi",
    description:
      "Sahifa yangilansa joriy mashq, savat, buyurtmalar, checklist va hisobotlar saqlanadi. Yangi mashq boshlash yangi mahsulotlar tartibi, ko‘rinish va nuqsonlar to‘plamini yaratadi; oldingi mashq tarixdan ochiladi.",
  },
];
const bugCatalog = [
  {
    id: "BUG-01",
    module: "Katalog",
    requirementId: "REQ-01",
    title: "Qidiruv harf registriga bog‘liq",
    steps: [
      "Qidiruvga Air yozing.",
      "Natijalarni eslab qoling.",
      "Qidiruvni AIR ga almashtiring.",
    ],
    expected: "Ikkala qidiruvda bir xil mahsulotlar chiqadi.",
    actual: "AIR so‘rovida mavjud mahsulot topilmaydi.",
    severity: "Medium",
  },
  {
    id: "BUG-02",
    module: "Katalog",
    requirementId: "REQ-02",
    title: "Kategoriya filtriga begona mahsulot kiradi",
    steps: [
      "Katalogda Audio kategoriyasini tanlang.",
      "Barcha natijalarning kategoriya belgilarini tekshiring.",
    ],
    expected: "Faqat Audio mahsulotlari ko‘rinadi.",
    actual: "Boshqa kategoriyadan bitta mahsulot ham chiqadi.",
    severity: "Medium",
  },
  {
    id: "BUG-03",
    module: "Katalog",
    requirementId: "REQ-02",
    title: "Arzon avval teskari saralanadi",
    steps: [
      "Kategoriya va qidiruvni tozalang.",
      "Arzon avval saralashini tanlang.",
      "Birinchi va oxirgi narxlarni solishtiring.",
    ],
    expected: "Narxlar o‘sish tartibida.",
    actual: "Narxlar kamayish tartibida.",
    severity: "Medium",
  },
  {
    id: "BUG-04",
    module: "Savat",
    requirementId: "REQ-03",
    title: "Omborda yo‘q mahsulot savatga qo‘shiladi",
    steps: [
      "Katalogdan qoldig‘i 0 bo‘lgan mahsulotni oching.",
      "Savatga qo‘shish tugmasini bosing.",
      "Savat tarkibini tekshiring.",
    ],
    expected: "Mahsulot qo‘shilmaydi, mavjud emas xabari chiqadi.",
    actual: "Mahsulot savatga qo‘shiladi.",
    severity: "High",
  },
  {
    id: "BUG-05",
    module: "Savat",
    requirementId: "REQ-03",
    title: "Savat miqdori ombor qoldig‘idan oshadi",
    steps: [
      "Qoldig‘i 2 bo‘lgan mahsulotni savatga qo‘shing.",
      "Savatda + tugmasini ikki marta bosing.",
    ],
    expected: "Miqdor 2 da qoladi, qoldiq chegarasi ko‘rsatiladi.",
    actual: "Miqdor 3 ga oshadi.",
    severity: "High",
  },
  {
    id: "BUG-06",
    module: "Savat",
    requirementId: "REQ-04",
    title: "Jami hisobida miqdor e’tiborga olinmaydi",
    steps: [
      "Qoldig‘i kamida 2 bo‘lgan mahsulotni savatga qo‘shing.",
      "Miqdorini 2 qiling.",
      "Mahsulotlar jami qiymatini tekshiring.",
    ],
    expected: "Jami narx mahsulot narxining ikki baravariga teng.",
    actual: "Jami narx bir dona mahsulot narxida qoladi.",
    severity: "High",
  },
  {
    id: "BUG-07",
    module: "Kupon",
    requirementId: "REQ-05",
    title: "Muddati tugagan OLD20 kuponi qabul qilinadi",
    steps: [
      "Savatga mahsulot qo‘shing.",
      "OLD20 kuponini kiriting va qo‘llang.",
    ],
    expected: "Muddati tugagan kupon rad etiladi.",
    actual: "20% chegirma qo‘llanadi.",
    severity: "High",
  },
  {
    id: "BUG-08",
    module: "Kupon",
    requirementId: "REQ-05",
    title: "Kichik harfli qa10 rad etiladi",
    steps: [
      "Savatga kamida 100 000 so‘mlik mahsulot qo‘shing.",
      "qa10 kuponini kichik harfda qo‘llang.",
    ],
    expected: "10% chegirma qo‘llanadi.",
    actual: "Kupon topilmadi xabari chiqadi.",
    severity: "Medium",
  },
  {
    id: "BUG-09",
    module: "Buyurtma",
    requirementId: "REQ-06",
    title: "Bepul yetkazish chegarasi ishlamaydi",
    steps: [
      "Savatga narxi 300 000 so‘mdan yuqori bitta mahsulot qo‘shing.",
      "Yetkazib berish qiymatini tekshiring.",
    ],
    expected: "Yetkazib berish bepul.",
    actual: "20 000 so‘m yetkazish haqi qo‘shiladi.",
    severity: "High",
  },
  {
    id: "BUG-10",
    module: "Kirish",
    requirementId: "REQ-07",
    title: "Noto‘g‘ri parol bilan test hisobiga kiriladi",
    steps: [
      "Hisob bo‘limini oching.",
      "Email: qa@lab.uz, parol: Wrong123! kiriting.",
      "Kirish tugmasini bosing.",
    ],
    expected: "Xato chiqadi, tizimga kirilmaydi.",
    actual: "Test hisobi ochiladi.",
    severity: "Critical",
  },
  {
    id: "BUG-11",
    module: "Buyurtma",
    requirementId: "REQ-08",
    title: "Noto‘g‘ri telefon bilan buyurtma yaratiladi",
    steps: [
      "Savatga mavjud mahsulot qo‘shing va rasmiylashtirishni oching.",
      "Ism: Aziza. Telefon: 123. Manzil: Toshkent, Olmazor 15.",
      "Qabul qilganda to‘lovni tanlab, buyurtma bering.",
    ],
    expected: "Telefon validatsiya xatosi, buyurtma yaratilmaydi.",
    actual: "Buyurtma muvaffaqiyatli yaratiladi.",
    severity: "High",
  },
  {
    id: "BUG-12",
    module: "Buyurtma",
    requirementId: "REQ-08",
    title: "Bo‘sh joylardan iborat manzil qabul qilinadi",
    steps: [
      "Savatga mavjud mahsulot qo‘shing va rasmiylashtirishni oching.",
      "Ism: Aziza. Telefon: +998901234567.",
      "Manzilga 12 ta bo‘sh joy kiriting va buyurtma bering.",
    ],
    expected: "Manzil validatsiya xatosi, buyurtma yaratilmaydi.",
    actual: "Mazmunsiz manzil bilan buyurtma yaratiladi.",
    severity: "High",
  },
  {
    id: "BUG-13",
    module: "Buyurtmalar",
    requirementId: "REQ-10",
    title: "Bekor qilingan buyurtma holati yangilanmaydi",
    steps: [
      "To‘g‘ri ma’lumotlar bilan buyurtma yarating.",
      "Buyurtmalar bo‘limida Bekor qilishni bosing.",
    ],
    expected: "Holati Bekor qilingan; qayta bekor qilish tugmasi yo‘q.",
    actual: "Muvaffaqiyat xabari chiqadi, lekin holati Yangi bo‘lib qoladi.",
    severity: "High",
  },
  {
    id: "BUG-14",
    module: "Kupon",
    requirementId: "REQ-05",
    title: "Kupon minimal summadan pastda ishlaydi",
    steps: [
      "Savatni tozalang.",
      "100 000 so‘mdan arzon bitta mahsulot qo‘shing.",
      "QA10 kuponini qo‘llang.",
    ],
    expected: "100 000 so‘m minimal summa haqida xato chiqadi.",
    actual: "10% chegirma qo‘llanadi.",
    severity: "Medium",
  },
];

export function createScenario(seed = "QA-2026", difficulty = "standard") {
  const random = rng(seed);
  const priceOffset = Math.floor(random() * 3) * 5000;
  const brands = ["Forma", "Noma", "Vela", "Minto"];
  const brand = brands[Math.floor(random() * brands.length)];
  const templates = [
    [
      "p1",
      "Air One quloqchin",
      "Audio",
      269000,
      8,
      "headphones",
      "#ebe7fb",
      4.8,
    ],
    ["p2", "Mini Beat karnay", "Audio", 149000, 5, "speaker", "#e1efe5", 4.6],
    [
      "p3",
      "Orbit simsiz sichqoncha",
      "Aksessuarlar",
      79000,
      12,
      "mouse",
      "#f6e9df",
      4.7,
    ],
    [
      "p4",
      "Flow mexanik klaviatura",
      "Aksessuarlar",
      459000,
      2,
      "keyboard",
      "#e4eaf6",
      4.9,
    ],
    [
      "p5",
      "Daily termo idish",
      "Hayot tarzi",
      89000,
      14,
      "bottle",
      "#eee9df",
      4.5,
    ],
    ["p6", "Arc stol chirog‘i", "Uy uchun", 199000, 6, "lamp", "#f2e5da", 4.8],
    [
      "p7",
      "Pulse aqlli soat",
      "Aksessuarlar",
      399000,
      4,
      "watch",
      "#e4eeef",
      4.7,
    ],
    ["p8", "Air Pro quloqchin", "Audio", 329000, 0, "earbuds", "#eee6e9", 4.9],
    ["p9", "Nest organizer", "Uy uchun", 129000, 7, "box", "#e8ecdd", 4.4],
  ];
  const products = shuffle(
    templates.map(
      ([id, name, category, price, stock, icon, color, rating]) => ({
        id,
        name,
        category,
        price: price + priceOffset,
        stock,
        icon,
        color,
        rating,
        sku: `QA-${id.toUpperCase()}-${(hash(seed) % 900) + 100}`,
        description: `${name} — kundalik ish va dam olish uchun puxta ishlangan mahsulot. 12 oy kafolat, qulay foydalanish va zamonaviy dizayn.`,
        reviews: Math.floor(random() * 120) + 18,
      }),
    ),
    random,
  );
  const counts = { beginner: 4, standard: 6, expert: 8 };
  const normalizedDifficulty = counts[difficulty] ? difficulty : "standard";
  // Spread defects across flows so every difficulty practices multiple areas.
  const groups = [
    bugCatalog.slice(0, 3),
    bugCatalog.slice(3, 6),
    bugCatalog.filter((b) => ["BUG-07", "BUG-08", "BUG-14"].includes(b.id)),
    bugCatalog.filter((b) =>
      ["BUG-09", "BUG-10", "BUG-11", "BUG-12", "BUG-13"].includes(b.id),
    ),
  ];
  const selected = groups.map((group) => shuffle(group, random)[0]);
  const remaining = shuffle(
    bugCatalog.filter((b) => !selected.includes(b)),
    random,
  );
  const bugs = shuffle(
    [...selected, ...remaining.slice(0, counts[normalizedDifficulty] - 4)],
    random,
  ).map((b) => ({ ...b, steps: [...b.steps] }));
  return {
    seed: String(seed),
    difficulty: normalizedDifficulty,
    name: `${brand} · onlayn do‘kon`,
    brand,
    variant: Math.floor(random() * 3),
    today: SIMULATED_DATE,
    products,
    requirements: requirements.map((r) => ({ ...r })),
    bugs,
    availableBugCount: bugCatalog.length,
    categories: [
      "Barchasi",
      "Audio",
      "Aksessuarlar",
      "Uy uchun",
      "Hayot tarzi",
    ],
    deliveryThreshold: 300000,
    deliveryFee: 20000,
    testAccount: { ...TEST_ACCOUNT },
  };
}

export function initialProductState() {
  return {
    view: "catalog",
    query: "",
    category: "Barchasi",
    sort: "popular",
    cart: [],
    couponInput: "",
    coupon: null,
    couponMessage: "",
    user: null,
    login: { email: "", password: "" },
    checkout: { name: "", phone: "", address: "", payment: "cash", card: "" },
    orders: [],
    errors: {},
    notice: "",
    selectedProduct: null,
    nextOrder: 1,
  };
}
export const hasBug = (scenario, fixedBugIds, id) =>
  scenario.bugs.some((b) => b.id === id) && !(fixedBugIds || []).includes(id);

export function filterProducts(scenario, state, fixedBugIds = []) {
  const query = (state.query || "").trim();
  let products = scenario.products.filter(
    (p) =>
      !query ||
      (hasBug(scenario, fixedBugIds, "BUG-01")
        ? `${p.name} ${p.sku}`.includes(query)
        : `${p.name} ${p.sku}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase())),
  );
  if (state.category && state.category !== "Barchasi") {
    const leak = hasBug(scenario, fixedBugIds, "BUG-02")
      ? products.find((p) => p.category !== state.category)?.id
      : null;
    products = products.filter(
      (p) => p.category === state.category || p.id === leak,
    );
  }
  if (state.sort === "price-asc")
    products.sort(
      (a, b) =>
        (a.price - b.price) *
        (hasBug(scenario, fixedBugIds, "BUG-03") ? -1 : 1),
    );
  if (state.sort === "price-desc") products.sort((a, b) => b.price - a.price);
  if (state.sort === "rating") products.sort((a, b) => b.rating - a.rating);
  return products;
}
export function validateCoupon(scenario, fixedBugIds, code, subtotal) {
  const raw = String(code || "").trim();
  const normalized = hasBug(scenario, fixedBugIds, "BUG-08")
    ? raw
    : raw.toUpperCase();
  if (normalized === "OLD20")
    return hasBug(scenario, fixedBugIds, "BUG-07")
      ? { valid: true, code: "OLD20", percent: 20 }
      : { valid: false, error: "Bu kuponning amal qilish muddati tugagan." };
  if (normalized !== "QA10") return { valid: false, error: "Kupon topilmadi." };
  if (subtotal < 100000 && !hasBug(scenario, fixedBugIds, "BUG-14"))
    return {
      valid: false,
      error: "QA10 uchun mahsulotlar jami kamida 100 000 so‘m bo‘lishi kerak.",
    };
  return { valid: true, code: "QA10", percent: 10 };
}
export function calculateCart(scenario, state, fixedBugIds = []) {
  const lines = state.cart
    .map((line) => ({
      ...line,
      product: scenario.products.find((p) => p.id === line.productId),
    }))
    .filter((line) => line.product);
  const subtotal = lines.reduce(
    (sum, line) =>
      sum +
      line.product.price *
        (hasBug(scenario, fixedBugIds, "BUG-06") ? 1 : line.quantity),
    0,
  );
  const coupon = state.coupon
    ? validateCoupon(scenario, fixedBugIds, state.coupon, subtotal)
    : { valid: false };
  const discount = coupon.valid
    ? Math.round((subtotal * coupon.percent) / 100)
    : 0;
  const delivery = !lines.length
    ? 0
    : subtotal >= 300000 && !hasBug(scenario, fixedBugIds, "BUG-09")
      ? 0
      : 20000;
  return {
    lines,
    subtotal,
    discount,
    delivery,
    total: subtotal - discount + delivery,
    quantity: lines.reduce((sum, l) => sum + l.quantity, 0),
    coupon,
  };
}
export function changeCart(
  scenario,
  state,
  fixedBugIds,
  productId,
  nextQuantity,
) {
  const product = scenario.products.find((p) => p.id === productId);
  if (!product) return { ...state, notice: "Mahsulot topilmadi." };
  if (!Number.isInteger(nextQuantity) || nextQuantity < 0)
    return { ...state, notice: "Miqdor musbat butun son bo‘lishi kerak." };
  if (nextQuantity === 0)
    return {
      ...state,
      cart: state.cart.filter((l) => l.productId !== productId),
      notice: "Mahsulot savatdan olindi.",
    };
  if (product.stock === 0 && !hasBug(scenario, fixedBugIds, "BUG-04"))
    return { ...state, notice: "Bu mahsulot hozir omborda mavjud emas." };
  if (
    product.stock > 0 &&
    nextQuantity > product.stock &&
    !hasBug(scenario, fixedBugIds, "BUG-05")
  )
    return { ...state, notice: `Omborda faqat ${product.stock} dona bor.` };
  const exists = state.cart.some((l) => l.productId === productId);
  return {
    ...state,
    cart: exists
      ? state.cart.map((l) =>
          l.productId === productId ? { ...l, quantity: nextQuantity } : l,
        )
      : [...state.cart, { productId, quantity: nextQuantity }],
    notice: `${product.name} — savatda ${nextQuantity} dona.`,
  };
}
export function checkoutErrors(scenario, state, fixedBugIds, fields) {
  const errors = {};
  if (!state.cart.length) errors.cart = "Savat bo‘sh.";
  if (String(fields.name || "").trim().length < 2)
    errors.name = "Ism kamida 2 ta belgidan iborat bo‘lsin.";
  if (
    !hasBug(scenario, fixedBugIds, "BUG-11") &&
    !/^\+998\d{9}$/.test(String(fields.phone || "").replace(/[\s()-]/g, ""))
  )
    errors.phone = "Telefonni +998901234567 shaklida kiriting.";
  const address = String(fields.address || "");
  if (
    (hasBug(scenario, fixedBugIds, "BUG-12") ? address : address.trim())
      .length < 10
  )
    errors.address = "To‘liq manzilni kiriting — kamida 10 ta belgi.";
  if (!["cash", "card"].includes(fields.payment))
    errors.payment = "To‘lov usulini tanlang.";
  if (
    fields.payment === "card" &&
    String(fields.card || "").replace(/\s/g, "") !== "4242424242424242"
  )
    errors.card = "Faqat demo karta: 4242 4242 4242 4242.";
  for (const line of state.cart) {
    const product = scenario.products.find((p) => p.id === line.productId);
    if (
      !product ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      (product.stock === 0 && !hasBug(scenario, fixedBugIds, "BUG-04")) ||
      (product.stock > 0 &&
        line.quantity > product.stock &&
        !hasBug(scenario, fixedBugIds, "BUG-05"))
    )
      errors.cart = "Savatdagi mahsulot qoldig‘ini tekshiring.";
  }
  return errors;
}

export function simulateApi(
  scenario,
  productState,
  fixedBugIds = [],
  request = {},
) {
  const state = productState || initialProductState(scenario);
  const method = String(request.method || "GET").toUpperCase();
  let url;
  try {
    url = new URL(request.path || "/products", "https://local.qa.invalid");
  } catch {
    return { status: 400, body: { error: "Yo‘l noto‘g‘ri." }, duration: 12 };
  }
  const path = url.pathname.replace(/^\/api/, "").replace(/\/$/, "") || "/";
  let body = request.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return { status: 400, body: { error: "JSON noto‘g‘ri." }, duration: 12 };
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return {
      status: 400,
      body: { error: "JSON obyekt bo‘lishi kerak." },
      duration: 12,
    };
  const respond = (status, data, nextState) => ({
    status,
    body: data,
    duration: 35 + (hash(`${scenario.seed}:${method}:${path}`) % 180),
    ...(nextState ? { productState: nextState } : {}),
  });
  if (method === "GET" && path === "/products") {
    const results = filterProducts(
      scenario,
      {
        ...state,
        query:
          url.searchParams.get("search") ?? url.searchParams.get("q") ?? "",
        category: url.searchParams.get("category") || "Barchasi",
        sort: url.searchParams.get("sort") || "popular",
      },
      fixedBugIds,
    );
    return respond(200, { data: results, total: results.length });
  }
  if (method === "GET" && path === "/orders")
    return respond(200, { data: state.orders, total: state.orders.length });
  if (method === "GET" && path === "/cart")
    return respond(200, calculateCart(scenario, state, fixedBugIds));
  if (method === "POST" && path === "/login") {
    const valid =
      String(body.email || "")
        .trim()
        .toLowerCase() === TEST_ACCOUNT.email &&
      (body.password === TEST_ACCOUNT.password ||
        hasBug(scenario, fixedBugIds, "BUG-10"));
    return valid
      ? respond(
          200,
          {
            user: { email: TEST_ACCOUNT.email, name: TEST_ACCOUNT.name },
            token: "local-demo-token-not-a-credential",
          },
          {
            ...state,
            user: { email: TEST_ACCOUNT.email, name: TEST_ACCOUNT.name },
            errors: {},
            login: { email: "", password: "" },
          },
        )
      : respond(401, { error: "Email yoki parol noto‘g‘ri." });
  }
  if (
    method === "POST" &&
    ["/coupon", "/coupons", "/coupons/check"].includes(path)
  ) {
    const subtotal = calculateCart(scenario, state, fixedBugIds).subtotal;
    const result = validateCoupon(scenario, fixedBugIds, body.code, subtotal);
    return result.valid
      ? respond(
          200,
          {
            ...result,
            discount: Math.round((subtotal * result.percent) / 100),
          },
          {
            ...state,
            coupon: String(body.code).trim(),
            couponMessage: `${result.percent}% chegirma qo‘llandi.`,
          },
        )
      : respond(
          422,
          { error: result.error },
          { ...state, coupon: null, couponMessage: result.error },
        );
  }
  if (method === "POST" && path === "/orders") {
    const allowedFields = new Set([
      "name",
      "phone",
      "address",
      "payment",
      "card",
    ]);
    const invalidFields = Object.keys(body).filter(
      (key) => !allowedFields.has(key) || typeof body[key] !== "string",
    );
    if (invalidFields.length)
      return respond(400, {
        error:
          "Buyurtma maydonlari matn bo‘lishi kerak; noma’lum maydonlar qabul qilinmaydi.",
        fields: invalidFields,
      });
    const fields = { ...state.checkout, ...body };
    const errors = checkoutErrors(scenario, state, fixedBugIds, fields);
    if (Object.keys(errors).length)
      return respond(
        422,
        { error: "Ma’lumotlarni tekshiring.", errors },
        { ...state, checkout: fields, errors },
      );
    const totals = calculateCart(scenario, state, fixedBugIds);
    const nextNumber = Number.isInteger(state.nextOrder)
      ? state.nextOrder
      : state.orders.length + 1;
    const order = {
      id: `ORD-${(hash(scenario.seed) % 9000) + 1000}-${String(nextNumber).padStart(3, "0")}`,
      date: scenario.today,
      status: "new",
      customer: {
        name: String(fields.name).trim(),
        phone: fields.phone,
        address: String(fields.address).trim(),
      },
      payment: fields.payment,
      items: totals.lines.map((l) => ({
        productId: l.productId,
        name: l.product.name,
        price: l.product.price,
        quantity: l.quantity,
      })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      delivery: totals.delivery,
      total: totals.total,
    };
    return respond(
      201,
      { order },
      {
        ...state,
        orders: [order, ...state.orders],
        cart: [],
        coupon: null,
        couponInput: "",
        couponMessage: "",
        errors: {},
        nextOrder: nextNumber + 1,
        checkout: { ...fields, card: "" },
        view: "orders",
        notice: `${order.id} buyurtma qabul qilindi.`,
      },
    );
  }
  const cancelMatch = path.match(/^\/orders\/([^/]+)\/cancel$/);
  if (method === "POST" && cancelMatch) {
    const order = state.orders.find((o) => o.id === cancelMatch[1]);
    if (!order) return respond(404, { error: "Buyurtma topilmadi." });
    if (order.status !== "new")
      return respond(409, { error: "Bu buyurtma allaqachon bekor qilingan." });
    const updated = hasBug(scenario, fixedBugIds, "BUG-13")
      ? order
      : { ...order, status: "cancelled" };
    return respond(
      200,
      { message: "Buyurtma bekor qilindi.", order: updated },
      {
        ...state,
        orders: state.orders.map((o) => (o.id === order.id ? updated : o)),
        notice: "Buyurtma bekor qilindi.",
      },
    );
  }
  return respond(404, {
    error: "Endpoint topilmadi.",
    available: [
      "GET /products",
      "GET /cart",
      "GET /orders",
      "POST /login",
      "POST /coupons/check",
      "POST /orders",
      "POST /orders/:id/cancel",
    ],
  });
}

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
  // Keep the original nine products and their random draws stable: existing
  // seeds retain their defect set, shop variant and boundary-test products.
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
      "Bluetooth 5.3, 30 soatgacha tinglash va USB-C quvvatlash. Yumshoq quloq yostiqchalari, buklanadigan korpus va suhbat uchun mikrofon.",
    ],
    [
      "p2",
      "Mini Beat karnay",
      "Audio",
      149000,
      5,
      "speaker",
      "#e1efe5",
      4.6,
      "5 W portativ karnay, Bluetooth 5.2 va 8 soatgacha ishlash. USB-C kabeli bilan birga; stol yoki kichik xona uchun.",
    ],
    [
      "p3",
      "Orbit simsiz sichqoncha",
      "Aksessuarlar",
      79000,
      12,
      "mouse",
      "#f6e9df",
      4.7,
      "2.4 GHz USB qabul qilgich, 1600 DPI sensor va 3 ta tugma. Bir dona AA batareya bilan ishlaydi; Windows va macOS bilan mos.",
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
      "87 tugmali US tartibi, mexanik qizil switch va oq yoritish. Ajraladigan USB-C kabeli; simli ulanish orqali ishlaydi.",
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
      "500 ml, ikki qavatli zanglamas po‘lat va burama qopqoq. Issiq ichimlikni 6 soatgacha saqlaydi; qo‘lda yuvish tavsiya etiladi.",
    ],
    [
      "p6",
      "Arc stol chirog‘i",
      "Uy uchun",
      199000,
      6,
      "lamp",
      "#f2e5da",
      4.8,
      "7 W LED, 3 xil yorug‘lik tusi va bukiladigan tayanch. USB-C quvvat manbai bilan ishlaydi; kabel to‘plamga kiradi.",
    ],
    [
      "p7",
      "Pulse aqlli soat",
      "Aksessuarlar",
      399000,
      4,
      "watch",
      "#e4eeef",
      4.7,
      "1.4 dyuymli ekran, qadam hisoblagich va telefon bildirishnomalari. 5 kungacha batareya; Android 10+ va iOS 14+ bilan mos.",
    ],
    [
      "p8",
      "Air Pro quloqchin",
      "Audio",
      329000,
      0,
      "earbuds",
      "#eee6e9",
      4.9,
      "Bluetooth 5.3, sensor boshqaruv va shovqinni kamaytirish. Quti bilan jami 24 soatgacha tinglash; 3 o‘lchamli silikon uchlik.",
    ],
    [
      "p9",
      "Nest organizer",
      "Uy uchun",
      129000,
      7,
      "box",
      "#e8ecdd",
      4.4,
      "28 × 18 × 12 sm o‘lchamli saqlash qutisi, 4 ta bo‘lim. Qalam, kabel va kichik buyumlar uchun; nam mato bilan tozalanadi.",
    ],
  ];
  const expandedTemplates = [
    [
      "p10",
      "Studio Max quloqchin",
      "Audio",
      589000,
      5,
      "headphones",
      "#e8e6ed",
      4.9,
      "40 mm dinamik, faol shovqin kamaytirish va 45 soatgacha tinglash. Bluetooth va 3.5 mm simli ulanish; saqlash g‘ilofi to‘plamda.",
    ],
    [
      "p11",
      "Tempo Fold quloqchin",
      "Audio",
      219000,
      9,
      "headphones",
      "#e9ecf3",
      4.5,
      "Yengil buklanadigan korpus, Bluetooth 5.2 va 20 soatgacha batareya. Qo‘ng‘iroq mikrofoni hamda ovoz boshqaruv tugmalari mavjud.",
    ],
    [
      "p12",
      "Echo Pocket karnay",
      "Audio",
      119000,
      3,
      "speaker",
      "#e6eee9",
      4.4,
      "3 W cho‘ntak karnayi, 6 soatgacha ishlash va osma tasma. Bluetooth orqali ulanadi; namlikdan himoyalanmagan.",
    ],
    [
      "p13",
      "Echo Plus karnay",
      "Audio",
      349000,
      6,
      "speaker",
      "#e0e8ec",
      4.8,
      "20 W stereo ovoz, 12 soatgacha batareya va USB-C quvvatlash. Ikki bir xil karnayni juftlash mumkin; IPX5 sachrash himoyasi.",
    ],
    [
      "p14",
      "Metro Buds quloqchin",
      "Audio",
      179000,
      10,
      "earbuds",
      "#ebe8e1",
      4.6,
      "Quloq ichiga joylashadigan simsiz juftlik, Bluetooth 5.3. Bir quvvatda 5 soat, quti bilan 20 soatgacha tinglash; USB-C kabeli bor.",
    ],
    [
      "p15",
      "Quiet Lite quloqchin",
      "Audio",
      249000,
      0,
      "earbuds",
      "#ece4e8",
      4.7,
      "Shovqinni kamaytiruvchi mikrofon, sensor boshqaruv va past kechikish rejimi. Quti bilan 28 soatgacha ishlash; 3 xil silikon uchlik.",
    ],
    [
      "p16",
      "Type Mini klaviatura",
      "Aksessuarlar",
      289000,
      7,
      "keyboard",
      "#e4e9ef",
      4.6,
      "68 tugmali ixcham US tartibi va mexanik jigarrang switch. Simli USB-C ulanish; kichik ish stoli uchun 32 sm kenglik.",
    ],
    [
      "p17",
      "Type Full klaviatura",
      "Aksessuarlar",
      359000,
      4,
      "keyboard",
      "#e9e9e5",
      4.7,
      "104 tugma, raqamli blok va 12 ta media kombinatsiya. Membranali tugmalar, sozlanadigan oyoqchalar va 1.5 m USB kabel.",
    ],
    [
      "p18",
      "Click Silent sichqoncha",
      "Aksessuarlar",
      99000,
      16,
      "mouse",
      "#eee6df",
      4.5,
      "Jim bosiladigan 4 tugma va 800–2400 DPI sozlanadigan sensor. 2.4 GHz USB qabul qilgich; ikkala qo‘lga mos simmetrik korpus.",
    ],
    [
      "p19",
      "Track Ergo sichqoncha",
      "Aksessuarlar",
      189000,
      5,
      "mouse",
      "#e4e9e4",
      4.8,
      "O‘ng qo‘lga mos vertikal korpus, 6 tugma va 3200 DPI sensor. Bluetooth yoki USB qabul qilgich bilan ulanish; USB-C orqali quvvatlanadi.",
    ],
    [
      "p20",
      "Move Fit aqlli soat",
      "Aksessuarlar",
      299000,
      8,
      "watch",
      "#e7ecef",
      4.4,
      "1.3 dyuymli ekran, 20 ta mashq rejimi va qadam hisoblash. 7 kungacha ishlash; 20 mm silikon tasma almashtiriladi.",
    ],
    [
      "p21",
      "Move Pro aqlli soat",
      "Aksessuarlar",
      549000,
      2,
      "watch",
      "#e5e6ed",
      4.8,
      "1.7 dyuymli ekran, GPS va telefon bildirishnomalari. Oddiy rejimda 8 kungacha batareya; magnit quvvat kabeli to‘plamda.",
    ],
    [
      "p22",
      "Lumi Mini chiroq",
      "Uy uchun",
      149000,
      9,
      "lamp",
      "#eee7df",
      4.6,
      "4 W LED, 3 pog‘onali yorqinlik va 28 sm balandlik. Sensor tugma bilan boshqariladi; USB kabel orqali quvvat oladi.",
    ],
    [
      "p23",
      "Lumi Desk chiroq",
      "Uy uchun",
      279000,
      6,
      "lamp",
      "#e9e9e1",
      4.9,
      "10 W LED, 5 pog‘onali yorqinlik va 30 daqiqali taymer. Bosh qismi 180° buriladi; quvvat adapteri to‘plamga kiradi.",
    ],
    [
      "p24",
      "Lumi Read chiroq",
      "Uy uchun",
      99000,
      0,
      "lamp",
      "#ede3db",
      4.3,
      "Iliq oq 3 W LED va yo‘nalishi sozlanadigan egiluvchan bo‘yin. USB orqali ishlaydi; tungi o‘qish uchun ixcham stol modeli.",
    ],
    [
      "p25",
      "Tidy Duo organizer",
      "Uy uchun",
      89000,
      12,
      "box",
      "#e8ecdF",
      4.5,
      "2 ta saqlash qutisi: 20 × 14 × 8 sm va 16 × 10 × 6 sm. Ichma-ich joylashadi; mayda ofis buyumlari uchun.",
    ],
    [
      "p26",
      "Tidy Stack organizer",
      "Uy uchun",
      169000,
      4,
      "box",
      "#e5e9e5",
      4.7,
      "3 qavatli modul, umumiy o‘lchami 25 × 18 × 24 sm. Har bir qavat alohida olinadi; kabel va aksessuarlar uchun.",
    ],
    [
      "p27",
      "Tidy Drawer organizer",
      "Uy uchun",
      69000,
      18,
      "box",
      "#ece7de",
      4.4,
      "Tortma uchun 6 bo‘limli taglik, o‘lchami 30 × 20 × 5 sm. Namlikka chidamli plastik; ajratgichlar yechilmaydi.",
    ],
    [
      "p28",
      "Trek Steel termo idish",
      "Hayot tarzi",
      129000,
      10,
      "bottle",
      "#e6e7e1",
      4.8,
      "750 ml ikki devorli po‘lat idish va sizib chiqmaydigan qopqoq. Issiqni 8 soat, sovuqni 12 soatgacha saqlaydi.",
    ],
    [
      "p29",
      "Trek Sport suv idishi",
      "Hayot tarzi",
      59000,
      20,
      "bottle",
      "#e2ebe8",
      4.4,
      "700 ml yengil sport idishi, hajm shkalasi va ko‘tarish halqasi. Sovuq ichimliklar uchun; issiq suv quyilmaydi.",
    ],
    [
      "p30",
      "Trek Mini suv idishi",
      "Hayot tarzi",
      49000,
      7,
      "bottle",
      "#ede6e0",
      4.3,
      "350 ml ixcham suv idishi, burama qopqoq va yumshoq tutqich. Kichik sumkaga mos; qo‘lda yuviladi.",
    ],
    [
      "p31",
      "Desk Tray organizer",
      "Uy uchun",
      109000,
      6,
      "box",
      "#e9e6de",
      4.6,
      "32 × 22 × 4 sm ish stoli tagligi, 5 ta bo‘lim. Telefon, kalit va qalamlarni tartiblaydi; pastida sirpanmas oyoqchalar bor.",
    ],
    [
      "p32",
      "Pulse Active aqlli soat",
      "Aksessuarlar",
      449000,
      3,
      "watch",
      "#e4e9ee",
      4.7,
      "1.5 dyuymli ekran, 50 ta mashq rejimi va uyqu statistikasi. 6 kungacha batareya, 22 mm tasma; ko‘rsatkichlar tibbiy o‘lchov emas.",
    ],
    [
      "p33",
      "Focus USB garnitura",
      "Audio",
      239000,
      11,
      "headphones",
      "#e7e8ec",
      4.6,
      "USB-A simli garnitura, buriladigan mikrofon va 2 m kabel. Kabelda ovoz va mikrofonni o‘chirish tugmalari; masofaviy suhbatlar uchun.",
    ],
    [
      "p34",
      "Read Clip chiroq",
      "Uy uchun",
      79000,
      13,
      "lamp",
      "#ede8e1",
      4.4,
      "2 W kitob chirog‘i, qisqichli tayanch va 3 xil yorqinlik. Ichki batareya 4 soatgacha ishlaydi; USB-C orqali quvvatlanadi.",
    ],
    [
      "p35",
      "Urban Thermo idish",
      "Hayot tarzi",
      159000,
      5,
      "bottle",
      "#e4e9e8",
      4.9,
      "600 ml vakuumli po‘lat idish va qulay ichish qopqog‘i. Issiqni 10 soatgacha saqlaydi; avtomobil stakan tutqichiga mos.",
    ],
    [
      "p36",
      "Travel Mug termo idish",
      "Hayot tarzi",
      119000,
      2,
      "bottle",
      "#eee6dd",
      4.6,
      "400 ml yo‘l idishi, bir qo‘lda ochiladigan qopqoq va sirpanmas taglik. Issiq ichimlikni 4 soatgacha saqlaydi; qo‘lda yuviladi.",
    ],
  ];
  const makeProduct =
    (randomSource) =>
    ([id, name, category, price, stock, icon, color, rating, description]) => ({
      id,
      name,
      category,
      price: price + priceOffset,
      stock,
      icon,
      color,
      rating,
      sku: `QA-${id.toUpperCase()}-${(hash(seed) % 900) + 100}`,
      description,
      reviews: Math.floor(randomSource() * 120) + 18,
    });
  const originalProducts = shuffle(templates.map(makeProduct(random)), random);
  const catalogRandom = rng(`${seed}:expanded-catalog`);
  const products = shuffle(
    [...originalProducts, ...expandedTemplates.map(makeProduct(catalogRandom))],
    catalogRandom,
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

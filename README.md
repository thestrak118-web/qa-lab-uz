# QA Lab — amaliy QA laboratoriya

O‘zbek tilida QA mashq qilish uchun veb ilova. Bir oynada demo do‘konni tekshirasiz, talablarni o‘qiysiz, checklist, test-case va bug-report yozasiz. Maqsad — shunchaki xatoni ko‘rish emas, uni qayta ko‘rsatish va aniq hujjatlashtirishni o‘rganish.

## Tez ishga tushirish

Node.js **22.12 yoki undan yangi** versiya kerak.

```sh
npm ci
npm run dev
```

Terminal ko‘rsatgan mahalliy manzilni brauzerda oching. Ishlab chiqarish buildini tekshirish uchun:

```sh
npm run build
npm run preview
```

`dist/` — joylashtirishga tayyor statik sayt. `npm test` avtomatik mantiqiy testlarni, `npm run test:e2e` esa Playwright brauzer testlarini ishga tushiradi. Brauzer testlari tizimdagi `/usr/bin/chromium` yoki `CHROMIUM_PATH` dan foydalanadi. Ular bo‘lmasa, `npx playwright install chromium` bilan Playwright brauzerini o‘rnating.

## Vercel’ga joylashtirish

1. Loyihani GitHub, GitLab yoki Bitbucket repozitoriyiga yuklang. `node_modules/` va shaxsiy mashq eksportlarini yuklamang.
2. Vercel’da **Add New → Project** orqali repozitoriyni import qiling. Loyiha boshqa papka ichida bo‘lsa, **Root Directory** sifatida `qa-lab` papkasini belgilang.
3. **Framework Preset: Vite**, **Build Command: `npm run build`**, **Output Directory: `dist`** ni tanlang. Mos Node.js versiyasini belgilang.
4. **Deploy** tugmasini bosing. `vercel.json` kerakli build va yo‘naltirish sozlamalarini o‘z ichiga oladi.

Rasmiy yo‘riqnoma: [Vite — Vercel deployment](https://vite.dev/guide/static-deploy.html#vercel).

Ilova uchun API kaliti, ma’lumotlar bazasi yoki server muhiti o‘zgaruvchilari talab qilinmaydi. `public/robots.txt` qidiruv robotlaridan saytni indekslamaslikni so‘raydi; bu kirishni cheklash vositasi emas.

## Bitta mashq qanday bajariladi?

1. **Yangi mashq boshlang.** Qiyinlikni tanlang. Seed — mashq variantini belgilaydigan qiymat; bir xil seed va qiyinlik bir xil boshlang‘ich variantni beradi.
2. **Talablarni o‘qing.** Kutilgan xulqni bilmasdan, natijani xato deb belgilamang.
3. **Checklist yozing.** Masalan: “Bo‘sh savat bilan buyurtma berib bo‘lmaydi.” Avval holatni bajarilmagan deb qoldiring, tekshirgandan keyin natijasini belgilang.
4. **Test-case tuzing.** Old shart, aniq qadamlar, kutilgan natija va haqiqiy natijani yozing. Ijobiy, salbiy va chegara qiymatlarini sinang.
5. **Demo do‘konda bajaring.** Qidiruv, filtrlar, mahsulotlar, savat, forma va buyurtma jarayonini tekshiring. API mashqlaridagi so‘rov va javoblarni ham talablar bilan solishtiring.
6. **Bug-report yozing.** Sarlavha, muhit, qayta bajarish qadamlari, kutilgan/haqiqiy natija, severity va priority kiriting. Kerak bo‘lsa rasm dalilini ilova qiling.
7. **Review qiling.** Mustaqil tekshiruvdan keyin laboratoriyaning tekshirish natijalarini oching. Hisobot dalili bilan natijani solishtiring.
8. **Fix va retest bajaring.** Tuzatilgan holatda avval xato bergan qadamlarni qayta bajaring. Yaqin funksiyalarni ham tekshiring — bu regression tekshiruvi.
9. **Test yakuni hisobotini yozing.** “Natija va retest” bo‘limida qamrov, risk va release qarorini yozib, Markdown hisobotini yuklang.
10. **Natijani saqlang va eksport qiling.** QA tahrir formasidagi **Saqlash** tugmasini bosing; keyin yozuv avtomatik brauzerga saqlanadi. Yangi mashqqa o‘tish oldingi saqlangan ishni tarixda qoldiradi. Saqlanmagan ochiq forma qoralamasi sahifadan ketganda saqlanmaydi.

Namuna bug-report:

> **Sarlavha:** Savatdagi miqdor 2 ga o‘zgarganda jami narx yangilanmaydi.
>
> **Old shart:** Savatda narxi 100 000 so‘m bo‘lgan bitta mahsulot bor.
>
> **Qadamlar:** Savatni oching → miqdorni 2 qiling → jami narxni kuzating.
>
> **Kutilgan:** Mahsulotlar jami 200 000 so‘m.
>
> **Haqiqiy:** Mahsulotlar jami 100 000 so‘m bo‘lib qoldi.
>
> **Severity:** High. **Priority:** P1.
>
> **Dalil:** Miqdor va jami narx birga ko‘rinadigan screenshot.

Bu yozish usuli namunasi; har mashqda aynan shu xato bo‘lishi shart emas.

## Nimalar almashadi va nimalar saqlanadi?

- **Yangi mashq** yaratilganda interfeys joylashuvi, ma’lumotlar va tanlangan xatolar to‘plami o‘zgaradi. Seed va qiyinlik mashqni takrorlashga yordam beradi.
- Sahifani oddiy yangilash tugallanmagan mashqni almashtirmaydi. Joriy ishni davom ettirasiz.
- Oldingi sessiyalar tarixda qoladi. Har bir mashqning checklist, test-case va hisobotlari o‘ziga tegishli.
- Xatolar mashq uchun ataylab kiritilgan. Review’dan oldin ularni mustaqil izlash foydaliroq.

## Saqlash va zaxira nusxa

Mashqlar **brauzerning IndexedDB xotirasida** saqlanadi. Bulut akkaunti va qurilmalararo avtomatik sinxronlash yo‘q. Boshqa brauzer, boshqa profil yoki boshqa sayt manzili alohida xotiraga ega. Vercel preview manzilidagi ish asosiy domeningizga avtomatik ko‘chmaydi.

Sayt ma’lumotlarini tozalash, maxfiy rejimdan chiqish yoki brauzer xotirasining o‘chirilishi ishni yo‘qotishi mumkin. Muhim mashqlarni **JSON eksport** qilib saqlang. Eksport mashq ma’lumotlari va ilova qilingan rasm dalillarini ham olib chiqadi. **JSON import** orqali mos QA Lab eksportini qayta tiklashingiz mumkin. Import yangi ID’li mashqlarni tarixga qo‘shadi; bir xil ID’li mavjud mashqlarni o‘tkazib yuboradi va ularning ishini almashtirmaydi. Katta rasmlar zaxira faylini kattalashtiradi; hisobot uchun faqat kerakli qismini suratga oling.

Eksportdagi yozuv va rasmlar shaxsiy ma’lumotlarni o‘z ichiga olishi mumkin; uni ulashishdan oldin tekshiring. Demo formalariga haqiqiy parol yoki karta ma’lumotlarini kiritish kerak emas.

## Lab chegaralari

Do‘kondagi mahsulot suratlari ilova bilan birga yuklanadi. Ularning manbalari va litsenziyasi [PRODUCT_IMAGES.md](public/PRODUCT_IMAGES.md) faylida berilgan.

Do‘kon, buyurtmalar va to‘lovlar — mashq uchun simulyatsiya. Haqiqiy mahsulot yuborilmaydi va haqiqiy pul yechilmaydi. API paneli ham **brauzer ichidagi simulyator**, tashqi xizmatga ulanadigan haqiqiy backend emas. Uni real serverning autentifikatsiya, xavfsizlik, yuklama yoki tarmoq barqarorligini tekshirish vositasi deb qabul qilmang.

Review javoblar katalogini ochadi, o‘zingiz reportlar bilan bog‘laysiz. Maydonlar to‘liqligi mazmunning to‘g‘riligiga avtomatik baho emas. U talabni tushunish, test qamrovini rejalash va hisobotning inson uchun tushunarli ekanini baholash o‘rnini bosmaydi.

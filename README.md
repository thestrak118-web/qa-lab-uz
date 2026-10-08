# QA Lab — amaliy QA laboratoriya

O‘zbek tilida QA mashq qilish uchun veb ilova. Bir oynada demo do‘konni tekshirasiz, talablarni o‘qiysiz, checklist, test-case va bug-report yozasiz. Maqsad — shunchaki xatoni ko‘rish emas, uni qayta ko‘rsatish va aniq hujjatlashtirishni o‘rganish.

## Katalog va qulayliklar

- **39 ta mahsulot, har biriga alohida surat:** 4 kategoriya, qidiruv, saralash va 12/12/12/3 ko‘rinishida 4 sahifa. Faol filtrni alohida yoki barcha filtrlarni birdan tozalash mumkin. Mahsulot tafsilotlarida o‘quv modeli xususiyatlari yozilgan; suratlar namuna uchun.
- **Kunduzgi, tungi va tizimga mos rejim:** yuqori paneldagi **Rang rejimi** orqali tanlanadi. Tanlov shu brauzerda saqlanadi; “Tizimga mos” operatsion tizim rang rejimini kuzatadi.
- **Keyingi qadam:** bosh sahifa joriy yozuvlaringizga qarab ishni qayerdan davom ettirishni ko‘rsatadi. “Mashqning 5 bosqichi” butun jarayonni qisqa tushuntiradi.
- **Talabdan hujjatga:** talab kartasidagi **Checklist yozish** yoki **Test-case yozish** bog‘langan talab bilan bo‘sh tahrir formasini ochadi. Yozuv faqat **Saqlash** bosilganda yaratiladi.
- **Katta mashqlar:** hujjatlar va baholash tafsilotlari 50 tadan sahifalanadi. Qidiruv va filtr barcha yozuvlardan izlaydi; eksport faqat ochiq sahifani emas, barcha tegishli yozuvlarni saqlaydi.

Har bir mahsulot surati barqaror ID bilan bog‘langan; bir xil kategoriya surati qayta-qayta takrorlanmaydi. Oldingi 9 yoki 36 mahsulotli mashq o‘z holicha saqlanadi. Kengaygan katalog bilan ishlash uchun **Yangi mashq** oching; eski ishlaringiz **Mashqlar tarixi** bo‘limida qoladi.

## Avtomatik baholash

1. Checklist, test-case yoki report tahririda **Avto baholash mezoni**ni tanlang. U aniq sinovni bildiradi: masalan, qoldiq chegarasi yoki ikki dona mahsulot jami. Faqat umumiy talabni tanlash avtomatik solishtirish uchun yetarli emas.
2. Shu holatni do‘konda tekshiring, natijani belgilang va hujjatni saqlang.
3. **Natija va retest → Mashqni topshirish → Topshirish va baholash**ni bosing. Javoblar shundan keyin ochiladi.

Baholovchi joriy build uchun 14 ta nazorat sinovini yangi, ajratilgan test ma’lumotlarida bajaradi. Sizning savatingiz va buyurtmalaringiz o‘zgarmaydi. U shunchaki mashqda tanlangan bug ID’larini sanab natija yasamaydi: qidiruv, savat, kupon, login va buyurtma funksiyalari ishga tushiriladi.

| Qism                           | Ball | Mezon                                                                                                                                                     |
| ------------------------------ | ---: | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Holatlar mosligi               |   60 | Bajarilishi mumkin bo‘lgan aniq mezonlardan nechta to‘g‘ri belgilangan. Takroriy yozuv qo‘shimcha ball bermaydi; zid belgilangan mezon hisoblanmaydi.     |
| Report va xatoli mezon mosligi |   25 | Joriy build’da xato bergan mezonlarga to‘liq, faol report bog‘langanligi. Tanlangan mezonda tasdiqlanmagan yoki bog‘lanmagan da’volar ballni kamaytiradi. |
| Report maydonlari to‘liqligi   |   15 | Sarlavha, qadamlar, kutilgan/haqiqiy natija, muhit, talab va avto mezonning yozilganligi. Takroriy reportlar bu ballni oshirmaydi.                        |

Xatosiz build’da report talab qilinmaydi. Report yo‘qligi uchun ajratilgan 40 ball to‘g‘ri bajarilgan mezonlar ulushiga beriladi: 7/14 to‘g‘ri va faol report yo‘q bo‘lsa — 50/100; bitta noto‘g‘ri javobning o‘zi — 0/100. Baholash qoidasi yangilansa, eski urinish saqlanadi va qayta topshirish eslatiladi.

**Ball qoidalarga asoslangan o‘quv bahosi.** Reportdagi matn va screenshot mazmunining rostligi yoki sifatini tasdiqlamaydi. Masalan, noto‘g‘ri ma’no yozilgan bo‘lsa ham, to‘ldirilgan maydon “to‘liq” deb sanalishi mumkin. AI va tashqi xizmat ulanmagan; hujjatlar brauzerdan yuborilmaydi. UI ko‘rinishi, tarmoq tezligi, to‘lov va barcha mumkin bo‘lgan chegara holatlari ushbu 14 mezon bilan to‘liq qamralmaydi.

Natijada kutilgan/haqiqiy holat, noto‘g‘ri belgilangan va tanlanmagan mezonlar, yetishmagan report maydonlari ko‘rinadi. `Tekshirilmagan`, `To‘siq bor` va `[Namuna]` yozuvlari bajarilgan to‘g‘ri test sifatida sanalmaydi. Zarur test ma’lumoti yo‘q mezon “Baholab bo‘lmadi” bo‘lib, holat balli hisobidan chiqariladi.

Har topshirish alohida nusxa sifatida saqlanadi. Keyin hujjat yoki build o‘zgarsa, eski ball yonida qayta topshirish kerakligi ko‘rsatiladi. Javoblar ochilgandan keyingi urinish “mashq” deb belgilanadi. Retestda joriy build natijalarini qayta belgilang; tuzatilgan xatolarning reportlarini `Closed` qiling. Yopilgan report joriy build’dagi faol xato da’vosi sifatida hisoblanmaydi. Natijani Markdown’ga, butun tarixni JSON zaxiraga eksport qilish mumkin.

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

Firefox va WebKit uchun tegishli brauzerni `npx playwright install --with-deps firefox webkit` orqali o‘rnating, so‘ng `QA_BROWSER=firefox npm run test:e2e` yoki `QA_BROWSER=webkit npm run test:e2e` buyrug‘ini bajaring. GitHub Actions har push va pull request’da mantiqiy testlar, build va Chromium sinovlarini avtomatik bajaradi.

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
7. **Mashqni topshiring.** “Natija va retest” bo‘limida avtomatik baho oling. Aniq mezonga bog‘lanmagan yozuvlar qo‘lda tekshirish uchun qoladi. Javoblarni baholashsiz ham ochish mumkin; undan keyingi topshirish mustaqil urinish hisoblanmaydi.
8. **Fix va retest bajaring.** Tuzatilgan holatda avval xato bergan qadamlarni qayta bajaring. Yaqin funksiyalarni ham tekshiring — bu regression tekshiruvi.
9. **Test yakuni hisobotini yozing.** “Natija va retest” bo‘limida qamrov, risk va release qarorini yozib, Markdown hisobotini yuklang.
10. **Natijani saqlang va eksport qiling.** QA tahrir formasidagi **Saqlash** tugmasini bosing; keyin yozuv avtomatik brauzerga saqlanadi. Yangi mashqqa o‘tish oldingi saqlangan ishni tarixda qoldiradi. Ochiq forma qoralamasi shu brauzer oynasida sahifalar orasida yurish va qayta yuklash uchun tiklanadi. Baho va JSON zaxiraga kirishi uchun baribir **Saqlash**ni bosing; oyna yopilganda qoralama yo‘qolishi mumkin.

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

Sayt ma’lumotlarini tozalash, maxfiy rejimdan chiqish yoki brauzer xotirasining o‘chirilishi ishni yo‘qotishi mumkin. Muhim mashqlarni **JSON eksport** qilib saqlang. Eksport mashq ma’lumotlari va ilova qilingan rasm dalillarini ham olib chiqadi. **JSON import** orqali mos QA Lab eksportini qayta tiklashingiz mumkin. Import yangi ID’li mashqlarni tarixga qo‘shadi; bir xil ID’li mavjud mashqlarni o‘tkazib yuboradi va ularning ishini almashtirmaydi. **JSON nusxa sifatida** esa barcha import mashqlarini yangi ID bilan alohida qo‘shadi — masalan, to‘qnashuvda yuklangan mahalliy ishni tiklash uchun. Hujjatlar, dalillar va baholash tarixi nusxada saqlanadi; joriy mashq o‘zgarmaydi.

50 MB dan katta zaxirada davom ettirish oynasi chiqadi: import ko‘proq xotira va vaqt olishi mumkin. **Bekor qilish** hech narsani o‘zgartirmaydi; **Importni davom ettirish** faylni o‘qib tekshiradi. Import tugagach qo‘shilgan va o‘tkazib yuborilgan mashqlar soni ko‘rsatiladi. Katta rasmlar zaxira faylini kattalashtiradi; hisobot uchun faqat kerakli qismini suratga oling.

Ikki oynada ishlaganda eskirgan oyna yangi saqlangan ma’lumot ustiga yozmaydi. To‘qnashuv chiqsa, **Nusxamni yuklab, yangi ishni ochish** joriy oynadagi ishni JSON faylga olib, eng yangi saqlangan nusxani ochadi. Ikki nusxadagi farqlar avtomatik birlashtirilmaydi. Saqlash vaqtincha ishlamasa, **Saqlashni qayta urinish** orqali davom etish mumkin.

Yozish vaqtida saqlash qisqa tanaffusni kutadi; yuqori paneldagi holat ish haqiqatan saqlanganini bildiradi. Boshqa nusxada hujjat o‘zgargan yoki o‘chirilgan bo‘lsa, eski forma qoralamasi alohida saqlanmagan nusxa sifatida tiklanadi. Uni saqlash yangi yozuv yaratadi va mavjud hujjatni almashtirmaydi.

Eksportdagi yozuv va rasmlar shaxsiy ma’lumotlarni o‘z ichiga olishi mumkin; uni ulashishdan oldin tekshiring. Demo formalariga haqiqiy parol yoki karta ma’lumotlarini kiritish kerak emas.

## Lab chegaralari

Do‘kondagi mahsulot suratlari ilova bilan birga yuklanadi. Ularning manbalari va litsenziyasi [PRODUCT_IMAGES.md](public/PRODUCT_IMAGES.md) faylida berilgan.

Do‘kon, buyurtmalar va to‘lovlar — mashq uchun simulyatsiya. Haqiqiy mahsulot yuborilmaydi va haqiqiy pul yechilmaydi. API paneli ham **brauzer ichidagi simulyator**, tashqi xizmatga ulanadigan haqiqiy backend emas. Uni real serverning autentifikatsiya, xavfsizlik, yuklama yoki tarmoq barqarorligini tekshirish vositasi deb qabul qilmang.

Avtomatik baho aniq tanlangan 14 mezon doirasida ishlaydi. Qo‘lda javobga bog‘lash esa o‘zini tekshirish uchun qoladi va ball hisobiga kirmaydi. Maydonlar to‘liqligi mazmunning to‘g‘riligiga avtomatik baho emas.

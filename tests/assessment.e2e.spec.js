import { test as base, expect } from "@playwright/test";
import { runChecks } from "../src/lib/checks.js";
import { createAssessment } from "../src/lib/assessment.js";

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await use(page);
    expect(
      errors,
      "Assessment screens should not raise runtime errors",
    ).toEqual([]);
  },
});
const panel = (page) =>
  page.getByRole("region", { name: "Avtomatik baholash", exact: true });
const active = (data) =>
  data.sessions.find((session) => session.id === data.activeId);
async function saved(page) {
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
}
async function stored(page) {
  await saved(page);
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("qa-lab-workspace-v1", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db
            .transaction("workspace")
            .objectStore("workspace")
            .get("state");
          read.onsuccess = () => {
            const data = read.result;
            db.close();
            resolve(data);
          };
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
        };
      }),
  );
}
async function nav(page, name) {
  const menu = page.getByRole("button", { name: "Menyu", exact: true });
  if (
    (await menu.isVisible()) &&
    !(await page.locator(".sidebar").getAttribute("class")).includes("open")
  )
    await menu.click();
  await page.locator(".sidebar").getByRole("button", { name }).click();
}
async function openExercise(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Yangi mashq", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Yangi QA mashqi" });
  await dialog
    .getByLabel("Mashq nomi", { exact: true })
    .fill("Baholash UI sinovi");
  await dialog.getByLabel(/Seed/).fill("QA-2026");
  await dialog.getByRole("button", { name: "Mashqni yaratish" }).click();
  await expect(dialog).toBeHidden();
  await saved(page);
}
async function submit(page) {
  await panel(page)
    .getByRole("button", { name: /^(Mashqni topshirish|Qayta topshirish)$/ })
    .click();
  await panel(page)
    .getByRole("button", { name: "Topshirish va baholash", exact: true })
    .click();
  await expect(panel(page).locator(".assessment-total")).toBeVisible();
  await saved(page);
}
async function download(page, action) {
  const promise = page.waitForEvent("download");
  await action();
  const result = await promise;
  const stream = await result.createReadStream();
  let text = "";
  for await (const chunk of stream) text += chunk.toString("utf8");
  return { text, name: result.suggestedFilename() };
}
async function importBackup(page, backup, sessionName) {
  await nav(page, "Mashqlar tarixi");
  await page
    .locator('input[type=file][accept="application/json,.json"]')
    .setInputFiles({
      name: "assessment-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await expect(page.getByRole("status")).toContainText("Zaxira import qilindi");
  await page
    .locator(".history-card")
    .filter({
      has: page.getByRole("heading", { name: sessionName, exact: true }),
    })
    .getByRole("button", { name: "Mashqni davom ettirish" })
    .click();
  await saved(page);
}
function completedFixture(original, name = "To‘liq baholash mashqi") {
  const session = structuredClone(original);
  session.id = `fixture-${name}`;
  session.name = name;
  session.assessments = [];
  session.reviewUnlocked = false;
  const checks = runChecks(session.scenario, session.fixedBugIds);
  session.checklist = checks.map((check) => ({
    id: `case-${check.id}`,
    title: check.title,
    requirementId: check.requirementId,
    checkId: check.id,
    status: check.status,
    expected: check.expected,
    actual: check.actual,
    priority: "P2",
  }));
  session.reports = checks
    .filter((check) => check.status === "Failed")
    .map((check) => ({
      id: `report-${check.id}`,
      title: `${check.title}: natija mos emas`,
      requirementId: check.requirementId,
      checkId: check.id,
      status: "Open",
      expected: check.expected,
      actual: check.actual,
      steps: check.description,
      priority: "P2",
      severity: "Medium",
      environment: "Chromium / Build 1.0",
      evidence: [],
    }));
  return session;
}

test("real learner submits deliberately, keeps cart and documents, edits and retests immutable attempts", async ({
  page,
}) => {
  await openExercise(page);
  expect(
    active(await stored(page)).scenario.bugs.some((bug) => bug.id === "BUG-01"),
  ).toBe(true);
  await nav(page, "Demo do‘kon");
  await page.getByRole("textbox", { name: "Mahsulot qidirish" }).fill("QA-P1-");
  await page
    .getByTestId("product-p1")
    .getByRole("button", { name: /savatga qo‘shish/ })
    .click();
  await page.getByRole("textbox", { name: "Mahsulot qidirish" }).fill("Air");
  await expect(page.locator(".shop-product")).toHaveCount(2);
  await page.getByRole("textbox", { name: "Mahsulot qidirish" }).fill("AIR");
  await expect(page.locator(".shop-product")).toHaveCount(0);

  await nav(page, /^Checklist/);
  await page
    .getByRole("button", { name: "Tekshiruv qo‘shish", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Sarlavha *", { exact: true })
    .fill("Air va AIR natijalarini solishtirish");
  await page
    .getByLabel("Avto baholash mezoni", { exact: true })
    .selectOption("AT-01");
  await expect(page.getByLabel("Bog‘liq talab", { exact: true })).toHaveValue(
    "REQ-01",
  );
  await page
    .getByLabel("Kutilgan natija", { exact: true })
    .fill("Bir xil mahsulotlar chiqadi.");
  await page
    .getByLabel("Haqiqiy natija", { exact: true })
    .fill("AIR natijalari bo‘sh.");
  await page.getByLabel("Holat", { exact: true }).selectOption("Failed");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();

  await nav(page, /^Bug-report/);
  await page
    .getByRole("button", { name: "Bug report yozish", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Sarlavha *", { exact: true })
    .fill("Katta harfda qidiruv ishlamaydi");
  await page
    .getByLabel("Avto baholash mezoni", { exact: true })
    .selectOption("AT-01");
  await page
    .getByLabel("Takrorlash qadamlari *", { exact: true })
    .fill(
      "1. Air ni qidiring.\n2. AIR ni qidiring.\n3. Natijalarni solishtiring.",
    );
  await page
    .getByLabel("Kutilgan natija *", { exact: true })
    .fill("Bir xil mahsulotlar topiladi.");
  await page
    .getByLabel("Haqiqiy natija *", { exact: true })
    .fill("AIR uchun hech nima topilmadi.");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  const before = active(await stored(page));

  await nav(page, "Natija va retest");
  await expect(panel(page).locator(".assessment-total")).toHaveCount(0);
  await panel(page)
    .getByRole("button", { name: "Mashqni topshirish", exact: true })
    .click();
  await expect(
    panel(page).getByRole("button", { name: "Topshirish va baholash" }),
  ).toBeFocused();
  expect(active(await stored(page)).assessments || []).toEqual([]);
  await panel(page)
    .getByRole("button", { name: "Hali tayyor emasman" })
    .click();
  await expect(panel(page).locator(".assessment-total")).toHaveCount(0);
  await expect(
    panel(page).getByRole("button", {
      name: "Mashqni topshirish",
      exact: true,
    }),
  ).toBeFocused();
  await submit(page);
  await expect(
    panel(page).getByRole("button", { name: "Qayta topshirish", exact: true }),
  ).toBeFocused();
  const first = active(await stored(page));
  expect(first.productState).toEqual(before.productState);
  expect(first.checklist).toEqual(before.checklist);
  expect(first.reports).toEqual(before.reports);
  expect(first.assessments).toHaveLength(1);
  const firstAttempt = first.assessments[0];
  expect(firstAttempt.mode).toBe("first");
  expect(firstAttempt.comparisons[0]).toMatchObject({
    checkId: "AT-01",
    expectedStatus: "Failed",
    claimedStatus: "Failed",
    verdict: "correct",
  });
  expect(firstAttempt.reports[0].verdict).toBe("matched");
  expect(first.reviewUnlocked).toBe(true);
  const markdown = await download(page, () =>
    panel(page).getByRole("button", { name: "Bahoni yuklash" }).click(),
  );
  expect(markdown.name).toMatch(/^qa-baho-.*\.md$/);
  expect(markdown.text).toContain("# QA Lab — avtomatik baholash");
  expect(markdown.text).toContain("AT-01");
  expect(markdown.text).toContain(`Baho: ${firstAttempt.score}/100`);

  await nav(page, /^Checklist/);
  await page
    .getByLabel("Air va AIR natijalarini solishtirish: holati", { exact: true })
    .selectOption("Passed");
  await nav(page, "Natija va retest");
  await expect(panel(page).getByRole("status")).toContainText(
    "Bu bahodan keyin",
  );
  expect(active(await stored(page)).assessments[0]).toEqual(firstAttempt);
  await submit(page);
  const second = active(await stored(page));
  expect(second.assessments).toHaveLength(2);
  expect(second.assessments[0]).toEqual(firstAttempt);
  expect(second.assessments[1]).toMatchObject({
    mode: "practice",
    summary: { wrong: 1 },
  });
  expect(second.assessments[1].comparisons[0].verdict).toBe("wrong");
  await panel(page)
    .locator("summary")
    .filter({ hasText: "Urinishlar tarixi" })
    .click();
  await panel(page)
    .getByRole("button", { name: /^1-urinish/ })
    .click();
  await expect(panel(page).locator(".assessment-total strong")).toHaveText(
    String(firstAttempt.score),
  );
  await expect(panel(page).locator(".assessment-meta")).toContainText(
    "Mustaqil topshirish",
  );
  await expect(panel(page).getByRole("status")).toContainText(
    "Arxivdagi urinish",
  );
  await panel(page)
    .getByRole("button", { name: "Oxirgi bahoni ko‘rish" })
    .click();
  await expect(panel(page).locator(".assessment-total strong")).toHaveText(
    String(second.assessments[1].score),
  );
  await expect(
    panel(page).getByText("Arxivdagi urinish", { exact: false }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tuzatilgan build’ni ochish", exact: true })
    .click();
  await submit(page);
  const final = active(await stored(page));
  expect(final.assessments).toHaveLength(3);
  expect(final.assessments.slice(0, 2)).toEqual(second.assessments);
  expect(final.assessments[2].build.label).toBe("1.1");
  expect(
    final.assessments[2].checks.every((check) => check.status === "Passed"),
  ).toBe(true);
  expect(final.checklist[0].status).toBe("Passed");
  expect(final.productState.cart).toEqual([{ productId: "p1", quantity: 1 }]);
});

test("complete work earns100, survives reload and exports/imports attempts into a fresh browser", async ({
  page,
  browser,
}) => {
  await openExercise(page);
  const fixture = completedFixture(active(await stored(page)));
  const backup = { version: 1, activeId: fixture.id, sessions: [fixture] };
  await importBackup(page, backup, fixture.name);
  await nav(page, "Natija va retest");
  await submit(page);
  await expect(panel(page).locator(".assessment-total strong")).toHaveText(
    "100",
  );
  const evaluated = active(await stored(page));
  expect(evaluated.assessments[0].summary.correct).toBe(14);
  expect(evaluated.assessments[0].missedCheckIds).toEqual([]);
  await page.reload();
  await nav(page, "Natija va retest");
  await expect(panel(page).locator(".assessment-total strong")).toHaveText(
    "100",
  );
  expect(active(await stored(page))).toEqual(evaluated);
  await nav(page, "Mashqlar tarixi");
  const exported = await download(page, () =>
    page.getByRole("button", { name: "JSON eksport", exact: true }).click(),
  );
  expect(
    JSON.parse(exported.text).sessions.find(
      (session) => session.id === evaluated.id,
    ).assessments,
  ).toEqual(evaluated.assessments);
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:5180",
  });
  try {
    const restored = await context.newPage();
    await restored.goto("/");
    await saved(restored);
    await importBackup(restored, JSON.parse(exported.text), evaluated.name);
    await nav(restored, "Natija va retest");
    await expect(
      panel(restored).locator(".assessment-total strong"),
    ).toHaveText("100");
    expect(active(await stored(restored))).toEqual(evaluated);
  } finally {
    await context.close();
  }
});

test("dark mobile assessment supports empty submissions, filters and scrollable answer tables without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExercise(page);
  await page
    .getByRole("combobox", { name: "Rang rejimi" })
    .selectOption("dark");
  await nav(page, "Natija va retest");
  await submit(page);
  await expect(panel(page).locator(".assessment-total strong")).toHaveText("0");
  await expect(panel(page)).toContainText(
    "Hali checklist yoki test-case yozilmagan",
  );
  await panel(page)
    .locator("summary")
    .filter({ hasText: "Nazorat testlari va javoblar" })
    .click();
  await expect(panel(page).getByRole("table")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const fixture = completedFixture(
    active(await stored(page)),
    "Telefonda baholash",
  );
  fixture.checklist[0].status = "Blocked";
  fixture.checklist[1].checkId = "";
  await importBackup(
    page,
    { version: 1, activeId: fixture.id, sessions: [fixture] },
    fixture.name,
  );
  await nav(page, "Natija va retest");
  await submit(page);
  await expect(panel(page)).toContainText("Mezon tanlanmagan");
  await expect(panel(page)).toContainText("To‘siq bor");
  await panel(page)
    .getByRole("button", { name: "Ko‘rib chiqish kerak", exact: true })
    .click();
  await expect(panel(page).getByRole("table").locator("tbody tr")).toHaveCount(
    2,
  );
  await panel(page)
    .locator("summary")
    .filter({ hasText: "Reportlar bo‘yicha izoh" })
    .click();
  await panel(page)
    .locator("summary")
    .filter({ hasText: "Nazorat testlari va javoblar" })
    .click();
  await panel(page)
    .locator("summary")
    .filter({ hasText: "Urinishlar tarixi" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(panel(page).locator(".assessment-scroll").first()).toBeVisible();
});

test("contradictory checklist and test-case results remain visible together for correction", async ({
  page,
}) => {
  await openExercise(page);
  const fixture = completedFixture(active(await stored(page)), "Zid natijalar");
  const first = fixture.checklist[0];
  fixture.checklist.push({
    ...first,
    id: "sample-same-check",
    title: "[Namuna] Alohida namuna",
  });
  fixture.cases = [
    {
      ...first,
      id: "contradictory-case",
      title: "Xuddi shu mezonning qarama-qarshi natijasi",
      status: first.status === "Passed" ? "Failed" : "Passed",
      steps: "Bir xil mezonni qayta bajaring.",
      preconditions: "Do‘kon ochiq.",
      testData: "Sinov ma’lumotlari",
    },
  ];
  await importBackup(
    page,
    { version: 1, activeId: fixture.id, sessions: [fixture] },
    fixture.name,
  );
  await nav(page, "Natija va retest");
  await submit(page);
  await panel(page)
    .getByRole("button", { name: "Ko‘rib chiqish kerak", exact: true })
    .click();
  const rows = panel(page).getByRole("table").locator("tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Zid holatlar — ball yo‘q");
  await expect(rows.nth(1)).toContainText("Namuna — hisoblanmagan");
  await expect(rows.nth(1)).not.toContainText("Zid holatlar — ball yo‘q");
  await expect(rows.nth(2)).toContainText("Zid holatlar — ball yo‘q");
  await panel(page)
    .getByRole("button", { name: "To‘g‘ri", exact: true })
    .click();
  await expect(rows).toHaveCount(13);
  const exported = await download(page, () =>
    panel(page).getByRole("button", { name: "Bahoni yuklash" }).click(),
  );
  expect(exported.text).toContain("Zid holatlar — ball yo‘q");
});

test("old grading snapshots stay in history and prompt a fresh score after rubric fixes", async ({
  page,
}) => {
  await openExercise(page);
  const fixture = completedFixture(
    active(await stored(page)),
    "Eski bahoni yangilash",
  );
  fixture.fixedBugIds = fixture.scenario.bugs.map((bug) => bug.id);
  fixture.checklist = [{ ...fixture.checklist[0], status: "Failed" }];
  fixture.cases = [];
  fixture.reports = [];
  const oldAttempt = createAssessment(fixture, {
    id: "old-rubric-attempt",
    createdAt: "2026-10-07T10:00:00.000Z",
  });
  oldAttempt.fingerprint = oldAttempt.fingerprint.replace(
    "grade-v2-",
    "grade-v1-",
  );
  oldAttempt.dimensions.find((dimension) => dimension.id === "findings").score =
    25;
  oldAttempt.dimensions.find(
    (dimension) => dimension.id === "documentation",
  ).score = 15;
  oldAttempt.score = 40;
  fixture.assessments = [oldAttempt];
  fixture.reviewUnlocked = true;
  await importBackup(
    page,
    { version: 1, activeId: fixture.id, sessions: [fixture] },
    fixture.name,
  );
  await nav(page, "Natija va retest");
  await expect(panel(page).locator(".assessment-total strong")).toHaveText(
    "40",
  );
  await expect(panel(page).getByRole("status")).toContainText(
    "baholash qoidalari o‘zgargan",
  );
  await submit(page);
  await expect(panel(page).locator(".assessment-total strong")).toHaveText("0");
  const persisted = active(await stored(page));
  expect(persisted.assessments).toHaveLength(2);
  expect(persisted.assessments[0]).toEqual(oldAttempt);
  expect(persisted.assessments[1].fingerprint).toMatch(/^grade-v2-/);
});

test("large assessment pages every result and report while exports retain all records", async ({
  page,
}) => {
  await openExercise(page);
  const fixture = completedFixture(
    active(await stored(page)),
    "1000 natijali mashq",
  );
  const originals = [...fixture.checklist];
  fixture.checklist = Array.from({ length: 1000 }, (_, index) => ({
    ...originals[index % originals.length],
    id: `large-check-${index}`,
    title: `Tekshiruv ${String(index + 1).padStart(4, "0")}`,
  }));
  fixture.checklist[999].checkId = "";
  const originalReport = fixture.reports[0];
  fixture.reports = Array.from({ length: 101 }, (_, index) => ({
    ...originalReport,
    id: `large-report-${index}`,
    title: `Report ${String(index + 1).padStart(4, "0")}`,
  }));
  await importBackup(
    page,
    { version: 1, activeId: fixture.id, sessions: [fixture] },
    fixture.name,
  );
  await nav(page, "Natija va retest");
  await submit(page);
  const resultTable = panel(page).getByRole("table").first();
  const pager = panel(page).getByRole("navigation", {
    name: "Baholash natijalari sahifalari",
  });
  await expect(resultTable.locator("tbody tr")).toHaveCount(50);
  await expect(pager).toContainText("1–50 / 1000 yozuv");
  await pager.getByRole("button", { name: "Oxirgi", exact: true }).click();
  await expect(pager).toContainText("951–1000 / 1000 yozuv");
  await expect(resultTable).toContainText("Tekshiruv 1000");
  await expect(
    panel(page)
      .locator("summary")
      .filter({ hasText: "Belgilagan natijalaringiz" }),
  ).toBeFocused();
  await page
    .getByLabel("Tester xulosasi", { exact: true })
    .fill(
      "Barcha mezonlar tekshirildi. Izoh yozish natija sahifasini almashtirmaydi.",
    );
  await expect(pager).toContainText("951–1000 / 1000 yozuv");
  await panel(page)
    .getByRole("button", { name: "Ko‘rib chiqish kerak", exact: true })
    .click();
  await expect(resultTable.locator("tbody tr")).toHaveCount(1);
  await expect(resultTable).toContainText("Tekshiruv 1000");
  await expect(pager).toHaveCount(0);
  await panel(page)
    .getByRole("button", { name: "Hammasi", exact: true })
    .click();
  await expect(pager).toContainText("1–50 / 1000 yozuv");
  const reportSummary = panel(page)
    .locator("summary")
    .filter({ hasText: "Reportlar bo‘yicha izoh" });
  await reportSummary.click();
  await expect(panel(page).locator(".assessment-report")).toHaveCount(50);
  const reportPager = panel(page).getByRole("navigation", {
    name: "Report izohlari sahifalari",
  });
  await reportPager
    .getByRole("button", { name: "Oxirgi", exact: true })
    .click();
  await expect(panel(page).locator(".assessment-report")).toHaveCount(1);
  await expect(panel(page).locator(".assessment-report")).toContainText(
    "Report 0101",
  );
  await expect(reportSummary).toBeFocused();
  const result = await download(page, () =>
    panel(page).getByRole("button", { name: "Bahoni yuklash" }).click(),
  );
  expect(result.text).toContain("Tekshiruv 0001");
  expect(result.text).toContain("Tekshiruv 1000");
  expect(result.text).toContain("Report 0001");
  expect(result.text).toContain("Report 0101");
  expect(result.text.match(/- Tekshiruv \d{4}/g) || []).toHaveLength(1000);
});

test("closing and reopening an unfixed report updates the next grade and preserves prior attempts", async ({
  page,
}) => {
  await openExercise(page);
  const fixture = completedFixture(
    active(await stored(page)),
    "Report holati bilan qayta baholash",
  );
  const target = fixture.reports[0];
  await importBackup(
    page,
    { version: 1, activeId: fixture.id, sessions: [fixture] },
    fixture.name,
  );
  await nav(page, "Natija va retest");
  await submit(page);
  const first = active(await stored(page)).assessments[0];
  expect(first.score).toBe(100);
  await nav(page, "Bug-report’lar");
  await page
    .getByLabel(`${target.title}: holati`, { exact: true })
    .selectOption("Closed");
  await nav(page, "Natija va retest");
  await expect(panel(page).getByRole("status")).toContainText(
    "Bu bahodan keyin",
  );
  await submit(page);
  const afterClosing = active(await stored(page));
  expect(afterClosing.assessments[0]).toEqual(first);
  const closedAttempt = afterClosing.assessments.at(-1);
  expect(closedAttempt.score).toBeLessThan(100);
  expect(
    closedAttempt.reports.find((report) => report.id === target.id).verdict,
  ).toBe("closed");
  expect(closedAttempt.missedCheckIds).toContain(target.checkId);
  await nav(page, "Bug-report’lar");
  await page
    .getByLabel(`${target.title}: holati`, { exact: true })
    .selectOption("Reopened");
  await nav(page, "Natija va retest");
  await submit(page);
  const final = active(await stored(page));
  expect(final.assessments).toHaveLength(3);
  expect(final.assessments[0]).toEqual(first);
  expect(final.assessments[1]).toEqual(closedAttempt);
  expect(final.assessments[2].score).toBe(100);
  expect(
    final.assessments[2].reports.find((report) => report.id === target.id)
      .verdict,
  ).toBe("matched");
});

test("partial repairs grade only their changed criteria and active report lifecycle", async ({
  page,
}) => {
  await openExercise(page);
  const fixture = completedFixture(
    active(await stored(page)),
    "Qisman tuzatilgan mashq",
  );
  fixture.fixedBugIds = fixture.scenario.bugs.slice(0, 2).map((bug) => bug.id);
  fixture.reviewUnlocked = true;
  const fixedCheckIds = fixture.fixedBugIds.map((id) =>
    id.replace("BUG-", "AT-"),
  );
  const fixedReports = fixture.reports.filter((report) =>
    fixedCheckIds.includes(report.checkId),
  );
  const fixedChecks = fixture.checklist.filter((check) =>
    fixedCheckIds.includes(check.checkId),
  );
  expect(fixedReports).toHaveLength(2);
  await importBackup(
    page,
    { version: 1, activeId: fixture.id, sessions: [fixture] },
    fixture.name,
  );
  await nav(page, "Natija va retest");
  await submit(page);
  const first = active(await stored(page)).assessments[0];
  expect(first.build.fixedBugIds).toEqual(fixture.fixedBugIds);
  expect(first.summary.wrong).toBe(2);
  expect(first.summary.totalFindings).toBe(fixture.scenario.bugs.length - 2);
  for (const report of fixedReports)
    expect(first.reports.find((row) => row.id === report.id).verdict).toBe(
      "not-failing",
    );
  await nav(page, "Checklist");
  for (const check of fixedChecks)
    await page
      .getByLabel(`${check.title}: holati`, { exact: true })
      .selectOption("Passed");
  await nav(page, "Bug-report’lar");
  for (const report of fixedReports)
    await page
      .getByLabel(`${report.title}: holati`, { exact: true })
      .selectOption("Closed");
  await nav(page, "Natija va retest");
  await submit(page);
  const second = active(await stored(page)).assessments.at(-1);
  expect(second.score).toBe(100);
  expect(second.summary.wrong).toBe(0);
  expect(second.summary.matchedFindings).toBe(fixture.scenario.bugs.length - 2);
  await nav(page, "Bug-report’lar");
  await page
    .getByLabel(`${fixedReports[0].title}: holati`, { exact: true })
    .selectOption("Reopened");
  await nav(page, "Natija va retest");
  await submit(page);
  const final = active(await stored(page));
  expect(final.assessments[0]).toEqual(first);
  expect(final.assessments[1]).toEqual(second);
  const reopened = final.assessments.at(-1);
  expect(reopened.score).toBeLessThan(100);
  expect(
    reopened.reports.find((row) => row.id === fixedReports[0].id).verdict,
  ).toBe("not-failing");
  expect(final.fixedBugIds).toEqual(fixture.fixedBugIds);
});

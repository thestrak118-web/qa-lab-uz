import { runChecks } from "./checks.js";
import { isSampleDocument } from "./practice.js";
const emptyEnvironmentTemplate = (value) =>
  value
    .replace(/\s/g, "")
    .replaceAll("…", "...")
    .replace(/[‘’ʻʼ']/g, "'")
    .toLowerCase() === "brauzer:.../os:.../ekrano'lchami:...";
const filled = (value) =>
  Array.isArray(value)
    ? value.some(filled)
    : typeof value === "string" &&
      value.trim().length > 0 &&
      !emptyEnvironmentTemplate(value);
const rounded = (value) => Math.round(value * 10) / 10;

// Increment when grading rules change so saved scores invite a fresh submission.
// This is independent from the assessment snapshot's storage schema version.
const GRADING_REVISION = 2;

/** Change detector, not a cryptographic signature or a certification mechanism. */
export function assessmentFingerprint(session) {
  const docs = (items) =>
    items.map(({ evidence, ...item }) => ({
      ...item,
      evidence: evidence?.map(({ id, name, type }) => ({ id, name, type })),
    }));
  const input = JSON.stringify({
    version: GRADING_REVISION,
    scenario: session.scenario,
    fixedBugIds: [...session.fixedBugIds].sort(),
    checklist: docs(session.checklist),
    cases: docs(session.cases),
    reports: docs(session.reports),
  });
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++)
    hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  return `grade-v${GRADING_REVISION}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/** Grade explicit, concrete claims. Free text is checked for presence, not truth. */
export function createAssessment(session, options = {}) {
  const checks = runChecks(session.scenario, session.fixedBugIds);
  const byId = new Map(checks.map((check) => [check.id, check]));
  const available = checks.filter((check) => check.status !== "Unavailable");
  const failing = available.filter((check) => check.status === "Failed");
  const comparisons = ["checklist", "cases"].flatMap((kind) =>
    session[kind].map((item) => {
      const check = byId.get(item.checkId);
      const row = {
        id: item.id,
        kind,
        title: item.title,
        checkId: item.checkId || "",
        claimedStatus: item.status,
        expectedStatus: check?.status || null,
      };
      if (isSampleDocument(item))
        return {
          ...row,
          verdict: "sample",
          detail: "Namuna yozuvi ballga kiritilmaydi.",
        };
      if (!check || item.requirementId !== check.requirementId)
        return {
          ...row,
          verdict: "unlinked",
          detail:
            "Tahrirlashda mos talab va aniq avto baholash mezonini tanlang. Faqat talab ID’si yetarli emas.",
        };
      if (check.status === "Unavailable")
        return {
          ...row,
          verdict: "unavailable",
          detail:
            "Bu mezon uchun zarur test ma’lumoti yo‘q; natija baholanmadi.",
        };
      if (!["Passed", "Failed"].includes(item.status))
        return {
          ...row,
          verdict: "unmarked",
          detail:
            item.status === "Blocked"
              ? "To‘siqli test bajarilgan natija hisoblanmaydi; to‘siqni bartaraf qilib qayta tekshiring."
              : "Tekshiruv natijasi hali belgilanmagan.",
        };
      return {
        ...row,
        verdict: item.status === check.status ? "correct" : "wrong",
        detail:
          item.status === check.status
            ? "Belgilangan holat avtomatik tekshiruv natijasiga mos."
            : "Belgilangan holat mos kelmadi. Shu mezondagi kutilgan va haqiqiy natijani solishtiring.",
      };
    }),
  );
  const groups = available.map((check) => ({
    check,
    claims: comparisons.filter(
      (row) =>
        row.checkId === check.id && ["correct", "wrong"].includes(row.verdict),
    ),
  }));
  const conflicted = groups.filter(
    ({ claims }) => new Set(claims.map((row) => row.claimedStatus)).size > 1,
  ).length;
  const correct = groups.filter(
    ({ claims }) =>
      claims.length && claims.every((row) => row.verdict === "correct"),
  ).length;
  const wrong = groups.filter(
    ({ claims }) =>
      claims.length && claims.every((row) => row.verdict === "wrong"),
  ).length;

  const reportFields = [
    ["title", "Sarlavha"],
    ["steps", "Takrorlash qadamlari"],
    ["expected", "Kutilgan natija"],
    ["actual", "Haqiqiy natija"],
    ["environment", "Muhit"],
    ["requirementId", "Bog‘liq talab"],
    ["checkId", "Avto baholash mezoni"],
  ];
  const reports = session.reports.map((item) => {
    const check = byId.get(item.checkId);
    const missing = reportFields
      .filter(([key]) => !filled(item[key]))
      .map(([, label]) => label);
    const row = {
      id: item.id,
      title: item.title,
      checkId: item.checkId || "",
      missing,
    };
    if (isSampleDocument(item))
      return {
        ...row,
        verdict: "sample",
        detail: "Namuna ballga kiritilmaydi.",
      };
    if (item.status === "Closed")
      return {
        ...row,
        verdict: "closed",
        detail:
          "Yopilgan report tarixda qoladi; joriy build uchun faol xato da’vosi hisoblanmaydi.",
      };
    if (!check || item.requirementId !== check.requirementId)
      return {
        ...row,
        verdict: "unlinked",
        detail: "Reportni aniq avto mezon va uning talabiga bog‘lang.",
      };
    if (check.status === "Unavailable")
      return {
        ...row,
        verdict: "unavailable",
        detail: "Bu xato da’vosini tekshirish uchun zarur test ma’lumoti yo‘q.",
      };
    if (check.status === "Passed")
      return {
        ...row,
        verdict: "not-failing",
        detail:
          "Tanlangan mezon joriy build’da o‘tdi. Boshqa holatni topgan bo‘lsangiz, u bu avtomatik mezon bilan tasdiqlanmaydi.",
      };
    if (missing.length)
      return {
        ...row,
        verdict: "incomplete",
        detail:
          "Mezon xatoni ko‘rsatdi, ammo reportning zarur maydonlari to‘liq emas. Bo‘sh maydon yoki o‘zgartirilmagan muhit shablonini to‘ldiring.",
      };
    return {
      ...row,
      verdict: "matched",
      detail:
        "Tanlangan mezonda xato bor va zarur maydonlar to‘ldirilgan. Matn va screenshot mazmuni avtomatik tasdiqlanmadi.",
    };
  });
  const activeReports = reports.filter(
    (row) => !["closed", "sample"].includes(row.verdict),
  );
  const supported = new Set(
    activeReports
      .filter((row) => row.verdict === "matched")
      .map((row) => row.checkId),
  );
  const claims = new Set(
    activeReports
      .filter((row) => row.verdict !== "unavailable")
      .map((row) =>
        row.verdict === "unlinked" ? `unlinked:${row.id}` : row.checkId,
      ),
  );
  const precision = claims.size ? supported.size / claims.size : 1;
  // An untested clean build is not evidence that no reports were needed.
  // Credit for the absence of defects grows with correctly completed checks.
  const verifiedCoverage = available.length ? correct / available.length : 0;
  const recall = failing.length
    ? supported.size / failing.length
    : verifiedCoverage;
  const documentGroups = new Map();
  for (const row of activeReports) {
    const key = row.verdict === "unlinked" ? `unlinked:${row.id}` : row.checkId;
    const value =
      (reportFields.length - row.missing.length) / reportFields.length;
    documentGroups.set(key, Math.min(documentGroups.get(key) ?? 1, value));
  }
  const completeness = documentGroups.size
    ? [...documentGroups.values()].reduce((sum, value) => sum + value, 0) /
      documentGroups.size
    : failing.length
      ? 0
      : verifiedCoverage;
  const hasWork =
    comparisons.some((row) => ["correct", "wrong"].includes(row.verdict)) ||
    activeReports.length > 0;
  const dimensions = [
    {
      id: "statuses",
      label: "Holatlarning mosligi",
      max: 60,
      score: rounded(available.length ? (60 * correct) / available.length : 0),
      detail: `${correct}/${available.length} aniq mezon to‘g‘ri belgilangan. Takroriy yozuvlar qo‘shimcha ball bermaydi; zid holatlar hisoblanmaydi.`,
    },
    {
      id: "findings",
      label: "Reportlarning mezonga mosligi",
      max: 25,
      score: rounded(available.length && hasWork ? 25 * recall * precision : 0),
      detail: failing.length
        ? `${supported.size}/${failing.length} xatoli mezonga to‘liq faol report bog‘langan. Bog‘lanmagan, to‘liq bo‘lmagan yoki bu build’da tasdiqlanmagan da’volar ballni kamaytiradi.`
        : `Bu build’da xatoli mezon yo‘q. Report yozmaslik uchun ball ${correct}/${available.length} to‘g‘ri bajarilgan mezon ulushiga beriladi; tasdiqlanmagan xato da’volari ballni kamaytiradi.`,
    },
    {
      id: "documentation",
      label: "Report maydonlari to‘liqligi",
      max: 15,
      score: rounded(available.length && hasWork ? 15 * completeness : 0),
      detail:
        !activeReports.length && !failing.length
          ? `Xatosiz build’da report talab qilinmaydi. Ball ${correct}/${available.length} to‘g‘ri bajarilgan mezon ulushiga beriladi.`
          : "7 zarur maydonning to‘ldirilganligi. Yozilgan matnning ma’nosi va dalilning ishonchliligi baholanmaydi.",
    },
  ];
  return {
    id: options.id || globalThis.crypto.randomUUID(),
    version: 1,
    createdAt: options.createdAt || new Date().toISOString(),
    fingerprint: assessmentFingerprint(session),
    score: Math.round(dimensions.reduce((sum, item) => sum + item.score, 0)),
    mode: session.reviewUnlocked ? "practice" : "first",
    build: {
      label: session.fixedBugIds.length ? "1.1" : "1.0",
      fixedBugIds: [...session.fixedBugIds],
    },
    dimensions,
    summary: {
      correct,
      wrong,
      unmarked: available.length - correct - wrong - conflicted,
      conflicted,
      available: available.length,
      totalChecks: checks.length,
      matchedFindings: supported.size,
      totalFindings: failing.length,
      unlinkedDocuments:
        comparisons.filter((row) => row.verdict === "unlinked").length +
        reports.filter((row) => row.verdict === "unlinked").length,
    },
    checks,
    comparisons,
    reports,
    missedCheckIds: failing
      .filter((check) => !supported.has(check.id))
      .map((check) => check.id),
  };
}

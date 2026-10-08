import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CircleHelp,
  ClipboardCheck,
  Download,
  Send,
  X,
} from "lucide-react";
import "../assessment.css";

const PAGE_SIZE = 50;
const EMPTY_ATTEMPTS = [];

const STATUS_LABELS = {
  "Not run": "Tekshirilmagan",
  Passed: "O‘tdi",
  Failed: "Xato bor",
  Blocked: "To‘siq bor",
};
const VERDICT_LABELS = {
  correct: "To‘g‘ri",
  wrong: "Mos kelmadi",
  ungraded: "Baholanmagan",
  "not-run": "Tekshirilmagan",
  blocked: "To‘siq bor",
  unmarked: "Tekshirilmagan",
  unlinked: "Mezon tanlanmagan",
  unavailable: "Baholab bo‘lmadi",
  sample: "Namuna — hisoblanmagan",
};
const dateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const readable = (value) => {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ha" : "Yo‘q";
  return typeof value === "string" ? value : JSON.stringify(value);
};

function conflictingCheckIds(attempt) {
  return new Set(
    attempt.checks
      .filter(
        (check) =>
          new Set(
            attempt.comparisons
              .filter(
                (row) =>
                  row.checkId === check.id &&
                  ["correct", "wrong"].includes(row.verdict),
              )
              .map((row) => row.claimedStatus),
          ).size > 1,
      )
      .map((check) => check.id),
  );
}

const isConflictingClaim = (item, conflicting) =>
  ["correct", "wrong"].includes(item.verdict) && conflicting.has(item.checkId);
const CONFLICT_DETAIL =
  "Shu mezonga boshqa yozuvda qarama-qarshi holat qo‘yilgan. Barcha natijalarni tekshirib, ziddiyatni tuzating.";

function Verdict({ value, label }) {
  const Icon = value === "correct" ? Check : value === "wrong" ? X : CircleHelp;
  return (
    <span
      className={`assessment-label assessment-label-${value || "ungraded"}`}
    >
      <Icon size={12} aria-hidden="true" />
      {label || VERDICT_LABELS[value] || "Baholanmagan"}
    </span>
  );
}

export default function Assessment({ session, onSubmit, isStale = false }) {
  const attempts = session.assessments || EMPTY_ATTEMPTS;
  const latest = attempts.at(-1);
  const [selectedId, setSelectedId] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const confirmRef = useRef(null);
  const actionRef = useRef(null);
  const historyRef = useRef(null);
  const restoreFocus = useRef(false);
  const attempt = attempts.find((item) => item.id === selectedId) || latest;
  const history = useMemo(() => [...attempts].reverse(), [attempts]);
  const historyPageCount = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const historyCurrentPage = Math.min(historyPage, historyPageCount);
  const historyStart = (historyCurrentPage - 1) * PAGE_SIZE;
  const showLatest = useCallback(() => {
    setSelectedId(null);
    actionRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedId(null);
    setConfirming(false);
    setError("");
  }, [session.id]);
  useEffect(() => {
    setSelectedId(null);
    setHistoryPage(1);
  }, [latest?.id]);
  useEffect(() => {
    if (confirming) {
      restoreFocus.current = true;
      confirmRef.current?.focus();
    } else if (!submitting && restoreFocus.current) {
      // Restore only after React has enabled the trigger again.
      actionRef.current?.focus();
      restoreFocus.current = false;
    }
  }, [confirming, submitting]);

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      await onSubmit();
      setConfirming(false);
      setSelectedId(null);
    } catch {
      setError(
        "Baholash saqlanmadi. Qayta urinib ko‘ring; yozgan ishlaringiz o‘chirilmaydi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="assessment-panel" aria-labelledby="assessment-heading">
      <div className="assessment-header">
        <div>
          <span className="assessment-eyebrow">MASHQ NATIJASI</span>
          <h2 id="assessment-heading">Avtomatik baholash</h2>
          <p>
            Tekshiruvlaringiz natijasini labning nazorat testlari bilan
            solishtiring. Har topshirish alohida urinish sifatida saqlanadi.
          </p>
        </div>
        <button
          ref={actionRef}
          className="btn btn-primary"
          onClick={() => {
            setError("");
            setConfirming(true);
          }}
          disabled={confirming || submitting}
        >
          <Send size={15} aria-hidden="true" />{" "}
          {latest ? "Qayta topshirish" : "Mashqni topshirish"}
        </button>
      </div>
      <div className="assessment-body">
        {confirming && (
          <div
            className="assessment-confirm"
            role="region"
            aria-labelledby="assessment-confirm-heading"
          >
            <h3 id="assessment-confirm-heading">
              Mashqni topshirishga tayyormisiz?
            </h3>
            <p>
              Hozirgi checklist, test-case va reportlaringiz baholanadi. Nazorat
              testlarining javoblari ham ochiladi. Keyin ishni davom ettirib,
              qayta topshirishingiz mumkin; oldingi baho saqlanadi.
            </p>
            <div className="assessment-confirm-actions">
              <button
                ref={confirmRef}
                className="btn btn-primary"
                onClick={submit}
                disabled={submitting}
              >
                <ClipboardCheck size={15} aria-hidden="true" />{" "}
                {submitting ? "Baholanmoqda…" : "Topshirish va baholash"}
              </button>
              <button
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => {
                  setConfirming(false);
                }}
              >
                Hali tayyor emasman
              </button>
            </div>
            {error && (
              <p className="assessment-error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
        {!attempt ? (
          <AssessmentIntro />
        ) : (
          <AttemptResult
            key={attempt.id}
            attempt={attempt}
            isStale={isStale && attempt.id === latest?.id}
            historical={attempt.id !== latest?.id}
            onLatest={showLatest}
          />
        )}
        {attempts.length > 0 && (
          <details className="assessment-disclosure" ref={historyRef}>
            <summary>
              Urinishlar tarixi <small>{attempts.length} ta</small>
            </summary>
            <div className="assessment-history">
              {history
                .slice(historyStart, historyStart + PAGE_SIZE)
                .map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    aria-pressed={attempt?.id === item.id}
                  >
                    <strong>
                      {attempts.length - historyStart - index}-urinish ·{" "}
                      {item.score}/100
                    </strong>
                    <small>{dateLabel(item.createdAt)}</small>
                    <small>
                      Build {item.build.label}
                      {item.mode === "practice"
                        ? " · Javoblar ochilgan"
                        : " · Mustaqil"}
                    </small>
                  </button>
                ))}
            </div>
            <AssessmentPager
              label="Urinishlar tarixi sahifalari"
              page={historyCurrentPage}
              count={historyPageCount}
              total={history.length}
              onChange={(page) => {
                setHistoryPage(page);
                historyRef.current
                  ?.querySelector("summary")
                  ?.focus({ preventScroll: true });
                historyRef.current?.scrollIntoView({ block: "start" });
              }}
            />
          </details>
        )}
        <p className="assessment-note assessment-limits">
          Bu o‘quv bahosi. Report matni va screenshot mazmunining to‘g‘riligi
          avtomatik tasdiqlanmaydi. Baholash brauzerning o‘zida ishlaydi.
        </p>
      </div>
    </section>
  );
}

function AssessmentIntro() {
  return (
    <div className="assessment-rubric">
      <div>
        <strong>Natijalar mosligi · 60 ball</strong>
        <p>
          “Avto baholash mezoni” tanlangan tekshiruvlardagi holatlar
          solishtiriladi. Bir mezonni takror yozish qo‘shimcha ball bermaydi.
        </p>
      </div>
      <div>
        <strong>Xatolarni qayd qilish · 25 ball</strong>
        <p>
          Xato chiqqan mezonga bog‘langan to‘liq reportlar hisoblanadi. Xatosiz
          mezonga yozilgan report bahoni pasaytiradi. Xatosiz build’da ball
          to‘g‘ri bajarilgan mezonlar ulushiga beriladi.
        </p>
      </div>
      <div>
        <strong>Report to‘liqligi · 15 ball</strong>
        <p>
          Qadamlar, kutilgan va haqiqiy natija kabi maydonlarni to‘ldirganingiz
          tekshiriladi.
        </p>
      </div>
    </div>
  );
}

function exportAttempt(attempt) {
  const conflicting = conflictingCheckIds(attempt);
  const lines = [
    "# QA Lab — avtomatik baholash",
    "",
    `Sana: ${dateLabel(attempt.createdAt)}`,
    `Build: ${attempt.build.label}`,
    `Baho: ${attempt.score}/100`,
    `Urinish: ${attempt.mode === "practice" ? "Javoblar ochilgandan keyingi mashq" : "Mustaqil topshirish"}`,
    "",
    "## Ball taqsimoti",
    ...attempt.dimensions.map(
      (dimension) =>
        `- ${dimension.label}: ${dimension.score}/${dimension.max}. ${dimension.detail}`,
    ),
    "",
    "## Sizning tekshiruvlaringiz",
    ...attempt.comparisons.map(
      (item) =>
        `- ${item.title} (${item.checkId || "Mezon tanlanmagan"}): ${STATUS_LABELS[item.claimedStatus] || item.claimedStatus}. ${isConflictingClaim(item, conflicting) ? "Zid holatlar — ball yo‘q" : VERDICT_LABELS[item.verdict] || item.verdict}. ${isConflictingClaim(item, conflicting) ? CONFLICT_DETAIL : item.detail}`,
    ),
    "",
    "## Reportlar",
    ...attempt.reports.map(
      (item) =>
        `- ${item.title} (${item.checkId || "Mezon tanlanmagan"}): ${item.detail}${item.missing.length ? ` Yetishmaydi: ${item.missing.join(", ")}.` : ""}`,
    ),
    "",
    "## Nazorat testlari",
    ...attempt.checks.flatMap((check) => [
      `### ${check.id} — ${check.title}`,
      `Talab: ${check.requirementId}; natija: ${STATUS_LABELS[check.status] || check.status}`,
      `Kutilgan: ${readable(check.expected)}`,
      `Amalda: ${readable(check.actual)}`,
      "",
    ]),
    "Report matni va screenshot mazmunining to‘g‘riligi avtomatik tasdiqlanmagan. Bu o‘quv bahosi.",
  ];
  const url = URL.createObjectURL(
    new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `qa-baho-${attempt.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60)}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const AttemptResult = memo(function AttemptResult({
  attempt,
  isStale,
  historical,
  onLatest,
}) {
  const [filter, setFilter] = useState("all");
  const [comparisonPage, setComparisonPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  const comparisonsRef = useRef(null);
  const reportsRef = useRef(null);
  const conflicting = useMemo(() => conflictingCheckIds(attempt), [attempt]);
  const visibleComparisons = useMemo(
    () =>
      attempt.comparisons.filter(
        (item) =>
          filter === "all" ||
          (filter === "attention"
            ? item.verdict !== "correct" ||
              isConflictingClaim(item, conflicting)
            : item.verdict === filter &&
              !isConflictingClaim(item, conflicting)),
      ),
    [attempt.comparisons, filter, conflicting],
  );
  const comparisonPageCount = Math.max(
    1,
    Math.ceil(visibleComparisons.length / PAGE_SIZE),
  );
  const comparisonCurrentPage = Math.min(comparisonPage, comparisonPageCount);
  const comparisonStart = (comparisonCurrentPage - 1) * PAGE_SIZE;
  const reportPageCount = Math.max(
    1,
    Math.ceil(attempt.reports.length / PAGE_SIZE),
  );
  const reportCurrentPage = Math.min(reportPage, reportPageCount);
  const reportStart = (reportCurrentPage - 1) * PAGE_SIZE;
  const missed = useMemo(
    () =>
      attempt.checks.filter((check) =>
        attempt.missedCheckIds.includes(check.id),
      ),
    [attempt],
  );
  const reportLabels = {
    matched: "Mezon va maydonlar mos",
    incomplete: "Maydonlar to‘liq emas",
    "not-failing": "Mezonda xato yo‘q",
    unlinked: "Mezon tanlanmagan",
    closed: "Yopilgan — hisoblanmagan",
    sample: "Namuna — hisoblanmagan",
    unavailable: "Baholab bo‘lmadi",
  };
  const fieldLabels = {
    title: "Sarlavha",
    steps: "Takrorlash qadamlari",
    expected: "Kutilgan natija",
    actual: "Haqiqiy natija",
    environment: "Muhit",
    severity: "Severity",
    priority: "Priority",
    requirementId: "Talab",
    checkId: "Avto baholash mezoni",
  };
  return (
    <div className="assessment-result">
      {historical && (
        <div className="assessment-notice assessment-archive" role="status">
          <span>
            Arxivdagi urinish ko‘rsatilmoqda. Bu eng oxirgi baho emas.
          </span>
          <button className="btn btn-secondary" onClick={onLatest}>
            Oxirgi bahoni ko‘rish
          </button>
        </div>
      )}
      {isStale && (
        <p className="assessment-notice" role="status">
          Bu bahodan keyin ishlaringiz, build yoki baholash qoidalari o‘zgargan.
          Quyida topshirilgan paytdagi natija turibdi. Hozirgi ishni baholash
          uchun qayta topshiring.
        </p>
      )}
      <div className="assessment-meta">
        <span>
          Topshirilgan: <strong>{dateLabel(attempt.createdAt)}</strong>
        </span>
        <span>
          Build: <strong>{attempt.build.label}</strong>
        </span>
        <span>
          {attempt.mode === "practice"
            ? "Javoblar ochilgandan keyingi mashq"
            : "Mustaqil topshirish"}
        </span>
      </div>
      <div className="assessment-score-row" aria-label="Baholash natijasi">
        <div className="assessment-total">
          <span>Umumiy ball</span>
          <div>
            <strong>{attempt.score}</strong> / 100
          </div>
          <small>Topshirish paytidagi ishlaringiz asosida</small>
        </div>
        <div className="assessment-dimensions">
          {attempt.dimensions.map((dimension) => (
            <div className="assessment-dimension" key={dimension.id}>
              <div className="assessment-dimension-heading">
                <span>{dimension.label}</span>
                <strong>
                  {dimension.score} / {dimension.max}
                </strong>
              </div>
              <div
                className="assessment-progress"
                role="meter"
                aria-label={dimension.label}
                aria-valuemin={0}
                aria-valuemax={dimension.max}
                aria-valuenow={dimension.score}
              >
                <span
                  style={{
                    width: `${dimension.max ? Math.min(100, (dimension.score / dimension.max) * 100) : 0}%`,
                  }}
                />
              </div>
              <p>{dimension.detail}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="assessment-summary-line">
        <p>
          <strong>{attempt.summary.correct}</strong> ta mezon to‘g‘ri ·{" "}
          <strong>{attempt.summary.wrong}</strong> ta mos kelmadi ·{" "}
          <strong>{attempt.summary.unmarked}</strong> ta belgilanmagan
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => exportAttempt(attempt)}
        >
          <Download size={14} aria-hidden="true" /> Bahoni yuklash
        </button>
      </div>
      {attempt.summary.conflicted > 0 && (
        <p className="assessment-note">
          {attempt.summary.conflicted} ta mezonga qarama-qarshi holatlar
          qo‘yilgan. Bir xil mezonga bog‘langan checklist va test-case
          natijalarini tekshiring.
        </p>
      )}
      {attempt.summary.unlinkedDocuments > 0 && (
        <p className="assessment-note">
          {attempt.summary.unlinkedDocuments} ta hujjatda avto baholash mezoni
          tanlanmagan. Hujjatni tahrirlab, “Avto baholash mezoni”ni tanlang;
          faqat talabni tanlash yetarli emas.
        </p>
      )}
      <details className="assessment-disclosure" open ref={comparisonsRef}>
        <summary>
          Belgilagan natijalaringiz{" "}
          <small>{attempt.comparisons.length} ta yozuv</small>
        </summary>
        {attempt.comparisons.length ? (
          <>
            <div
              className="assessment-filters"
              aria-label="Natijalarni filtrlash"
            >
              {[
                ["all", "Hammasi"],
                ["correct", "To‘g‘ri"],
                ["attention", "Ko‘rib chiqish kerak"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => {
                    setFilter(value);
                    setComparisonPage(1);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {visibleComparisons.length ? (
              <div
                className="assessment-scroll"
                tabIndex={0}
                aria-label="Natijalar jadvali"
              >
                <p className="assessment-scroll-hint">
                  Jadvalni yon tomonga suring →
                </p>
                <table className="assessment-table">
                  <thead>
                    <tr>
                      <th scope="col">Tekshiruv</th>
                      <th scope="col">Siz belgilagan</th>
                      <th scope="col">Nazorat natijasi</th>
                      <th scope="col">Baho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleComparisons
                      .slice(comparisonStart, comparisonStart + PAGE_SIZE)
                      .map((item) => (
                        <tr key={`${item.kind}-${item.id}`}>
                          <td>
                            {item.title}
                            <small>
                              {item.kind === "checklist"
                                ? "Checklist"
                                : "Test-case"}{" "}
                              · {item.checkId || "Mezon tanlanmagan"}
                            </small>
                          </td>
                          <td>
                            {STATUS_LABELS[item.claimedStatus] ||
                              item.claimedStatus}
                          </td>
                          <td>
                            {STATUS_LABELS[item.expectedStatus] ||
                              (item.expectedStatus === "Unavailable"
                                ? "Tekshirib bo‘lmadi"
                                : "—")}
                          </td>
                          <td>
                            <Verdict
                              value={
                                isConflictingClaim(item, conflicting)
                                  ? "ungraded"
                                  : item.verdict
                              }
                              label={
                                isConflictingClaim(item, conflicting)
                                  ? "Zid holatlar — ball yo‘q"
                                  : item.verdict === "unmarked"
                                    ? STATUS_LABELS[item.claimedStatus]
                                    : undefined
                              }
                            />
                            <p>
                              {isConflictingClaim(item, conflicting)
                                ? CONFLICT_DETAIL
                                : item.detail}
                            </p>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="assessment-empty">Bu filtrga mos yozuv yo‘q.</p>
            )}
            <AssessmentPager
              label="Baholash natijalari sahifalari"
              page={comparisonCurrentPage}
              count={comparisonPageCount}
              total={visibleComparisons.length}
              onChange={(page) => {
                setComparisonPage(page);
                comparisonsRef.current
                  ?.querySelector("summary")
                  ?.focus({ preventScroll: true });
                comparisonsRef.current?.scrollIntoView({ block: "start" });
              }}
            />
          </>
        ) : (
          <p className="assessment-empty">
            Hali checklist yoki test-case yozilmagan. Tekshiruv yarating,
            mezonni tanlang va do‘konda bajargach natijasini belgilang.
          </p>
        )}
      </details>
      <details className="assessment-disclosure" ref={reportsRef}>
        <summary>
          Reportlar bo‘yicha izoh{" "}
          <small>
            {attempt.summary.matchedFindings}/{attempt.summary.totalFindings}{" "}
            xato mezoni qayd qilingan
          </small>
        </summary>
        <p>
          Mezon va maydonlar mosligi tekshiriladi. “Mos” belgisi report matni
          yoki screenshot haqiqiy xatoni isbotlashini tasdiqlamaydi.
        </p>
        {attempt.reports.length ? (
          <div className="assessment-report-list">
            {attempt.reports
              .slice(reportStart, reportStart + PAGE_SIZE)
              .map((report) => (
                <article className="assessment-report" key={report.id}>
                  <div className="assessment-report-heading">
                    <h4>{report.title || "Nomsiz report"}</h4>
                    <Verdict
                      value={
                        report.verdict === "matched"
                          ? "correct"
                          : report.verdict === "not-failing"
                            ? "wrong"
                            : "ungraded"
                      }
                      label={reportLabels[report.verdict]}
                    />
                  </div>
                  <p>
                    {report.checkId || "Mezon tanlanmagan"} · {report.detail}
                  </p>
                  {report.missing.length > 0 && (
                    <p className="assessment-note">
                      Yetishmaydi:{" "}
                      {report.missing
                        .map((field) => fieldLabels[field] || field)
                        .join(", ")}
                      .
                    </p>
                  )}
                </article>
              ))}
          </div>
        ) : (
          <p className="assessment-empty">
            Topshirish vaqtida report yozilmagan.
          </p>
        )}
        <AssessmentPager
          label="Report izohlari sahifalari"
          page={reportCurrentPage}
          count={reportPageCount}
          total={attempt.reports.length}
          onChange={(page) => {
            setReportPage(page);
            reportsRef.current
              ?.querySelector("summary")
              ?.focus({ preventScroll: true });
            reportsRef.current?.scrollIntoView({ block: "start" });
          }}
        />
        {missed.length > 0 && (
          <div className="assessment-missed">
            <h4>To‘liq report bilan qayd qilinmagan xatolar</h4>
            <ul>
              {missed.map((check) => (
                <li key={check.id}>
                  <strong>{check.id}</strong> — {check.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </details>
      <details className="assessment-disclosure">
        <summary>
          Nazorat testlari va javoblar{" "}
          <small>
            {attempt.summary.available}/{attempt.summary.totalChecks} bajarildi
          </small>
        </summary>
        <p>
          Quyidagi tekshiruvlar topshirish paytidagi build’da alohida test
          ma’lumotlari bilan bajarilgan. Ular butun interfeys va barcha mumkin
          bo‘lgan holatlarni qamramaydi.
        </p>
        <div
          className="assessment-scroll"
          tabIndex={0}
          aria-label="Nazorat testlari jadvali"
        >
          <p className="assessment-scroll-hint">
            Jadvalni yon tomonga suring →
          </p>
          <table className="assessment-table">
            <thead>
              <tr>
                <th scope="col">Mezon</th>
                <th scope="col">Kutilgan</th>
                <th scope="col">Amalda</th>
                <th scope="col">Natija</th>
              </tr>
            </thead>
            <tbody>
              {attempt.checks.map((check) => (
                <tr key={check.id}>
                  <td>
                    {check.title}
                    <small>
                      {check.id} · {check.requirementId}
                    </small>
                    <p>{check.description}</p>
                  </td>
                  <td className="assessment-value">
                    {readable(check.expected)}
                  </td>
                  <td className="assessment-value">{readable(check.actual)}</td>
                  <td>
                    <Verdict
                      value={
                        check.status === "Passed"
                          ? "correct"
                          : check.status === "Failed"
                            ? "wrong"
                            : "unavailable"
                      }
                      label={
                        STATUS_LABELS[check.status] || "Tekshirib bo‘lmadi"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {attempt.build.fixedBugIds.length > 0 && (
          <p className="assessment-fixed">
            Build’dagi tuzatishlar: {attempt.build.fixedBugIds.join(", ")}.
          </p>
        )}
      </details>
    </div>
  );
});

function AssessmentPager({ label, page, count, total, onChange }) {
  if (count <= 1) return null;
  return (
    <nav className="assessment-pager" aria-label={label}>
      <span role="status" aria-live="polite">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} /{" "}
        {total} yozuv · {page}/{count}-sahifa
      </span>
      <div>
        <button
          className="btn btn-secondary"
          disabled={page === 1}
          onClick={() => onChange(1)}
        >
          Birinchi
        </button>
        <button
          className="btn btn-secondary"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          Oldingi
        </button>
        <button
          className="btn btn-secondary"
          disabled={page === count}
          onClick={() => onChange(page + 1)}
        >
          Keyingi
        </button>
        <button
          className="btn btn-secondary"
          disabled={page === count}
          onClick={() => onChange(count)}
        >
          Oxirgi
        </button>
      </div>
    </nav>
  );
}

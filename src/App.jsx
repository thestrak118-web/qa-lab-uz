import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlaskConical,
  LayoutDashboard,
  Store,
  ListChecks,
  Files,
  Bug,
  Braces,
  ClipboardList,
  BookOpen,
  History,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  Upload,
  Menu,
  X,
  Search,
  CircleHelp,
  ShieldCheck,
  RefreshCw,
  LockKeyhole,
  CheckCircle2,
  AlertCircle,
  Circle,
  Clock3,
  Save,
  Play,
  MoreHorizontal,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { createScenario, initialProductState } from "./lib/scenario.js";
import { downloadFile, validateBackup } from "./lib/storage.js";
import { useWorkspace } from "./lib/useWorkspace.js";
import { useDialogFocus } from "./lib/useDialogFocus.js";
import Shop from "./components/Shop.jsx";
import Workspace from "./components/Workspace.jsx";
import ApiLab from "./components/ApiLab.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import PracticeGuide from "./components/PracticeGuide.jsx";
import Assessment from "./components/Assessment.jsx";
import { createAssessment, assessmentFingerprint } from "./lib/assessment.js";
import { isSampleDocument } from "./lib/practice.js";
import {
  mergeImportedSessions,
  prepareImportedSessions,
} from "./lib/importWorkspace.js";
const DIFFICULTY = {
  beginner: "Boshlang‘ich",
  standard: "Amaliyot",
  expert: "Murakkab",
};
const NAV = [
  ["overview", "Umumiy ko‘rinish", LayoutDashboard],
  ["requirements", "Talablar", ClipboardList],
  ["shop", "Demo do‘kon", Store],
  ["checklist", "Checklist", ListChecks],
  ["cases", "Test-case’lar", Files],
  ["reports", "Bug-report’lar", Bug],
  ["api", "API laboratoriya", Braces],
  ["review", "Natija va retest", ShieldCheck],
  ["history", "Mashqlar tarixi", History],
  ["guide", "Qanday ishlaydi?", BookOpen],
];
const uid = () => crypto.randomUUID();
function freshSession({
  seed = String(crypto.getRandomValues(new Uint32Array(1))[0]),
  difficulty = "standard",
  name,
} = {}) {
  const scenario = createScenario(seed, difficulty);
  return {
    id: uid(),
    seed,
    difficulty,
    name: name || `${scenario.brand} · QA mashqi`,
    createdAt: new Date().toISOString(),
    scenario,
    productState: initialProductState(scenario),
    checklist: [],
    cases: [],
    reports: [],
    activity: [],
    fixedBugIds: [],
    reviewUnlocked: false,
    findingLinks: {},
    notes: "",
    environment: `Seed ${seed} · Build 1.0 · ${window.innerWidth}×${window.innerHeight} · ${navigator.userAgent}`,
  };
}
const initial = () => {
  const s = freshSession();
  return { version: 1, activeId: s.id, sessions: [s] };
};
const date = (value) => {
  const d = new Date(value);
  const months = [
    "yan",
    "fev",
    "mar",
    "apr",
    "may",
    "iyun",
    "iyul",
    "avg",
    "sen",
    "okt",
    "noy",
    "dek",
  ];
  const pad = (number) => String(number).padStart(2, "0");
  return `${pad(d.getDate())} ${months[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export default function App() {
  const {
    data,
    setData,
    saveState,
    storageError,
    conflict,
    retrySave,
    openSaved,
    canRetry,
  } = useWorkspace(initial);
  const [page, setPage] = useState("overview"),
    [notice, setNoticeState] = useState(null),
    [newModal, setNewModal] = useState(false),
    [composeRequest, setComposeRequest] = useState(null),
    [mobile, setMobile] = useState(false),
    [compact, setCompact] = useState(
      () => window.matchMedia("(max-width: 760px)").matches,
    ),
    [reveal, setReveal] = useState(false),
    [largeImport, setLargeImport] = useState(null),
    [importing, setImporting] = useState(false);
  const fileRef = useRef(),
    sidebarRef = useRef(),
    previousPage = useRef(page),
    importModeRef = useRef(false),
    importingRef = useRef(false),
    latestData = useRef(data);
  useEffect(() => {
    latestData.current = data;
  }, [data]);
  const setNotice = (message, kind = "success") =>
    setNoticeState(message ? { message, kind } : null);
  useDialogFocus(sidebarRef, compact && mobile, () => setMobile(false));
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const change = () => {
      setCompact(media.matches);
      if (!media.matches) setMobile(false);
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (previousPage.current !== page && !composeRequest)
      document.querySelector(".page-heading h1")?.focus();
    previousPage.current = page;
  }, [page, composeRequest]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const navigate = (p) => {
    if (p === "requirements")
      setData((prev) =>
        prev
          ? {
              ...prev,
              sessions: prev.sessions.map((s) =>
                s.id === prev.activeId ? { ...s, requirementsViewed: true } : s,
              ),
            }
          : prev,
      );
    setPage(p);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  if (!data)
    return (
      <div className="loading">
        <FlaskConical size={34} />
        <h2>Laboratoriya tayyorlanmoqda…</h2>
        <p>Saqlangan mashqlaringiz ochilyapti.</p>
      </div>
    );
  const session =
    data.sessions.find((s) => s.id === data.activeId) || data.sessions[0];
  function onUpdate(patch) {
    setData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === prev.activeId
          ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) }
          : s,
      ),
    }));
  }
  function exportAll() {
    downloadFile(
      `qa-lab-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(data, null, 2),
    );
    setNotice("Barcha mashqlar va dalillar JSON zaxiraga yozildi.");
  }
  async function finishImport(file, asCopy) {
    if (importingRef.current) return;
    importingRef.current = true;
    setImporting(true);
    try {
      const imported = validateBackup(JSON.parse(await file.text()));
      const incoming = prepareImportedSessions(imported, {
        asCopy,
        reservedIds: latestData.current.sessions.map((session) => session.id),
      });
      const result = mergeImportedSessions(latestData.current, incoming);
      setData((prev) => mergeImportedSessions(prev, incoming).workspace);
      setNotice(
        `Zaxira import qilindi: ${result.added} ta ${asCopy ? "alohida nusxa" : "mashq"} qo‘shildi${result.skipped ? `, ${result.skipped} ta mavjud ID o‘tkazib yuborildi` : ""}. Mavjud mashqlar o‘zgartirilmadi.`,
      );
    } catch (e) {
      setNotice(
        e instanceof SyntaxError
          ? "JSON fayli buzilgan yoki formati noto‘g‘ri. QA Lab’dan eksport qilingan zaxira faylini tanlang."
          : e.message,
        "error",
      );
    } finally {
      importingRef.current = false;
      setImporting(false);
    }
  }
  function importAll(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || importingRef.current) return;
    const asCopy = importModeRef.current;
    if (file.size > 50 * 1024 * 1024) {
      setLargeImport({ file, asCopy });
      return;
    }
    finishImport(file, asCopy);
  }
  const title = NAV.find((n) => n[0] === page)?.[1];
  return (
    <div className="app-shell">
      <div
        className={`mobile-shade ${mobile ? "visible" : ""}`}
        data-dialog-backdrop
        aria-hidden="true"
        onClick={() => setMobile(false)}
      />
      <a className="skip-link" href="#main-content">
        Asosiy mazmunga o‘tish
      </a>
      <aside
        ref={sidebarRef}
        id="workspace-navigation"
        className={`sidebar ${mobile ? "open" : ""}`}
        inert={compact && !mobile ? true : undefined}
        aria-hidden={compact && !mobile ? true : undefined}
        aria-label="Asosiy navigatsiya"
      >
        <button
          className="icon-button mobile-menu-close"
          aria-label="Menyuni yopish"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-mark">
            <FlaskConical size={23} />
          </span>
          <span>
            QA<span className="brand-light"> Lab</span>
            <small>QA WORKSPACE</small>
          </span>
        </a>
        <button
          className="workspace-switch"
          onClick={() => navigate("history")}
        >
          <span className="workspace-avatar">
            <FolderOpen size={17} />
          </span>
          <span>
            Mashqlarim<small>{data.sessions.length} ta saqlangan mashq</small>
          </span>
          <ChevronRight size={15} />
        </button>
        <div className="nav-caption">ISH MAYDONI</div>
        <nav>
          {NAV.slice(0, 8).map(([id, label, Icon]) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => navigate(id)}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {["checklist", "cases", "reports"].includes(id) &&
                session[id].length > 0 && (
                  <span className="nav-count">{session[id].length}</span>
                )}
              {id === "shop" && <span className="live-dot" />}
            </button>
          ))}
        </nav>
        <div className="nav-caption nav-caption-second">RESURSLAR</div>
        <nav>
          {NAV.slice(8).map(([id, label, Icon]) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => navigate(id)}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="storage-label">
            <span
              className={`live-dot ${saveState === "error" ? "red" : ""}`}
            />
            {saveState === "saving"
              ? "Saqlanmoqda…"
              : saveState === "saved"
                ? "Ishlaringiz saqlangan"
                : saveState === "error"
                  ? "Saqlanmagan o‘zgarishlar bor"
                  : "Mahalliy ish maydoni"}
          </div>
          <p>
            Shu brauzerda saqlanadi.
            <br />
            Zaxirani vaqti-vaqti bilan yuklang.
          </p>
          <button onClick={exportAll}>
            <Download size={15} /> Zaxirani yuklash
          </button>
        </div>
        <div className="user-card">
          <span className="user-avatar">QA</span>
          <div>
            Mahalliy ish maydoni<small>Akkauntsiz foydalanish</small>
          </div>
          <span className="badge mini">LOCAL</span>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="inline">
            <button
              className="icon-button menu-toggle"
              aria-label="Menyu"
              aria-controls="workspace-navigation"
              aria-expanded={compact && mobile}
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Ish maydoni <ChevronRight size={14} />
              <b>{title}</b>
            </span>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <span className="local-pill">
              <span className="live-dot" /> O‘quv muhiti
            </span>
            <button
              className="icon-button"
              aria-label="Yordam"
              onClick={() => navigate("guide")}
            >
              <CircleHelp size={19} />
            </button>
            <span className="top-avatar">QA</span>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {storageError && (
            <div className="error-banner" role="alert">
              <div>{storageError}</div>
              <div className="storage-recovery-actions">
                <button onClick={exportAll}>Zaxirani yuklash</button>
                {canRetry && (
                  <button onClick={retrySave}>Saqlashni qayta urinish</button>
                )}
                {conflict && (
                  <button
                    onClick={async () => {
                      exportAll();
                      if (await openSaved()) {
                        setComposeRequest(null);
                        navigate("overview");
                        setNotice(
                          "Bu oynadagi nusxa yuklandi. Brauzerdagi eng yangi ish ochildi.",
                        );
                      }
                    }}
                  >
                    Nusxamni yuklab, yangi ishni ochish
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {session.scenario.brand} / QA mashqi
              </div>
              <h1 tabIndex={-1}>
                {page === "overview" ? "Loyiha ko‘rinishi" : title}
              </h1>
              <p>
                {page === "overview"
                  ? "Joriy mashqdagi tekshiruvlar, topilmalar va bajarilgan ishlar."
                  : `${session.name} · seed ${session.seed} · ${DIFFICULTY[session.difficulty]}`}
              </p>
            </div>
            <button
              className={`btn ${page === "overview" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setNewModal(true)}
            >
              <Plus size={17} /> Yangi mashq
            </button>
          </div>
          {page === "overview" && (
            <Overview session={session} navigate={navigate} />
          )}
          {page === "requirements" && (
            <Requirements
              session={session}
              onCompose={(tab, requirementId) => {
                setComposeRequest({ id: uid(), tab, requirementId });
                navigate(tab);
              }}
            />
          )}
          {page === "shop" && (
            <div key={session.id}>
              <div className="session-strip">
                <span>
                  <span className="live-dot" /> {session.scenario.brand} · demo
                  do‘kon
                </span>
                <span>
                  Build {session.fixedBugIds.length ? "1.1 · retest" : "1.0"}{" "}
                  <span className="separator">/</span> Seed {session.seed}
                </span>
                <button onClick={() => navigate("requirements")}>
                  Talablarni ochish <ArrowUpRight size={13} />
                </button>
              </div>
              <Shop session={session} onUpdate={onUpdate} />
            </div>
          )}
          {["checklist", "cases", "reports"].includes(page) && (
            <Workspace
              key={`${session.id}:${page}`}
              session={session}
              onUpdate={onUpdate}
              tab={page}
              composeRequest={composeRequest}
              onComposeHandled={() => setComposeRequest(null)}
            />
          )}
          {page === "api" && (
            <ApiLab key={session.id} session={session} onUpdate={onUpdate} />
          )}
          {page === "review" && (
            <Review
              session={session}
              onUpdate={onUpdate}
              onReveal={() => setReveal(true)}
              navigate={navigate}
            />
          )}
          {page === "history" && (
            <HistoryView
              data={data}
              setData={setData}
              navigate={navigate}
              exportAll={exportAll}
              importing={importing}
              onImport={(asCopy = false) => {
                importModeRef.current = asCopy;
                fileRef.current.click();
              }}
            />
          )}
          {page === "guide" && <Guide navigate={navigate} />}
          <footer className="app-footer">
            <span>
              QA Lab <span className="separator">/</span> Shaxsiy ish maydoni
            </span>
            <span>O‘quv simulyatsiyasi · haqiqiy to‘lovlar yo‘q</span>
          </footer>
        </main>
      </div>
      <input
        type="file"
        accept="application/json,.json"
        hidden
        ref={fileRef}
        onChange={importAll}
      />
      {notice && (
        <div
          className={`toast${notice.kind === "error" ? " toast-error" : ""}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.kind === "error" ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          {notice.message}
        </div>
      )}
      {largeImport && (
        <Modal
          title="Katta zaxirani import qilish"
          onClose={() => setLargeImport(null)}
        >
          <p>
            {(largeImport.file.size / 1024 / 1024).toFixed(1)} MB zaxira
            tanlandi. Uni o‘qish ko‘proq xotira va vaqt talab qilishi mumkin.
          </p>
          <p className="muted">
            {largeImport.asCopy
              ? "Mashqlar yangi ID bilan alohida nusxa sifatida qo‘shiladi."
              : "Faqat yangi ID’li mashqlar qo‘shiladi. Mavjud mashqlar o‘zgarmaydi."}
          </p>
          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setLargeImport(null)}
            >
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                const selected = largeImport;
                setLargeImport(null);
                finishImport(selected.file, selected.asCopy);
              }}
            >
              Importni davom ettirish
            </button>
          </div>
        </Modal>
      )}
      {newModal && (
        <NewSession
          onClose={() => setNewModal(false)}
          onCreate={(options) => {
            let s = freshSession(options);
            for (
              let attempt = 0;
              !options.seed &&
              s.scenario.variant === session.scenario.variant &&
              attempt < 30;
              attempt++
            )
              s = freshSession(options);
            setData((prev) => ({
              ...prev,
              activeId: s.id,
              sessions: [s, ...prev.sessions],
            }));
            setNewModal(false);
            navigate("overview");
            setNotice(
              "Yangi mashq tayyor. Oldingi ishlaringiz tarixda saqlandi.",
            );
          }}
        />
      )}
      {reveal && (
        <Modal
          title="Mashq javoblarini ochish"
          onClose={() => setReveal(false)}
        >
          <p>
            Yashirin nuqsonlar va ularni takrorlash qadamlari ochiladi. Avval
            o‘z tekshiruvlaringizni yozib tugatish tavsiya qilinadi.
          </p>
          <div className="info-note">
            Bu avtomatik baho emas. Topilmangizni dalil bilan solishtirib,
            tegishli reportga bog‘laysiz.
          </div>
          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setReveal(false)}
            >
              Davom etaman
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onUpdate({ reviewUnlocked: true });
                setReveal(false);
              }}
            >
              Javoblarni ochish
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Overview({ session, navigate }) {
  const [view, setView] = useState("cases");
  const tests = session.cases.filter((item) => !isSampleDocument(item));
  const passed = tests.filter((item) => item.status === "Passed").length;
  const failed = tests.filter((item) => item.status === "Failed").length;
  const blocked = tests.filter((item) => item.status === "Blocked").length;
  const run = passed + failed;
  const openReports = session.reports.filter(
    (item) => !isSampleDocument(item) && item.status !== "Closed",
  ).length;
  const documents = view === "cases" ? session.cases : session.reports;
  const records = [...documents]
    .sort((a, b) =>
      (b.updatedAt || b.createdAt || "").localeCompare(
        a.updatedAt || a.createdAt || "",
      ),
    )
    .slice(0, 5);
  const modules = [
    ...new Set(session.scenario.requirements.map((item) => item.module)),
  ];
  const linkedRequirements = new Set(
    [...session.checklist, ...session.cases]
      .filter((item) => !isSampleDocument(item))
      .map((item) => item.requirementId)
      .filter(Boolean),
  );
  const statusLabel = {
    "Not run": "Tekshirilmagan",
    Passed: "O‘tdi",
    Failed: "Xato bor",
    Blocked: "To‘siq bor",
    Open: "Ochiq",
    "In progress": "Tuzatilmoqda",
    "Ready for retest": "Qayta test",
    Closed: "Yopilgan",
    Reopened: "Qayta ochilgan",
  };
  const statusClass = (status) =>
    ({
      Passed: "success",
      Closed: "success",
      Failed: "danger",
      Blocked: "warning",
      Open: "neutral",
      "Not run": "neutral",
    })[status] || "neutral";
  return (
    <>
      <section className="project-strip">
        <span className="project-icon">
          <Store size={24} />
        </span>
        <div className="project-name">
          <h2>{session.name}</h2>
          <p>
            Web ilova <span>·</span> {DIFFICULTY[session.difficulty]}{" "}
            <span>·</span> {date(session.createdAt)}
          </p>
        </div>
        <span className="build-label">
          Build {session.fixedBugIds.length ? "1.1" : "1.0"}
        </span>
        <button className="btn btn-primary" onClick={() => navigate("shop")}>
          Do‘konni ochish <ArrowUpRight size={16} />
        </button>
      </section>
      <PracticeGuide session={session} navigate={navigate} />
      <section className="metrics-strip" aria-label="Mashq statistikasi">
        <button onClick={() => navigate("cases")}>
          <span>Test-case’lar</span>
          <div>
            <strong>{session.cases.length}</strong>
            <small>
              {run} bajarilgan · {blocked} to‘siqli
            </small>
          </div>
        </button>
        <button onClick={() => navigate("checklist")}>
          <span>Checklist</span>
          <div>
            <strong>{session.checklist.length}</strong>
            <small>
              {
                session.checklist.filter(
                  (item) => !isSampleDocument(item) && item.status === "Passed",
                ).length
              }{" "}
              o‘tgan tekshiruv
            </small>
          </div>
        </button>
        <button onClick={() => navigate("reports")}>
          <span>Ochiq bug-reportlar</span>
          <div>
            <strong>{openReports}</strong>
            <small>{session.reports.length} jami hisobot</small>
          </div>
        </button>
        <button onClick={() => navigate("review")}>
          <span>Test-case natijalari</span>
          <div>
            <strong className={failed ? "metric-alert" : ""}>{failed}</strong>
            <small>xato · {passed} o‘tgan</small>
          </div>
        </button>
      </section>
      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <section className="panel work-table-panel">
            <div className="panel-heading">
              <h2>So‘nggi hujjatlar</h2>
              <button className="text-button" onClick={() => navigate(view)}>
                Barchasi <ArrowRight size={14} />
              </button>
            </div>
            <div
              className="document-tabs"
              role="group"
              aria-label="Hujjat turi"
            >
              <button
                aria-pressed={view === "cases"}
                className={view === "cases" ? "selected" : ""}
                onClick={() => setView("cases")}
              >
                Test-case’lar <span>{session.cases.length}</span>
              </button>
              <button
                aria-pressed={view === "reports"}
                className={view === "reports" ? "selected" : ""}
                onClick={() => setView("reports")}
              >
                Bug-report’lar <span>{session.reports.length}</span>
              </button>
            </div>
            <div className="dashboard-table-scroll">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Hujjat</th>
                    <th>Talab</th>
                    <th>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button onClick={() => navigate(view)}>
                          {view === "cases" ? (
                            <Files size={15} />
                          ) : (
                            <Bug size={15} />
                          )}
                          <span>{item.title}</span>
                        </button>
                      </td>
                      <td>
                        <code>{item.requirementId || "—"}</code>
                      </td>
                      <td>
                        <span className={`badge ${statusClass(item.status)}`}>
                          {statusLabel[item.status] || item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!records.length && (
              <div className="table-empty">
                <Files size={26} />
                <h3>
                  {view === "cases"
                    ? "Hali test-case yozilmagan"
                    : "Hali bug-report yozilmagan"}
                </h3>
                <p>
                  {view === "cases"
                    ? "Talabni tanlang, qadamlar va kutilgan natijani yozing."
                    : "Do‘konda topgan muammongizni qadamlar va dalil bilan yozing."}
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate(view)}
                >
                  <Plus size={15} />
                  {view === "cases" ? "Test-case yozish" : "Bug-report yozish"}
                </button>
              </div>
            )}
          </section>
          <section className="panel coverage-panel">
            <div className="panel-heading">
              <div>
                <h2>Talablar qamrovi</h2>
                <p>Checklist yoki test-case bilan bog‘langan talablar</p>
              </div>
              <button
                className="text-button"
                onClick={() => navigate("requirements")}
              >
                Talablar <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="coverage-rows">
              {modules.map((module) => {
                const requirements = session.scenario.requirements.filter(
                  (item) => item.module === module,
                );
                const count = requirements.filter((item) =>
                  linkedRequirements.has(item.id),
                ).length;
                return (
                  <button key={module} onClick={() => navigate("requirements")}>
                    <span>{module}</span>
                    <span className="coverage-track">
                      <i
                        style={{
                          width: `${(count / requirements.length) * 100}%`,
                        }}
                      />
                    </span>
                    <small>
                      {count} / {requirements.length}
                    </small>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
        <aside className="dashboard-secondary">
          <section className="panel project-details">
            <div className="panel-heading">
              <h2>Mashq tafsilotlari</h2>
              <ClipboardList size={16} />
            </div>
            <dl>
              <div>
                <dt>Muhit</dt>
                <dd>Demo do‘kon</dd>
              </div>
              <div>
                <dt>Versiya</dt>
                <dd>
                  {session.fixedBugIds.length ? "1.1 — retest" : "1.0 — asosiy"}
                </dd>
              </div>
              <div>
                <dt>Daraja</dt>
                <dd>{DIFFICULTY[session.difficulty]}</dd>
              </div>
              <div>
                <dt>Seed</dt>
                <dd>
                  <code>{session.seed}</code>
                </dd>
              </div>
              <div>
                <dt>Talablar</dt>
                <dd>{session.scenario.requirements.length} ta</dd>
              </div>
            </dl>
            <button
              className="text-button"
              onClick={() => navigate("requirements")}
            >
              Talablar bilan tanishish <ArrowRight size={14} />
            </button>
          </section>
          <section className="panel activity-panel">
            <div className="panel-heading">
              <h2>Faoliyat</h2>
              <Clock3 size={16} />
            </div>
            {session.activity.length ? (
              session.activity.slice(0, 4).map((item) => (
                <div className="activity-row" key={item.id}>
                  <span className="activity-dot" />
                  <div>
                    <b>{item.action}</b>
                    <p>{item.detail}</p>
                    <small>{date(item.at)}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className="activity-empty">
                Do‘kon va API’dagi amallar bu yerda qayd etiladi.
              </p>
            )}
          </section>
          <div className="onboarding-note">
            <BookOpen size={18} />
            <div>
              <b>Birinchi marta ishlayapsizmi?</b>
              <p>Checklist → test-case → bug-report tartibida mashq qiling.</p>
              <button className="text-button" onClick={() => navigate("guide")}>
                Qisqa yo‘riqnoma <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
function Requirements({ session, onCompose }) {
  const [query, setQuery] = useState("");
  const reqs = session.scenario.requirements.filter((r) =>
    `${r.id} ${r.title} ${r.description} ${r.module}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="section-intro">
        <div>
          <h2>Qabul mezonlari</h2>
          <p>
            Do‘kon qanday ishlashi kerakligi shu yerda yozilgan. Amaldagi
            xatti-harakatni ushbu qoidalar bilan solishtiring.
          </p>
        </div>
        <span className="badge">
          {session.scenario.requirements.length} TALAB
        </span>
      </div>
      <div className="search-field">
        <Search size={18} />
        <input
          aria-label="Talab qidirish"
          placeholder="Talab, modul yoki ID bo‘yicha qidiring…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="requirements-grid">
        {reqs.map((r) => (
          <article className="panel requirement" key={r.id}>
            <div className="inline spread">
              <span className="req-id">{r.id}</span>
              <span className="badge">{r.module}</span>
            </div>
            <h3>{r.title}</h3>
            <p>{r.description}</p>
            <div className="requirement-actions">
              <button
                className="text-button"
                onClick={() => onCompose("checklist", r.id)}
                aria-label={`${r.id}: checklist yozish`}
              >
                <ListChecks size={15} /> Checklist yozish
              </button>
              <button
                className="text-button"
                onClick={() => onCompose("cases", r.id)}
                aria-label={`${r.id}: test-case yozish`}
              >
                <Files size={15} /> Test-case yozish
              </button>
            </div>
          </article>
        ))}
      </div>
      {!reqs.length && (
        <div className="panel empty-state">Mos talab topilmadi.</div>
      )}
      <div className="info-note">
        Seed: <b>{session.seed}</b>. Talablar joriy mashq uchun o‘zgarmaydi.
        Xato topish uchun javoblarni oldindan ochish shart emas.
      </div>
    </>
  );
}
function Review({ session, onUpdate, onReveal, navigate }) {
  const fingerprint = useMemo(
    () => assessmentFingerprint(session),
    [
      session.scenario,
      session.fixedBugIds,
      session.checklist,
      session.cases,
      session.reports,
    ],
  );
  const bugs = session.scenario.bugs || [],
    reports = session.reports.filter((r) => !isSampleDocument(r));
  const linked = bugs.filter((b) =>
    reports.some((r) => r.id === session.findingLinks?.[b.id]),
  ).length;
  const hasText = (value) =>
    (Array.isArray(value) ? value.join("\n") : value || "").trim().length > 0;
  const complete = reports.filter((r) =>
    [r.title, r.steps, r.expected, r.actual].every(hasText),
  ).length;
  return (
    <>
      <Assessment
        session={session}
        isStale={Boolean(
          session.assessments?.length &&
          session.assessments.at(-1).fingerprint !== fingerprint,
        )}
        onSubmit={() => {
          const assessment = createAssessment(session);
          const assessments = [...(session.assessments || []), assessment];
          validateBackup({
            version: 1,
            activeId: session.id,
            sessions: [{ ...session, assessments, reviewUnlocked: true }],
          });
          onUpdate((current) => ({
            assessments: [...(current.assessments || []), assessment],
            reviewUnlocked: true,
          }));
        }}
      />
      <div className="stats-grid review-stats">
        <div className="stat-card">
          <span>Hisobotlar</span>
          <strong>{reports.length}</strong>
          <small>Namunasiz, siz yozgan reportlar</small>
        </div>
        <div className="stat-card">
          <span>Asosiy maydonlari to‘liq</span>
          <strong>{complete}</strong>
          <small>To‘ldirilganlik, to‘g‘rilik bahosi emas</small>
        </div>
        <div className="stat-card">
          <span>Javobga bog‘langan</span>
          <strong>
            {session.reviewUnlocked ? `${linked}/${bugs.length}` : "—"}
          </strong>
          <small>O‘zingiz dalil bilan solishtirasiz</small>
        </div>
      </div>
      {!session.reviewUnlocked ? (
        <div className="panel review-locked">
          <span className="lock-icon">
            <LockKeyhole size={30} />
          </span>
          <span className="eyebrow">AVVAL MUSTAQIL TEKSHIRING</span>
          <h2>Mashq javoblari</h2>
          <p>
            Ball olish uchun yuqoridagi «Mashqni topshirish»dan foydalaning.
            Javoblarni baholashsiz ochsangiz, keyingi topshirishlar mashq rejimi
            deb belgilanadi.
          </p>
          <div className="inline">
            <button
              className="btn btn-secondary"
              onClick={() => navigate("reports")}
            >
              Report yozish
            </button>
            <button className="btn btn-primary" onClick={onReveal}>
              Mashq javoblarini ochish <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="panel build-switch">
            <div>
              <h2>
                {session.fixedBugIds.length
                  ? "Build 1.1 — tuzatishlar yoqilgan"
                  : "Build 1.0 — nuqsonli versiya"}
              </h2>
              <p>
                Tuzatilgan versiyaga o‘tib, o‘sha qadamlarni yana bajaring. Eski
                buyurtmalar tarix sifatida qoladi; yangi amal tuzatilgan
                mantiqda ishlaydi.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() =>
                onUpdate({
                  fixedBugIds: session.fixedBugIds.length
                    ? []
                    : bugs.map((b) => b.id),
                  environment: `Seed ${session.seed} · Build ${session.fixedBugIds.length ? "1.0" : "1.1"} · ${window.innerWidth}×${window.innerHeight} · ${navigator.userAgent}`,
                  productState: {
                    ...session.productState,
                    notice: "",
                    errors: {},
                    couponMessage: "",
                  },
                })
              }
            >
              <RefreshCw size={16} />
              {session.fixedBugIds.length
                ? "Nuqsonli build’ga qaytish"
                : "Tuzatilgan build’ni ochish"}
            </button>
          </div>
          <div className="info-note">
            Bog‘lash — o‘zini tekshirish uchun. Reportdagi dalil bu nuqsonga
            haqiqatan mos kelishini o‘zingiz tasdiqlang. Bog‘langan son
            professional baho yoki avtomatik topilgan bug soni emas.
          </div>
          <div className="review-bugs">
            {bugs.map((b) => (
              <article className="panel" key={b.id}>
                <div className="inline spread">
                  <span className="req-id">
                    {b.id} · {b.requirementId}
                  </span>
                  <span className="badge danger">{b.severity}</span>
                </div>
                <h3>{b.title}</h3>
                <p className="muted">{b.module}</p>
                <dl>
                  <dt>Takrorlash</dt>
                  <dd>
                    {Array.isArray(b.steps) ? b.steps.join(" → ") : b.steps}
                  </dd>
                  <dt>Kutilgan</dt>
                  <dd>{b.expected}</dd>
                  <dt>Nuqsonli holat</dt>
                  <dd>{b.actual}</dd>
                </dl>
                <label className="field">
                  Mos reportim
                  <select
                    value={session.findingLinks?.[b.id] || ""}
                    onChange={(e) =>
                      onUpdate((s) => ({
                        findingLinks: {
                          ...s.findingLinks,
                          [b.id]: e.target.value,
                        },
                      }))
                    }
                  >
                    <option value="">Hali bog‘lanmagan</option>
                    {reports.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </div>
        </>
      )}
      <section className="panel reflection">
        <div className="panel-heading">
          <h3>Test yakuni hisoboti</h3>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const statusCounts = ["Not run", "Passed", "Failed", "Blocked"]
                .map(
                  (status) =>
                    `${status}: ${session.cases.filter((c) => !isSampleDocument(c) && c.status === status).length}`,
                )
                .join("\n");
              downloadFile(
                `qa-summary-${session.seed}.md`,
                `# ${session.name} — test yakuni\n\nSeed: ${session.seed}\nDaraja: ${DIFFICULTY[session.difficulty]}\nBuild: ${session.fixedBugIds.length ? "1.1" : "1.0"}\n\n## Test-case natijalari (namunasiz)\n${statusCounts}\n\nBug-reportlar (namunasiz): ${reports.length}\n\n## Tester xulosasi\n${session.notes || "Hali yozilmagan."}\n`,
                "text/markdown;charset=utf-8",
              );
            }}
          >
            <Download size={15} /> Hisobotni yuklash
          </button>
        </div>
        <p className="muted">
          Qamrov, bajarilgan ish, tekshirilmay qolgan joylar va release
          qaroringizni yozing. Natija sonlari eksportga avtomatik qo‘shiladi.
        </p>
        <label className="field">
          Tester xulosasi
          <textarea
            aria-label="Tester xulosasi"
            rows={7}
            value={session.notes || ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder={
              "Qamrov: qidiruv, savat va checkout.\nNatija: ...\nTekshirilmagan: ...\nQolgan risklar: ...\nQaror: release’ni to‘xtatish / tavsiya qilish. Sababi: ...\nKeyingi safar: ..."
            }
          />
        </label>
      </section>
    </>
  );
}
function HistoryView({
  data,
  setData,
  navigate,
  exportAll,
  onImport,
  importing,
}) {
  return (
    <>
      <div className="section-intro">
        <div>
          <h2>Har bir mashq — alohida ish papkasi</h2>
          <p>
            Yangi mashq avvalgi hujjat va dalillarni o‘chirmaydi. Zaxira fayli
            bilan boshqa brauzerga ko‘chiring.
          </p>
        </div>
        <div className="inline history-import-actions" aria-busy={importing}>
          <button
            className="btn btn-secondary"
            disabled={importing}
            onClick={() => onImport(false)}
          >
            <Upload size={16} /> JSON import
          </button>
          <button
            className="btn btn-secondary"
            disabled={importing}
            onClick={() => onImport(true)}
          >
            <Upload size={16} /> JSON nusxa sifatida
          </button>
          <button className="btn btn-primary" onClick={exportAll}>
            <Download size={16} /> JSON eksport
          </button>
        </div>
      </div>
      {importing && (
        <p className="muted">Zaxira o‘qilmoqda va tekshirilmoqda…</p>
      )}
      <div className="history-grid">
        {data.sessions.map((s) => (
          <article className="panel history-card" key={s.id}>
            <div className="inline spread">
              <span className="history-icon">
                <FolderOpen size={24} />
              </span>
              <span
                className={`badge ${s.id === data.activeId ? "success" : ""}`}
              >
                {s.id === data.activeId ? "FAOL" : DIFFICULTY[s.difficulty]}
              </span>
            </div>
            <h3>{s.name}</h3>
            <p className="muted">
              {date(s.createdAt)} · seed {s.seed}
            </p>
            <div className="history-counts">
              <span>
                <ListChecks size={15} />
                {s.checklist.length}
              </span>
              <span>
                <Files size={15} />
                {s.cases.length}
              </span>
              <span>
                <Bug size={15} />
                {s.reports.length}
              </span>
            </div>
            <button
              className="btn btn-secondary full"
              onClick={() => {
                setData((prev) => ({ ...prev, activeId: s.id }));
                navigate("overview");
              }}
            >
              Mashqni davom ettirish <ArrowRight size={16} />
            </button>
          </article>
        ))}
      </div>
      <div className="info-note">
        Ma’lumotlar shu sayt manzili va brauzerga tegishli IndexedDB’da
        saqlanadi. Brauzer ma’lumotlarini tozalash ularni o‘chiradi. Import bir
        xil ID’li mavjud mashqni almashtirmaydi. Konfliktdan saqlangan zaxirani
        tiklash uchun “JSON nusxa sifatida”ni tanlang — u alohida mashq
        yaratadi.
      </div>
    </>
  );
}
function Guide({ navigate }) {
  const sections = [
    [
      "01",
      "Talab → checklist",
      "“Login ishlaydi” o‘rniga aniq holat yozing: to‘g‘ri parol, noto‘g‘ri parol, bo‘sh maydon, sessiya. Har band uchun kutilgan natijani belgilang.",
      "requirements",
    ],
    [
      "02",
      "Checklist → test-case",
      "Old shart, ma’lumot, qadamlar va kutilgan natijani yozing. Bajarilmagan testni Passed deb belgilamang. Blocked — xato topildi degani emas.",
      "cases",
    ],
    [
      "03",
      "Natija → bug-report",
      "Bir nuqsonni bitta reportda yozing. Kutilgan va amaldagi natijani ajrating. Build, seed, qadam va screenshot boshqa odamga takrorlashda yordam beradi.",
      "reports",
    ],
    [
      "04",
      "Tuzatish → retest",
      "Javoblarni ochgach tuzatilgan build’ga o‘ting. O‘sha qadamni qayta bajaring — bu retest. Boshqa ishlaydigan funksiyalarni tekshirish — regressiya.",
      "review",
    ],
  ];
  return (
    <>
      <section className="panel guide-banner">
        <BookOpen size={33} />
        <div>
          <h2>Laboratoriyadan foydalanish</h2>
          <p>
            Bu yerda faqat tugma bosish emas, tekshiruvni rejalash, dalil yozish
            va xulosa chiqarishni mashq qilasiz.
          </p>
        </div>
      </section>
      <div className="guide-grid">
        {sections.map(([n, t, d, p]) => (
          <article className="panel" key={n}>
            <span className="step-number">{n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
            <button className="text-button" onClick={() => navigate(p)}>
              Amalda bajarish <ArrowRight size={14} />
            </button>
          </article>
        ))}
      </div>
      <section className="panel guide-faq">
        <h2>Bilish kerak bo‘lganlar</h2>
        {[
          [
            "Har safar nimasi o‘zgaradi?",
            "Yangi seed yangi mahsulot tartibi, narxlar, do‘kon ko‘rinishi va nuqsonlar to‘plamini beradi. Bir xil seed va daraja bir xil boshlang‘ich holatni qaytaradi. Refresh joriy mashqni saqlaydi.",
          ],
          [
            "Nega barcha so‘rovlar Network’da ko‘rinmaydi?",
            "API laboratoriya brauzerdagi o‘quv simulyatsiyasi. U haqiqiy server yoki to‘lov tizimiga ulanmaydi. Status, JSON va biznes qoidalarini mashq qilish uchun qurilgan.",
          ],
          [
            "Ishlarim qayerda turadi?",
            "Faqat shu brauzerda. JSON eksport barcha mashqlar va screenshotlarni olib chiqadi. CSV va Markdown hujjat eksporti tegishli QA bo‘limlarida.",
          ],
          [
            "Nimani oshkor qilmaslik kerak?",
            "Faqat demo hisoblar bilan ishlang. Screenshotlarga haqiqiy parol, token yoki shaxsiy ma’lumot qo‘shmang.",
          ],
          [
            "Avtomatik baholash qanday ishlaydi?",
            "Yozuvni aniq avto baholash mezoniga bog‘lang. Natija va retest’da mashqni topshirsangiz, 14 ta aniq holat sinovdan o‘tadi va belgilaringiz bilan solishtiriladi. Ball: holat mosligi 60, reportning xatoli mezonga mosligi 25, maydonlar to‘liqligi 15. Report matni va screenshot ma’nosi tekshirilmaydi. Bu o‘quv bahosi, sertifikat imtihoni emas.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </>
  );
}
function Modal({ title, onClose, children }) {
  const box = useRef();
  useDialogFocus(box, true, onClose);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={box}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="panel-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Yopish" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function NewSession({ onClose, onCreate }) {
  const [name, setName] = useState(""),
    [seed, setSeed] = useState(""),
    [difficulty, setDifficulty] = useState("standard");
  return (
    <Modal title="Yangi QA mashqi" onClose={onClose}>
      <p className="muted">
        Yangi do‘kon, yangi vaziyat. Oldingi mashqlaringiz tarixda qoladi.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({
            name: name.trim() || undefined,
            seed: seed.trim() || undefined,
            difficulty,
          });
        }}
      >
        <label className="field">
          Mashq nomi
          <input
            data-dialog-focus
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Checkout regressiyasi"
          />
        </label>
        <fieldset className="difficulty-options">
          <legend>Qiyinlik darajasi</legend>
          {[
            ["beginner", "Boshlang‘ich", "4 ta yashirin nuqson"],
            ["standard", "Amaliyot", "6 ta yashirin nuqson"],
            ["expert", "Murakkab", "8 ta yashirin nuqson"],
          ].map(([id, t, sub]) => (
            <label key={id} className={difficulty === id ? "selected" : ""}>
              <input
                type="radio"
                name="difficulty"
                value={id}
                checked={difficulty === id}
                onChange={() => setDifficulty(id)}
              />
              <b>{t}</b>
              <small>{sub}</small>
            </label>
          ))}
        </fieldset>
        <label className="field">
          Seed <span className="muted">— ixtiyoriy</span>
          <input
            maxLength={50}
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="Bo‘sh qoldirsangiz, yangi seed yaratiladi"
          />
        </label>
        <div className="info-note">
          Bir xil seed va daraja bilan bir xil boshlang‘ich mashqni
          takrorlashingiz mumkin.
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" type="submit">
            Mashqni yaratish <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

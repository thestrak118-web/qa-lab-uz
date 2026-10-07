import React, { useEffect, useRef, useState } from "react";
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
  Circle,
  Clock3,
  Save,
  Play,
  MoreHorizontal,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { createScenario, initialProductState } from "./lib/scenario.js";
import {
  loadWorkspace,
  saveWorkspace,
  downloadFile,
  validateBackup,
} from "./lib/storage.js";
import Shop from "./components/Shop.jsx";
import Workspace from "./components/Workspace.jsx";
import ApiLab from "./components/ApiLab.jsx";
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
const date = (value) =>
  new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export default function App() {
  const [data, setData] = useState(null),
    [page, setPage] = useState("overview"),
    [saveState, setSaveState] = useState("loading"),
    [storageError, setStorageError] = useState(""),
    [notice, setNotice] = useState(""),
    [newModal, setNewModal] = useState(false),
    [mobile, setMobile] = useState(false),
    [reveal, setReveal] = useState(false);
  const fileRef = useRef(),
    ready = useRef(false),
    revision = useRef(0);
  useEffect(() => {
    let active = true;
    loadWorkspace()
      .then((stored) => {
        if (!active) return;
        if (stored) validateBackup(stored);
        setData(stored || initial());
        ready.current = true;
      })
      .catch((e) => {
        if (active) {
          setStorageError(
            "Saqlangan ishlarni o‘qib bo‘lmadi. Yangi ishni JSON orqali eksport qiling. " +
              e.message,
          );
          setData(initial());
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!data || !ready.current) return;
    const rev = ++revision.current;
    setSaveState("saving");
    saveWorkspace(data)
      .then(() => {
        if (rev === revision.current) {
          setSaveState("saved");
          setStorageError("");
        }
      })
      .catch((e) => {
        setSaveState("error");
        setStorageError(
          "Brauzerga saqlash muvaffaqiyatsiz. JSON zaxirani yuklab oling: " +
            e.message,
        );
      });
  }, [data]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const warn = (e) => {
      if (saveState === "saving" || saveState === "error") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);
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
  async function importAll(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setNotice("Fayl hajmi 50 MB dan oshmasligi kerak.");
      return;
    }
    try {
      const imported = validateBackup(JSON.parse(await file.text()));
      let added = 0;
      setData((prev) => {
        const known = new Set(prev.sessions.map((s) => s.id));
        const extra = imported.sessions.filter((s) => !known.has(s.id));
        added = extra.length;
        return { ...prev, sessions: [...prev.sessions, ...extra] };
      });
      setNotice(
        "Zaxira import qilindi. Mavjud ID’li mashqlar o‘zgartirilmadi.",
      );
    } catch (e) {
      setNotice(e.message);
    }
  }
  const title = NAV.find((n) => n[0] === page)?.[1];
  return (
    <div className="app-shell">
      <div
        className={`mobile-shade ${mobile ? "visible" : ""}`}
        onClick={() => setMobile(false)}
      />
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
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
            qa<span className="brand-light">lab</span>
            <small>O‘RGAN. TEKSHIR. ISBOTLA.</small>
          </span>
        </a>
        <button
          className="workspace-switch"
          onClick={() => navigate("history")}
        >
          <span className="workspace-avatar">S</span>
          <span>
            Shaxsiy laboratoriya<small>QA muhandisi ish maydoni</small>
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
            QA o‘rganuvchi<small>Shaxsiy profil</small>
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
        <main className="main-content">
          {storageError && (
            <div className="error-banner" role="alert">
              {storageError}
              <button onClick={exportAll}>Zaxirani yuklash</button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">SIZNING QA LABORATORIYANGIZ</div>
              <h1>
                {page === "overview" ? "Bugun nimani tekshiramiz?" : title}
              </h1>
              <p>
                {page === "overview"
                  ? "Realistik vazifalar. Haqiqiy QA jarayoni. Xato qilish uchun eng to‘g‘ri joy."
                  : `${session.name} · seed ${session.seed} · ${DIFFICULTY[session.difficulty]}`}
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setNewModal(true)}
            >
              <Plus size={17} /> Yangi mashq
            </button>
          </div>
          {page === "overview" && (
            <Overview session={session} navigate={navigate} />
          )}
          {page === "requirements" && <Requirements session={session} />}
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
            <Workspace session={session} onUpdate={onUpdate} tab={page} />
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
              onImport={() => fileRef.current.click()}
            />
          )}
          {page === "guide" && <Guide navigate={navigate} />}
          <footer className="app-footer">
            <span>
              QA Lab <span className="separator">/</span> Nazariyadan
              amaliyotga.
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
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
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
  const executed = [...session.checklist, ...session.cases].filter(
    (t) => t.status !== "Not run",
  ).length;
  const cards = [
    [
      "Checklist",
      session.checklist.length,
      "Tekshiruvlar ro‘yxati",
      ListChecks,
      "checklist",
      "teal",
    ],
    [
      "Test-case",
      session.cases.length,
      "Takrorlanadigan qadamlar",
      Files,
      "cases",
      "blue",
    ],
    [
      "Bug-report",
      session.reports.length,
      "Dalil bilan yozilgan topilma",
      Bug,
      "reports",
      "orange",
    ],
    [
      "Bajarilgan",
      executed,
      "Belgilangan test natijalari",
      CheckCircle2,
      "review",
      "purple",
    ],
  ];
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-tag">
            <span className="live-dot" /> FAOL MASHQ <span>·</span>{" "}
            {DIFFICULTY[session.difficulty]}
          </div>
          <h2>
            Kuzating. Savol bering.
            <br />
            <span>Nuqsonni dalil bilan toping.</span>
          </h2>
          <p>
            {session.scenario.brand} do‘konida QA muhandisisiz. Talablarni
            o‘qing, foydalanuvchi yo‘llarini sinang va topilmalaringizni
            hujjatlashtiring.
          </p>
          <div className="hero-actions">
            <button className="btn btn-lime" onClick={() => navigate("shop")}>
              <Play size={16} /> Laboratoriyani ochish{" "}
              <ArrowUpRight size={17} />
            </button>
            <button
              className="hero-link"
              onClick={() => navigate("requirements")}
            >
              Talablar bilan tanishish <ArrowRight size={15} />
            </button>
          </div>
          <div className="hero-meta">
            <span>
              SEED <b>{session.seed}</b>
            </span>
            <span>
              BUILD <b>{session.fixedBugIds.length ? "1.1" : "1.0"}</b>
            </span>
            <span>{session.scenario.products.length} ta mahsulot</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-grid" />
          <div className="floating-card art-browser">
            <div className="art-browser-top">
              <i />
              <i />
              <i />
              <span>test.environment</span>
            </div>
            <div className="art-code">
              <span className="code-comment">// Har bir tafsilot muhim</span>
              <span>
                <b>test</b>('checkout', () =&gt; {"{"}
              </span>
              <span>
                {" "}
                <em>expect</em>(total).toBe(90);
              </span>
              <span>{"}"});</span>
            </div>
            <div className="art-results">
              <span>
                <CheckCircle2 size={16} /> 2 passed
              </span>
              <span className="art-fail">
                <Bug size={16} /> 1 failed
              </span>
            </div>
          </div>
          <div className="art-bug">
            <Bug size={32} />
          </div>
          <div className="art-verified">
            <ShieldCheck size={19} />
            <div>
              Dalilga asoslangan<small>QA ENGINEERING</small>
            </div>
          </div>
        </div>
      </section>
      <div className="stats-grid">
        {cards.map(([name, value, sub, Icon, target, color]) => (
          <button
            className="stat-card"
            key={name}
            onClick={() => navigate(target)}
          >
            <div className="stat-top">
              <span>{name}</span>
              <span className={`stat-icon ${color}`}>
                <Icon size={18} />
              </span>
            </div>
            <strong>{value.toString().padStart(2, "0")}</strong>
            <small>
              {sub} <ArrowUpRight size={13} />
            </small>
          </button>
        ))}
      </div>
      <div className="overview-columns">
        <section className="panel journey">
          <div className="panel-heading">
            <h2>Mashq yo‘li</h2>
            <span className="badge">4 BOSQICH</span>
          </div>
          {[
            [
              "01",
              "Talabni tushuning",
              "Kutilgan natija va biznes qoidalarini bilib oling.",
              "requirements",
              session.requirementsViewed,
            ],
            [
              "02",
              "Tekshiring va yozing",
              "Checklist va test-case bilan izchil tekshiring.",
              "checklist",
              session.checklist.length > 0,
            ],
            [
              "03",
              "Topilmani isbotlang",
              "Qadamlar, kutilgan natija va dalil bilan report yozing.",
              "reports",
              session.reports.length > 0,
            ],
            [
              "04",
              "Solishtiring va qayta sinang",
              "Javoblarni ko‘ring, tuzatilgan build’da retest qiling.",
              "review",
              session.reviewUnlocked,
            ],
          ].map(([n, title, text, target, done]) => (
            <button
              className="journey-row"
              key={n}
              onClick={() => navigate(target)}
            >
              <span className={`step-number ${done ? "done" : ""}`}>
                {done ? <Check size={15} /> : n}
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <ChevronRight size={16} />
            </button>
          ))}
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading">
            <h2>So‘nggi harakatlar</h2>
            <Clock3 size={17} />
          </div>
          {session.activity.length ? (
            session.activity.slice(0, 5).map((a) => (
              <div className="activity-row" key={a.id}>
                <span className="activity-dot" />
                <div>
                  <b>{a.action}</b>
                  <p>{a.detail}</p>
                  <small>{date(a.at)}</small>
                </div>
              </div>
            ))
          ) : (
            <div className="quiet-empty">
              <span>
                <Store size={25} />
              </span>
              <h3>Birinchi tekshiruvni boshlang</h3>
              <p>Do‘kondagi harakatlaringiz bu yerda qayd etiladi.</p>
              <button className="text-button" onClick={() => navigate("shop")}>
                Do‘konga o‘tish <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
      </div>
      <div className="tip-banner">
        <span className="tip-icon">
          <Sparkles size={20} />
        </span>
        <div>
          <b>Har safar yangi vaziyat. Har safar ko‘proq tajriba.</b>
          <p>
            Yangi mashqda mahsulotlar, joylashuv va nuqsonlar almashadi. Joriy
            mashq refresh’da o‘zgarmaydi.
          </p>
        </div>
        <button className="text-button" onClick={() => navigate("guide")}>
          Qanday ishlaydi? <ArrowUpRight size={15} />
        </button>
      </div>
    </>
  );
}
function Requirements({ session }) {
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
          <h2>Sizning tekshirish manbangiz</h2>
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
  const bugs = session.scenario.bugs || [],
    reports = session.reports.filter((r) => !r.title.includes("[Namuna]"));
  const linked = bugs.filter((b) =>
    reports.some((r) => r.id === session.findingLinks?.[b.id]),
  ).length;
  const complete = reports.filter(
    (r) => r.title && r.steps && r.expected && r.actual,
  ).length;
  return (
    <>
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
          <h2>Yashirin xatolar shu yerda kutmoqda.</h2>
          <p>
            Checklist, test-case va reportlaringizni yozing. Tayyor bo‘lgach
            javoblarni ochib, topilmalaringizni solishtiring.
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
                    `${status}: ${session.cases.filter((c) => c.status === status).length}`,
                )
                .join("\n");
              downloadFile(
                `qa-summary-${session.seed}.md`,
                `# ${session.name} — test yakuni\n\nSeed: ${session.seed}\nDaraja: ${DIFFICULTY[session.difficulty]}\nBuild: ${session.fixedBugIds.length ? "1.1" : "1.0"}\n\n## Test-case natijalari\n${statusCounts}\n\nBug-reportlar: ${session.reports.length}\n\n## Tester xulosasi\n${session.notes || "Hali yozilmagan."}\n`,
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
function HistoryView({ data, setData, navigate, exportAll, onImport }) {
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
        <div className="inline">
          <button className="btn btn-secondary" onClick={onImport}>
            <Upload size={16} /> JSON import
          </button>
          <button className="btn btn-primary" onClick={exportAll}>
            <Download size={16} /> JSON eksport
          </button>
        </div>
      </div>
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
        xil ID’li mavjud mashqni almashtirmaydi.
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
          <h2>QA bo‘lishni QA qilib o‘rganing.</h2>
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
            "Bu avtomatik imtihonmi?",
            "Yo‘q. Maydonlar to‘liqligi ko‘rsatiladi, lekin reportning mazmunini avtomatik tasdiqlamaydi. Javoblarni ochgach o‘z dalilingiz bilan solishtirasiz.",
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
  useEffect(() => {
    const before = document.activeElement;
    const timer = setTimeout(
      () => box.current?.querySelector("input,button,select,textarea")?.focus(),
      0,
    );
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = [
          ...box.current.querySelectorAll(
            "button,input,select,textarea,a[href]",
          ),
        ].filter((e) => !e.disabled);
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, []);
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
            autoFocus
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

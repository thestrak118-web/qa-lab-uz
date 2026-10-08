import {
  cloneElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Plus,
  Download,
  Search,
  Pencil,
  Trash2,
  ClipboardList,
  FileCheck2,
  Bug,
  X,
  ImagePlus,
  Check,
  ArrowUpRight,
  RotateCcw,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import "../workspace.css";
import { CHECK_DEFINITIONS } from "../lib/checks.js";
import { isSampleDocument } from "../lib/practice.js";
import { useDialogFocus } from "../lib/useDialogFocus.js";
import {
  draftSnapshot,
  readDraft,
  writeDraft,
} from "../lib/workspaceDrafts.js";

function draftStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const TEST_STATUSES = ["Not run", "Passed", "Failed", "Blocked"];
const PAGE_SIZE = 50;
const matchesDocument = (item, query, filter) =>
  (filter === "all" || item.status === filter) &&
  `${item.title} ${item.requirementId || ""} ${item.module || ""} ${item.actual || ""}`
    .toLocaleLowerCase()
    .includes(query.toLocaleLowerCase());

function documentDisplayKeys(items, prefix) {
  const groups = new Map();
  for (const { id } of items) {
    let hash = 2166136261;
    for (let index = 0; index < id.length; index++)
      hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
    const short = (hash >>> 0).toString(36).padStart(7, "0").toUpperCase();
    if (!groups.has(short)) groups.set(short, []);
    groups.get(short).push(id);
  }
  const keys = new Map();
  for (const [short, ids] of groups) {
    // Resolve even a checksum collision using full IDs in a stable order.
    // Build from the complete collection so filters and pages never rename it.
    if (ids.length > 1) ids.sort();
    ids.forEach((id, index) =>
      keys.set(
        id,
        `${prefix}-${short}${ids.length > 1 ? `-${(index + 1).toString(36).toUpperCase()}` : ""}`,
      ),
    );
  }
  return keys;
}
const REPORT_STATUSES = [
  "Open",
  "In progress",
  "Ready for retest",
  "Closed",
  "Reopened",
];
const STATUS_LABELS = {
  "Not run": "Tekshirilmagan",
  Passed: "O‘tdi",
  Failed: "Xato bor",
  Blocked: "To‘siq bor",
  Open: "Ochiq",
  "In progress": "Tuzatilmoqda",
  "Ready for retest": "Qayta testga tayyor",
  Closed: "Yopilgan",
  Reopened: "Qayta ochilgan",
};
const META = {
  checklist: {
    title: "Test checklist",
    subtitle: "Nimani tekshirishni oldindan rejalashtiring.",
    singular: "Tekshiruv",
    icon: ClipboardList,
    intro:
      "Har qatorda bitta tekshiruv yozing. Demo mahsulotda uni bajaring, kutilgan va haqiqiy natijani solishtirib holatini belgilang.",
    empty: "Birinchi tekshiruvingizni yozing",
    example:
      "Masalan: “Bo‘sh maydon bilan yuborilganda ogohlantirish chiqadimi?”",
    action: "Tekshiruv qo‘shish",
  },
  cases: {
    title: "Test cases",
    subtitle: "Boshqa tester ham takrorlay oladigan qadamlar.",
    singular: "Test case",
    icon: FileCheck2,
    intro:
      "Boshlang‘ich holat, test ma’lumotlari, qadamlar va kutilgan natijani yozing. Keyin mahsulotda aynan shu qadamlarni bajaring.",
    empty: "Birinchi test case’ni yarating",
    example:
      "Masalan: to‘g‘ri ma’lumot bilan buyurtma yaratishning barcha qadamlarini yozing.",
    action: "Test case qo‘shish",
  },
  reports: {
    title: "Bug reports",
    subtitle: "Topgan muammoni aniq va takrorlanadigan qilib yozing.",
    singular: "Bug report",
    icon: Bug,
    intro:
      "Nima, qayerda va qanday sharoitda ishlamadi? Qadamlar, kutilgan va haqiqiy natijani alohida yozing. Screenshot dalilni tushuntirishga yordam beradi.",
    empty: "Birinchi xatoni hujjatlashtiring",
    example:
      "Avval mahsulotda xatoni takrorlang. Keyin sarlavha, qadamlar va natijalarni yozing.",
    action: "Bug report yozish",
  },
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `qa-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const asText = (value) =>
  Array.isArray(value) ? value.join("\n") : value || "";
const csvCell = (value) => {
  let cell = String(value ?? "");
  if (/^[\s]*[=+@\-]/.test(cell) || /^[\t\r]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replaceAll('"', '""')}"`;
};
const slug = (value) =>
  String(value)
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 70) || "report";
function downloadFile(contents, filename, mime = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadImage(evidence) {
  const link = document.createElement("a");
  link.href = evidence.dataUrl;
  link.download = evidence.name || "screenshot.png";
  link.click();
}
const markdownText = (value) => asText(value).replaceAll("\r", "");
function reportMarkdown(report) {
  return `# ${markdownText(report.title)}\n\n- ID: ${report.id}\n- Modul: ${report.module || "—"}\n- Talab: ${report.requirementId || "—"}\n- Avto mezon: ${report.checkId || "Tanlanmagan"}\n- Severity: ${report.severity}\n- Priority: ${report.priority}\n- Holat: ${report.status}\n- Muhit: ${report.environment || "—"}\n\n## Takrorlash qadamlari\n${markdownText(report.steps)}\n\n## Kutilgan natija\n${markdownText(report.expected)}\n\n## Haqiqiy natija\n${markdownText(report.actual)}\n\n## Dalillar\n${report.evidence?.length ? report.evidence.map((item) => `- ${item.name} (rasmni laboratoriyadan alohida yuklab oling)`).join("\n") : "Rasm biriktirilmagan."}\n`;
}

function Field({ label, hint, children, wide }) {
  const id = useId();
  return (
    <div className={`workspace-field${wide ? " workspace-field-wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        ...(hint ? { "aria-describedby": `${id}-hint` } : {}),
      })}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}

function EvidenceImage({ evidence, preview = false }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [evidence.id, evidence.dataUrl]);
  return broken ? (
    <div className="workspace-image-error" role="note">
      {preview
        ? "Rasmni ko‘rsatib bo‘lmadi. Fayl buzilgan bo‘lishi mumkin; reportni tahrirlab, ishlaydigan screenshot biriktiring."
        : "Rasm ochilmadi"}
    </div>
  ) : (
    <img
      src={evidence.dataUrl}
      alt={evidence.name}
      onError={() => setBroken(true)}
    />
  );
}

function DocumentPagination({ page, pages, total, onChange, bottom = false }) {
  if (pages <= 1) return null;
  return (
    <nav
      className="workspace-pagination"
      aria-label={
        bottom ? "Yozuvlar sahifalari, ro‘yxat oxiri" : "Yozuvlar sahifalari"
      }
    >
      <span role={bottom ? undefined : "status"}>
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} /{" "}
        {total} yozuv
        <small>
          {page} / {pages} sahifa
        </small>
      </span>
      <div>
        <button
          type="button"
          aria-label="Birinchi yozuvlar sahifasi"
          disabled={page === 1}
          onClick={() => onChange(1)}
        >
          <ChevronsLeft size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Oldingi yozuvlar sahifasi"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Keyingi yozuvlar sahifasi"
          disabled={page === pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Oxirgi yozuvlar sahifasi"
          disabled={page === pages}
          onClick={() => onChange(pages)}
        >
          <ChevronsRight size={17} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

export default function Workspace({
  session,
  onUpdate,
  tab = "checklist",
  composeRequest,
  onComposeHandled,
}) {
  const meta = META[tab] || META.checklist;
  const Icon = meta.icon;
  const isReport = tab === "reports";
  const requirements = session.scenario?.requirements || [];
  const items = session[tab] || [];
  const statuses = isReport ? REPORT_STATUSES : TEST_STATUSES;
  const [recovered] = useState(() => readDraft(draftStorage(), session, tab));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [revealId, setRevealId] = useState(null);
  const [draft, setDraft] = useState(recovered?.draft || null);
  const [editing, setEditing] = useState(recovered?.editing || false);
  const [recovery, setRecovery] = useState(recovered?.recovery || null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    recovered
      ? "Tugallanmagan qoralama tiklandi. Yozuvga kiritish uchun Saqlash tugmasini bosing."
      : "",
  );
  const [draftStored, setDraftStored] = useState(true);
  const [removed, setRemoved] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const headingRef = useRef(null);
  const editorRef = useRef(null);
  const imageInput = useRef(null);
  const previewRef = useRef(null);
  const baselineRef = useRef(recovered?.baseline || "");
  const savedBaselineRef = useRef(recovered?.savedBaseline || "");
  const handledComposeRef = useRef(null);
  const dirty = Boolean(draft && draftSnapshot(draft) !== baselineRef.current);

  useEffect(() => {
    setDraftStored(
      writeDraft(
        draftStorage(),
        session.id,
        tab,
        draft
          ? {
              draft,
              editing,
              baseline: baselineRef.current,
              savedBaseline: savedBaselineRef.current,
              ...(recovery ? { recovery } : {}),
            }
          : null,
      ),
    );
  }, [draft, editing, recovery, session.id, tab]);
  useEffect(() => {
    if (!draft || (!uploading && (draftStored || !dirty))) return;
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [draft, draftStored, uploading, dirty]);
  useEffect(() => {
    if (draft) editorRef.current?.querySelector("input")?.focus();
  }, [draft?.id]);
  useDialogFocus(previewRef, Boolean(preview), () => setPreview(null));

  const blank = () => ({
    id: uid(),
    title: "",
    requirementId: "",
    checkId: "",
    expected: "",
    actual: "",
    status: isReport ? "Open" : "Not run",
    priority: "P2",
    ...(tab === "cases" ? { preconditions: "", data: "", steps: "" } : {}),
    ...(isReport
      ? {
          module: "",
          steps: "",
          severity: "Medium",
          environment: `Seed ${session.seed} · Build ${session.fixedBugIds.length ? "1.1" : "1.0"} · ${window.innerWidth}×${window.innerHeight} · ${navigator.userAgent}`,
          evidence: [],
          createdAt: new Date().toISOString(),
        }
      : {}),
  });
  const patchDraft = (patch) =>
    setDraft((current) => (current ? { ...current, ...patch } : null));
  const allowReplace = () =>
    !dirty ||
    window.confirm("Qoralamadagi saqlanmagan o‘zgarishlar bekor qilinsinmi?");
  const beginDraft = (value, saved = null) => {
    if (!allowReplace()) return false;
    baselineRef.current = draftSnapshot(value);
    savedBaselineRef.current = saved ? draftSnapshot(saved) : "";
    setDraft(value);
    setEditing(Boolean(saved));
    setRecovery(null);
    setError("");
    setMessage("");
    return true;
  };
  const openNew = () => {
    beginDraft(blank());
  };
  useEffect(() => {
    if (
      !composeRequest ||
      composeRequest.tab !== tab ||
      handledComposeRef.current === composeRequest.id
    )
      return;
    handledComposeRef.current = composeRequest.id;
    if (composeRequest.sessionId && composeRequest.sessionId !== session.id) {
      onComposeHandled?.();
      return;
    }
    if (composeRequest.recordId) {
      const item = items.find((entry) => entry.id === composeRequest.recordId);
      if (item) {
        // A recovered draft for this record is newer than the saved row.
        // Resume it directly; opening another record uses the usual warning.
        if (draft?.id === item.id) {
          editorRef.current?.querySelector("input")?.focus();
          setRevealId(item.id);
        } else if (edit(item)) {
          setRevealId(item.id);
        }
      }
      onComposeHandled?.();
      return;
    }
    const requirement = requirements.find(
      (item) => item.id === composeRequest.requirementId,
    );
    if (requirement) {
      beginDraft({ ...blank(), requirementId: requirement.id });
    }
    onComposeHandled?.();
  }, [composeRequest?.id, session.id, tab]);
  const edit = (item) => {
    return beginDraft(
      {
        ...item,
        steps: asText(item.steps),
        evidence: [...(item.evidence || [])],
      },
      item,
    );
  };
  const close = (discard = false) => {
    if (!discard && !allowReplace()) return;
    setDraft(null);
    setRecovery(null);
    setError("");
    headingRef.current?.focus();
  };
  const updateItems = (updater) =>
    onUpdate((current) => ({ [tab]: updater(current[tab] || []) }));
  const chooseRequirement = (requirementId) => {
    const requirement = requirements.find((item) => item.id === requirementId);
    patchDraft({
      requirementId,
      checkId: "",
      ...(isReport && requirement?.module
        ? { module: requirement.module }
        : {}),
    });
  };
  function save(event) {
    event.preventDefault();
    if (uploading) return;
    if (!draft.title.trim()) {
      setError("Qisqa va aniq sarlavha kiriting.");
      return;
    }
    if (
      isReport &&
      (!asText(draft.steps).trim() ||
        !draft.expected.trim() ||
        !draft.actual.trim())
    ) {
      setError(
        "Bug report uchun qadamlar, kutilgan va haqiqiy natijani to‘ldiring.",
      );
      return;
    }
    if (
      tab === "cases" &&
      (!asText(draft.steps).trim() || !draft.expected.trim())
    ) {
      setError("Test case uchun qadamlar va kutilgan natijani to‘ldiring.");
      return;
    }
    const entry = {
      ...draft,
      title: draft.title.trim(),
      updatedAt: new Date().toISOString(),
    };
    updateItems((current) =>
      editing
        ? current.map((item) => (item.id === entry.id ? entry : item))
        : [...current, entry],
    );
    setMessage(
      editing ? "O‘zgarishlar saqlandi." : `${meta.singular} saqlandi.`,
    );
    setRemoved(null);
    setRevealId(entry.id);
    close(true);
  }
  function addSample() {
    const requirement =
      requirements.find((entry) => entry.id === "REQ-01") || requirements[0];
    const item = {
      ...blank(),
      title: `[Namuna] ${requirement?.title || "Majburiy maydonni tekshirish"}`,
      requirementId: requirement?.id || "",
      expected:
        requirement?.description ||
        "Majburiy maydon bo‘sh bo‘lsa, tushunarli ogohlantirish ko‘rsatiladi.",
    };
    if (tab === "cases")
      Object.assign(item, {
        preconditions:
          "Katalog ochilgan. Kategoriya va boshqa filtrlar tozalangan.",
        data: "Qidiruv: Air va AIR",
        steps:
          "1. Qidiruv maydoniga Air kiriting.\n2. Chiqqan mahsulotlarni yozib oling.\n3. Qidiruvni AIR ga almashtiring.\n4. Ikkala natijani solishtiring.",
        expected: "Air va AIR uchun bir xil mahsulotlar chiqishi kerak.",
        actual: "",
      });
    if (isReport)
      Object.assign(item, {
        title: "[Namuna] Katta harfli AIR qidiruvida mahsulot topilmayapti",
        module: requirement?.module || "Katalog",
        steps:
          "1. Katalogni ochib, filtrlarni tozalang.\n2. Qidiruvga Air yozing.\n3. Natijalarni yozib oling.\n4. Qidiruvni AIR ga almashtiring.",
        expected: "Air va AIR uchun bir xil mahsulotlar chiqishi kerak.",
        actual:
          "NAMUNA: Air uchun mahsulot chiqdi, AIR uchun natija topilmadi. Bu haqiqiy tekshiruv natijasi emas.",
      });
    if (!beginDraft(item)) return;
    setMessage(
      "Namuna tahrirlash uchun ochildi. Uni o‘zingizning tekshiruvingizga moslang.",
    );
  }
  function remove(item) {
    const index = items.findIndex((entry) => entry.id === item.id);
    updateItems((current) => current.filter((entry) => entry.id !== item.id));
    setRemoved({ item, index });
    setMessage(`${meta.singular} o‘chirildi.`);
    if (draft?.id === item.id) close(true);
  }
  function undo() {
    if (!removed) return;
    setRevealId(removed.item.id);
    updateItems((current) => {
      const result = [...current];
      if (!result.some((item) => item.id === removed.item.id))
        result.splice(Math.min(removed.index, result.length), 0, removed.item);
      return result;
    });
    setRemoved(null);
    setMessage("Yozuv tiklandi.");
  }
  function changeStatus(id, status) {
    const updatedAt = new Date().toISOString();
    updateItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status, updatedAt } : item,
      ),
    );
    if (draft?.id === id) {
      const saved = items.find((item) => item.id === id);
      savedBaselineRef.current = draftSnapshot({
        ...saved,
        status,
        updatedAt,
      });
      patchDraft({ status });
    }
    setMessage("Holat yangilandi.");
  }
  async function attach(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || !draft) return;
    const targetId = draft.id;
    const existingCount = draft.evidence?.length || 0;
    if (existingCount + files.length > 3) {
      setError("Har bir report uchun eng ko‘pi bilan 3 ta rasm mumkin.");
      return;
    }
    const invalid = files.find(
      (file) =>
        !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
          file.type,
        ) || file.size > 1024 * 1024,
    );
    if (invalid) {
      setError(
        `“${invalid.name}” mos emas. PNG, JPG, WEBP yoki GIF; har bir rasm 1 MB gacha bo‘lsin.`,
      );
      return;
    }
    setUploading(true);
    setError("");
    try {
      const evidence = await Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () =>
                reject(new Error("Rasmni o‘qib bo‘lmadi."));
              reader.onload = () => {
                const image = new Image();
                image.onload = () =>
                  resolve({
                    id: uid(),
                    name: file.name,
                    type: file.type,
                    dataUrl: reader.result,
                  });
                image.onerror = () => reject(new Error("Rasm fayli buzilgan."));
                image.src = reader.result;
              };
              reader.readAsDataURL(file);
            }),
        ),
      );
      setDraft((current) =>
        current?.id === targetId
          ? {
              ...current,
              evidence: [...(current.evidence || []), ...evidence].slice(0, 3),
            }
          : current,
      );
    } catch {
      setError("Rasm yuklanmadi. Boshqa rasm bilan qayta urinib ko‘ring.");
    } finally {
      setUploading(false);
    }
  }
  function exportAll() {
    if (isReport) {
      downloadFile(
        items.map(reportMarkdown).join("\n\n---\n\n"),
        `qa-${session.id.slice(0, 8)}-bug-reports.md`,
        "text/markdown;charset=utf-8",
      );
      return;
    }
    const fields =
      tab === "cases"
        ? [
            "id",
            "title",
            "requirementId",
            "checkId",
            "preconditions",
            "data",
            "steps",
            "expected",
            "actual",
            "status",
          ]
        : [
            "id",
            "title",
            "requirementId",
            "checkId",
            "expected",
            "actual",
            "status",
            "priority",
          ];
    const rows = [
      fields,
      ...items.map((item) => fields.map((key) => asText(item[key]))),
    ];
    downloadFile(
      "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
      `qa-${session.id.slice(0, 8)}-${tab}.csv`,
      "text/csv;charset=utf-8",
    );
  }

  const visibleItems = useMemo(
    () => items.filter((item) => matchesDocument(item, query, filter)),
    [items, query, filter],
  );
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visibleItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  useEffect(() => setPage(1), [session.id, tab]);
  useEffect(
    () => setPage((current) => Math.min(current, pageCount)),
    [pageCount],
  );
  useEffect(() => {
    if (!revealId) return;
    const item = items.find((entry) => entry.id === revealId);
    if (!item) return;
    const matches = matchesDocument(item, query, filter);
    if (!matches) {
      setQuery("");
      setFilter("all");
    }
    const index = (matches ? visibleItems : items).findIndex(
      (entry) => entry.id === revealId,
    );
    setPage(Math.floor(index / PAGE_SIZE) + 1);
    setRevealId(null);
  }, [items, visibleItems, revealId, query, filter]);
  const recordKeys = useMemo(
    () =>
      documentDisplayKeys(
        items,
        tab === "reports" ? "BUG" : tab === "cases" ? "TC" : "CHK",
      ),
    [items, tab],
  );
  const recordKey = (item) => recordKeys.get(item.id);
  const learnerItems = items.filter((item) => !isSampleDocument(item));
  const completed = learnerItems.filter((item) =>
    isReport
      ? item.status === "Closed"
      : ["Passed", "Failed"].includes(item.status),
  ).length;
  return (
    <section className="workspace" aria-label={meta.title}>
      <header className="workspace-header">
        <div>
          <h2 ref={headingRef} tabIndex={-1}>
            {isReport
              ? "Muammolar ro‘yxati"
              : tab === "cases"
                ? "Test-case’lar ro‘yxati"
                : "Tekshiruvlar ro‘yxati"}
            <span className="workspace-total">{items.length}</span>
          </h2>
          <p>{meta.subtitle}</p>
        </div>
        <div className="workspace-header-actions">
          <button
            type="button"
            className="btn btn-secondary workspace-export"
            onClick={exportAll}
            disabled={!items.length}
          >
            <Download size={16} />{" "}
            {isReport ? "Markdown eksport" : "CSV eksport"}
          </button>
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Plus size={16} />
            {meta.action}
          </button>
        </div>
      </header>

      <details className="workspace-guide">
        <summary>
          <BookOpen size={15} /> {meta.singular} qanday yoziladi?
        </summary>
        <p>{meta.intro}</p>
      </details>
      <div className="workspace-summary">
        <div>
          <span>Jami yozuv</span>
          <strong>{items.length}</strong>
        </div>
        <div>
          <span>{isReport ? "Ochiq muammolar" : "Bajarilgan testlar"}</span>
          <strong>
            {isReport ? learnerItems.length - completed : completed}
          </strong>
        </div>
        <div>
          <span>{isReport ? "Yopilgan" : "Xato aniqlangan"}</span>
          <strong className={isReport ? "" : "workspace-error-number"}>
            {isReport
              ? completed
              : learnerItems.filter((item) => item.status === "Failed").length}
          </strong>
        </div>
        <div className="workspace-summary-note">
          <Check size={16} />
          <span>Natijalar qo‘lda belgilanadi</span>
        </div>
      </div>

      {message && (
        <div className="workspace-message" role="status">
          <span>{message}</span>
          {removed && (
            <button type="button" onClick={undo}>
              <RotateCcw size={14} /> Qaytarish
            </button>
          )}
          <button
            type="button"
            className="workspace-message-close"
            aria-label="Xabarni yopish"
            onClick={() => {
              setMessage("");
              setRemoved(null);
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {draft && (
        <form ref={editorRef} className="workspace-editor" onSubmit={save}>
          <div className="workspace-editor-heading">
            <div>
              <span className="workspace-eyebrow">
                {editing ? "TAHRIRLASH" : "YANGI YOZUV"}
              </span>
              <h2>{meta.singular}</h2>
            </div>
            <button
              type="button"
              className="workspace-icon-btn"
              onClick={() => close()}
              aria-label="Formani yopish"
            >
              <X size={20} />
            </button>
          </div>
          <p className="workspace-editor-tip">
            {isReport
              ? "“Ishlamayapti” o‘rniga aniq holatni yozing. Masalan: “Bo‘sh email bilan profil saqlanmoqda”. * belgili maydonlar majburiy."
              : "Bir yozuv — bitta tekshiruv. Natijani tekshiruvdan keyin to‘ldiring. * belgili maydonlar majburiy."}
          </p>
          {recovery && (
            <p className="info-note workspace-recovery-note" role="status">
              {recovery.reason === "deleted"
                ? "Asl yozuv o‘chirilgan."
                : "Asl yozuvning yangi saqlangan nusxasi bor."}{" "}
              Sizning tugallanmagan qoralamangiz alohida nusxa sifatida
              tiklandi. Saqlash tugmasi yangi yozuv yaratadi; asl yozuv
              o‘zgarmaydi.
            </p>
          )}
          <div className="workspace-form-grid">
            <Field label="Sarlavha *" wide>
              <input
                className="field"
                name="title"
                required
                maxLength={180}
                value={draft.title}
                onChange={(event) => patchDraft({ title: event.target.value })}
                placeholder={
                  isReport
                    ? "Qayerda, nima noto‘g‘ri ishlayapti?"
                    : "Nimani tekshirasiz?"
                }
              />
            </Field>
            <Field
              label="Bog‘liq talab"
              hint="Talablar bilan bog‘lasangiz, test qamrovini kuzatish oson bo‘ladi."
            >
              <select
                className="field"
                value={draft.requirementId}
                onChange={(event) => chooseRequirement(event.target.value)}
              >
                <option value="">Talabni tanlang (ixtiyoriy)</option>
                {requirements.map((requirement) => (
                  <option key={requirement.id} value={requirement.id}>
                    {requirement.id} — {requirement.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Holat">
              <select
                className="field"
                value={draft.status}
                onChange={(event) => patchDraft({ status: event.target.value })}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </Field>
            {draft.requirementId && (
              <div className="workspace-selected-requirement">
                <BookOpen size={15} />
                <p>
                  {requirements.find((item) => item.id === draft.requirementId)
                    ?.description || "Talab tafsilotlari ssenariy sahifasida."}
                </p>
              </div>
            )}
            <Field
              label="Avto baholash mezoni"
              hint={
                draft.requirementId &&
                !CHECK_DEFINITIONS.some(
                  (item) => item.requirementId === draft.requirementId,
                )
                  ? "Bu talabni qo‘lda tekshirasiz; unga hozircha avto mezon qo‘shilmagan."
                  : "Natijangiz faqat tanlangan aniq holat bilan solishtiriladi. Mezon tanlanmagan yozuv avtomatik holat balliga kirmaydi."
              }
              wide
            >
              <select
                className="field"
                value={draft.checkId || ""}
                onChange={(event) => {
                  const check = CHECK_DEFINITIONS.find(
                    (item) => item.id === event.target.value,
                  );
                  patchDraft({
                    checkId: event.target.value,
                    ...(check
                      ? {
                          requirementId: check.requirementId,
                          ...(isReport
                            ? {
                                module:
                                  requirements.find(
                                    (item) => item.id === check.requirementId,
                                  )?.module || "",
                              }
                            : {}),
                        }
                      : {}),
                  });
                }}
              >
                <option value="">
                  Mezon tanlang — avtomatik solishtirish uchun
                </option>
                {CHECK_DEFINITIONS.filter(
                  (item) =>
                    requirements.some(
                      (requirement) => requirement.id === item.requirementId,
                    ) &&
                    (!draft.requirementId ||
                      item.requirementId === draft.requirementId),
                ).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} · {item.title}
                  </option>
                ))}
              </select>
            </Field>
            {draft.checkId && (
              <div className="workspace-selected-requirement">
                <BookOpen size={15} />
                <p>
                  {
                    CHECK_DEFINITIONS.find((item) => item.id === draft.checkId)
                      ?.description
                  }
                </p>
              </div>
            )}
            {tab === "cases" && (
              <>
                <Field
                  label="Boshlang‘ich shartlar"
                  hint="Test boshlanishidan oldin nima tayyor bo‘lishi kerak?"
                >
                  <textarea
                    className="field"
                    rows={3}
                    value={draft.preconditions || ""}
                    onChange={(event) =>
                      patchDraft({ preconditions: event.target.value })
                    }
                    placeholder="Masalan: savatda 1 ta mahsulot bor."
                  />
                </Field>
                <Field label="Test ma’lumotlari">
                  <textarea
                    className="field"
                    rows={3}
                    value={draft.data || ""}
                    onChange={(event) =>
                      patchDraft({ data: event.target.value })
                    }
                    placeholder="Masalan: miqdor = 2, promo = ..."
                  />
                </Field>
              </>
            )}
            {isReport && (
              <>
                <Field label="Modul">
                  <input
                    className="field"
                    value={draft.module || ""}
                    onChange={(event) =>
                      patchDraft({ module: event.target.value })
                    }
                    placeholder="Savat, profil, qidiruv..."
                  />
                </Field>
                <Field
                  label="Muhit"
                  hint="Brauzer, OS va kerak bo‘lsa ekran o‘lchamini yozing."
                >
                  <input
                    className="field"
                    value={draft.environment || ""}
                    placeholder="Masalan: Chrome 130 / Windows 11 / 1366 × 768"
                    onChange={(event) =>
                      patchDraft({ environment: event.target.value })
                    }
                  />
                </Field>
              </>
            )}
            {tab !== "checklist" && (
              <Field
                label={isReport ? "Takrorlash qadamlari *" : "Test qadamlari *"}
                hint="Har bir qadamni yangi qatordan yozing."
                wide
              >
                <textarea
                  className="field"
                  rows={4}
                  required
                  value={asText(draft.steps)}
                  onChange={(event) =>
                    patchDraft({ steps: event.target.value })
                  }
                  placeholder={"1. Sahifani oching.\n2. ...\n3. ..."}
                />
              </Field>
            )}
            <Field
              label={`Kutilgan natija${tab !== "checklist" ? " *" : ""}`}
              hint="Talab bo‘yicha nima bo‘lishi kerak?"
            >
              <textarea
                className="field"
                rows={3}
                required={tab !== "checklist"}
                value={draft.expected || ""}
                onChange={(event) =>
                  patchDraft({ expected: event.target.value })
                }
                placeholder="Tizim ... ko‘rsatishi kerak."
              />
            </Field>
            <Field
              label={`Haqiqiy natija${isReport ? " *" : ""}`}
              hint="Bajarganingizda aynan nima bo‘ldi?"
            >
              <textarea
                className="field"
                rows={3}
                required={isReport}
                value={draft.actual || ""}
                onChange={(event) => patchDraft({ actual: event.target.value })}
                placeholder={
                  isReport
                    ? "Tizim ... ko‘rsatdi."
                    : "Hali bajarilmagan bo‘lsa bo‘sh qoldiring."
                }
              />
            </Field>
            {isReport && (
              <Field
                label="Severity — ta’sir darajasi"
                hint="Critical: asosiy ish to‘xtaydi. Low: kichik ko‘rinish muammosi."
              >
                <select
                  className="field"
                  value={draft.severity}
                  onChange={(event) =>
                    patchDraft({ severity: event.target.value })
                  }
                >
                  {["Critical", "High", "Medium", "Low"].map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </Field>
            )}
            {(isReport || tab === "checklist") && (
              <Field
                label="Priority — ustuvorlik"
                hint="P1: avval, P2: odatiy, P3: keyinroq."
              >
                <select
                  className="field"
                  value={draft.priority || "P2"}
                  onChange={(event) =>
                    patchDraft({ priority: event.target.value })
                  }
                >
                  {["P1", "P2", "P3"].map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          {isReport && (
            <div className="workspace-evidence-field">
              <div className="workspace-evidence-heading">
                <div>
                  <strong>Screenshot dalillari</strong>
                  <p>
                    PNG, JPG, WEBP yoki GIF · har biri 1 MB gacha · 3 tagacha
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={uploading || draft.evidence?.length >= 3}
                  onClick={() => imageInput.current?.click()}
                >
                  <ImagePlus size={16} />{" "}
                  {uploading ? "Yuklanmoqda…" : "Rasm biriktirish"}
                </button>
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  onChange={attach}
                  hidden
                />
              </div>
              {draft.evidence?.length > 0 && (
                <div className="workspace-evidence-list">
                  {draft.evidence.map((item) => (
                    <div key={item.id} className="workspace-evidence">
                      <button
                        type="button"
                        className="workspace-thumbnail"
                        aria-label={`${item.name} rasmini ko‘rish`}
                        onClick={() => setPreview(item)}
                      >
                        <EvidenceImage evidence={item} />
                      </button>
                      <span title={item.name}>{item.name}</span>
                      <div>
                        <button
                          type="button"
                          className="workspace-icon-btn"
                          onClick={() => downloadImage(item)}
                          aria-label={`${item.name} rasmini yuklash`}
                        >
                          <Download size={15} />
                        </button>
                        <button
                          type="button"
                          className="workspace-icon-btn workspace-danger"
                          onClick={() =>
                            patchDraft({
                              evidence: draft.evidence.filter(
                                (evidence) => evidence.id !== item.id,
                              ),
                            })
                          }
                          aria-label={`${item.name} rasmini olib tashlash`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {error && (
            <p className="workspace-error" role="alert">
              {error}
            </p>
          )}
          <footer className="workspace-editor-footer">
            <span role="status">
              {draftStored
                ? "Qoralama shu brauzer varag‘ida saqlanadi. Ro‘yxat va bahoga kiritish uchun Saqlashni bosing."
                : "Qoralamani vaqtincha saqlab bo‘lmadi. Sahifadan chiqishdan oldin yozuvni saqlang."}
            </span>
            <div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => close()}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploading}
              >
                <Check size={16} />{" "}
                {editing ? "O‘zgarishlarni saqlash" : "Saqlash"}
              </button>
            </div>
          </footer>
        </form>
      )}

      <div className="workspace-toolbar">
        <div className="workspace-search">
          <Search size={16} />
          <input
            aria-label="Yozuvlarni qidirish"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Sarlavha yoki talab bo‘yicha qidirish…"
          />
        </div>
        <select
          className="field workspace-filter"
          aria-label="Holat bo‘yicha filtrlash"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Barcha holatlar</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <span className="workspace-toolbar-count">
          {visibleItems.length} ta yozuv
        </span>
      </div>

      {!items.length ? (
        <div className="workspace-empty">
          <span className="workspace-empty-icon">
            <Icon size={29} />
          </span>
          <h2>{meta.empty}</h2>
          <p>{meta.example}</p>
          <div>
            <button type="button" className="btn btn-primary" onClick={openNew}>
              <Plus size={16} />
              {meta.action}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addSample}
            >
              Namuna bilan boshlash <ArrowUpRight size={15} />
            </button>
          </div>
          <small>
            Namuna mashq uchun. U haqiqiy test natijasi hisoblanmaydi.
          </small>
        </div>
      ) : (
        <>
          <div className="workspace-list-meta">
            <span>
              {visibleItems.length} / {items.length} yozuv
            </span>
            <button type="button" onClick={addSample}>
              Namuna formani ko‘rish <ArrowUpRight size={13} />
            </button>
          </div>
          {!visibleItems.length && (
            <div className="workspace-no-results">
              <Search size={22} />
              <p>Qidiruvga mos yozuv topilmadi.</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                  setPage(1);
                }}
              >
                Filtrni tozalash
              </button>
            </div>
          )}
          <DocumentPagination
            page={currentPage}
            pages={pageCount}
            total={visibleItems.length}
            onChange={setPage}
          />
          <div className="workspace-records">
            {visibleItems.length > 0 && (
              <div className="workspace-table-header" aria-hidden="true">
                <span>ID</span>
                <span>{isReport ? "Muammo" : "Tekshiruv"}</span>
                <span>Holat</span>
                <span>Amallar</span>
              </div>
            )}
            {pageItems.map((item) => (
              <article key={item.id} className="workspace-record">
                <div className="workspace-record-top">
                  <span
                    className={`workspace-record-index ${isReport ? "workspace-record-bug" : ""}`}
                  >
                    {recordKey(item)}
                  </span>
                  <div className="workspace-record-title">
                    <h3>{item.title}</h3>
                    <div className="workspace-record-tags">
                      {item.requirementId && (
                        <span className="workspace-requirement-tag">
                          {item.requirementId}
                        </span>
                      )}
                      {isReport && (
                        <span
                          className={`workspace-severity workspace-severity-${item.severity?.toLowerCase()}`}
                        >
                          {item.severity}
                        </span>
                      )}
                      {item.priority && <span>{item.priority}</span>}
                      <span title="Avtomatik baholash mezoni">
                        {item.checkId || "Avto mezon tanlanmagan"}
                      </span>
                      {item.module && <span>{item.module}</span>}
                    </div>
                  </div>
                  <select
                    className={`workspace-status workspace-status-${slug(item.status).toLowerCase()}`}
                    aria-label={`${item.title}: holati`}
                    value={item.status}
                    onChange={(event) =>
                      changeStatus(item.id, event.target.value)
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <div className="workspace-record-actions">
                    <button
                      type="button"
                      className="workspace-icon-btn"
                      onClick={() => edit(item)}
                      aria-label={`${item.title}: tahrirlash`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="workspace-icon-btn workspace-danger"
                      onClick={() => remove(item)}
                      aria-label={`${item.title}: o‘chirish`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="workspace-record-details">
                  <details className="workspace-record-disclosure">
                    <summary>
                      {tab === "checklist"
                        ? "Kutilgan va haqiqiy natija"
                        : "Qadamlar va test tafsilotlari"}
                    </summary>
                    {tab !== "checklist" && (
                      <div>
                        <div className="workspace-expanded-details">
                          {item.preconditions && (
                            <div>
                              <strong>Boshlang‘ich shartlar</strong>
                              <p>{item.preconditions}</p>
                            </div>
                          )}
                          {item.data && (
                            <div>
                              <strong>Test ma’lumotlari</strong>
                              <p>{item.data}</p>
                            </div>
                          )}
                          <div>
                            <strong>Qadamlar</strong>
                            <p>
                              {asText(item.steps) || "Qadamlar kiritilmagan."}
                            </p>
                          </div>
                          {isReport && (
                            <div>
                              <strong>Muhit</strong>
                              <p>{item.environment || "Kiritilmagan."}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="workspace-results">
                      <div>
                        <span>Kutilgan natija</span>
                        <p>{item.expected || "Hali kiritilmagan."}</p>
                      </div>
                      <div>
                        <span>Haqiqiy natija</span>
                        <p className={!item.actual ? "workspace-muted" : ""}>
                          {item.actual || "Testni bajargach natijani yozing."}
                        </p>
                      </div>
                    </div>
                  </details>
                  {isReport && (
                    <div className="workspace-report-bottom">
                      <div className="workspace-report-attachments">
                        {item.evidence?.length ? (
                          item.evidence.map((evidence) => (
                            <button
                              key={evidence.id}
                              type="button"
                              onClick={() => setPreview(evidence)}
                            >
                              <ImagePlus size={14} />
                              {evidence.name}
                            </button>
                          ))
                        ) : (
                          <span>Rasm biriktirilmagan</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="workspace-text-btn"
                        onClick={() =>
                          downloadFile(
                            reportMarkdown(item),
                            `bug-${slug(item.id)}.md`,
                            "text/markdown;charset=utf-8",
                          )
                        }
                      >
                        <Download size={14} /> Report .md
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          <DocumentPagination
            page={currentPage}
            pages={pageCount}
            total={visibleItems.length}
            onChange={(nextPage) => {
              setPage(nextPage);
              headingRef.current?.focus();
            }}
            bottom
          />
        </>
      )}

      {preview && (
        <div
          className="workspace-lightbox"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreview(null);
          }}
        >
          <div
            className="workspace-lightbox-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Screenshot ko‘rish"
            tabIndex={-1}
            ref={previewRef}
          >
            <header>
              <span>{preview.name}</span>
              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => downloadImage(preview)}
                >
                  <Download size={16} /> Yuklab olish
                </button>
                <button
                  type="button"
                  className="workspace-icon-btn"
                  aria-label="Rasmni yopish"
                  onClick={() => setPreview(null)}
                >
                  <X size={22} />
                </button>
              </div>
            </header>
            <EvidenceImage evidence={preview} preview />
          </div>
        </div>
      )}
    </section>
  );
}

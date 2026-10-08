import React, { useEffect, useRef, useState } from "react";
import { Play, Braces, Clock3, Copy, Check } from "lucide-react";
import { simulateApi } from "../lib/scenario.js";
const presets = [
  ["Mahsulotlar", "GET", "/products", ""],
  ["Qidiruv", "GET", "/products?search=air", ""],
  ["Buyurtmalar", "GET", "/orders", ""],
  ["Login", "POST", "/login", '{"email":"qa@lab.uz","password":"Test123!"}'],
  ["Kupon", "POST", "/coupons/check", '{"code":"QA10"}'],
];
const requestKey = (sessionId) => `qa-lab-api-request-v1:${sessionId}`;
function restoredRequest(sessionId) {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(requestKey(sessionId)) || "null",
    );
    return value &&
      ["GET", "POST"].includes(value.method) &&
      typeof value.path === "string" &&
      typeof value.body === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
export default function ApiLab({ session, onUpdate }) {
  const [restored] = useState(() => restoredRequest(session.id));
  const [method, setMethod] = useState(restored?.method || "GET"),
    [path, setPath] = useState(restored?.path || "/products"),
    [body, setBody] = useState(restored?.body || ""),
    [response, setResponse] = useState(null),
    [error, setError] = useState(""),
    [copyError, setCopyError] = useState(""),
    [copied, setCopied] = useState(false);
  const [requestStored, setRequestStored] = useState(true);
  const copyTimer = useRef(null);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        requestKey(session.id),
        JSON.stringify({ method, path, body }),
      );
      setRequestStored(true);
    } catch {
      setRequestStored(false);
    }
  }, [session.id, method, path, body]);
  function run(event) {
    event?.preventDefault();
    setError("");
    setCopyError("");
    setCopied(false);
    let parsed = {};
    try {
      parsed = body ? JSON.parse(body) : {};
    } catch {
      setError("JSON noto‘g‘ri. Kalit va matnlarni qo‘shtirnoqqa oling.");
      return;
    }
    const endpoint = path.trim();
    if (!/^\/(?![\/\\])/.test(endpoint)) {
      setError(
        "Mahalliy endpoint kiriting: masalan, /products. To‘liq tashqi URL qabul qilinmaydi.",
      );
      return;
    }
    try {
      // This is a synchronous local simulator. Artificial network delays used
      // to let an old request overwrite newer cart edits after navigation.
      const request = { method, path: endpoint, body: parsed };
      const result = simulateApi(
        session.scenario,
        session.productState,
        session.fixedBugIds,
        request,
      );
      setResponse({
        status: result.status,
        body: result.body,
        duration: result.duration,
        request: { method, path: endpoint, body },
      });
      const activity = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        action: `API ${method} ${endpoint}`,
        detail: `${result.status} · ${result.duration} ms (simulyatsiya)`,
      };
      onUpdate((current) => {
        if (current.id !== session.id) return {};
        const latest = simulateApi(
          current.scenario,
          current.productState,
          current.fixedBugIds,
          request,
        );
        return {
          ...(latest.productState ? { productState: latest.productState } : {}),
          activity: [activity, ...current.activity].slice(0, 100),
        };
      });
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="api-layout">
      <section className="panel api-main">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">API / So‘rov va javob</span>
            <h2>So‘rov yuborish</h2>
          </div>
          <Braces size={24} />
        </div>
        <p className="muted">
          So‘rov, status kodi va javob tanasini talab bilan solishtiring. Bu
          demo API do‘kon bilan bir xil mashq ma’lumotidan foydalanadi.
        </p>
        <div className="api-presets">
          {presets.map(([label, m, p, b]) => (
            <button
              className="chip"
              key={label}
              onClick={() => {
                setMethod(m);
                setPath(p);
                setBody(b);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <form className="request-bar" onSubmit={run}>
          <select
            aria-label="HTTP method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option>GET</option>
            <option>POST</option>
          </select>
          <input
            aria-label="Endpoint"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            <Play size={15} />
            Yuborish
          </button>
        </form>
        <label className="field">
          Request body (JSON)
          <textarea
            aria-label="Request body (JSON)"
            className="code-input"
            rows={7}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={'{\n  "code": "..."\n}'}
          />
        </label>
        {!requestStored && (
          <p className="error-message" role="alert">
            So‘rov qoralamasi saqlanmadi. Sahifadan chiqishdan oldin kerakli
            matnni nusxalang.
          </p>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="response-head">
          <h3>Response</h3>
          {response && (
            <div className="inline">
              <span
                className={`badge ${response.status < 400 ? "success" : "danger"}`}
              >
                {response.status}
              </span>
              <span className="muted">
                <Clock3 size={12} /> {response.duration} ms · simulyatsiya
              </span>
              <button
                className="icon-button"
                aria-label="Javobni nusxalash"
                onClick={async () => {
                  setCopyError("");
                  try {
                    await navigator.clipboard.writeText(
                      JSON.stringify(response.body, null, 2),
                    );
                    setCopied(true);
                    clearTimeout(copyTimer.current);
                    copyTimer.current = setTimeout(
                      () => setCopied(false),
                      1200,
                    );
                  } catch {
                    setCopyError(
                      "Nusxalashga ruxsat yo‘q. Javob matnini belgilang.",
                    );
                  }
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          )}
        </div>
        {copyError && (
          <p className="error-message" role="alert">
            {copyError}
          </p>
        )}
        {response && (
          <p className="muted api-response-request">
            Javob:{" "}
            <code>
              {response.request.method} {response.request.path}
            </code>
            {(response.request.method !== method ||
              response.request.path !== path.trim() ||
              response.request.body !== body) && (
              <span>
                {" "}
                · So‘rov o‘zgardi. Yangi javob uchun Yuborishni bosing.
              </span>
            )}
          </p>
        )}
        <pre className="response-code">
          {response
            ? JSON.stringify(response.body, null, 2)
            : "// So‘rov yuboring. Javob shu yerda paydo bo‘ladi."}
        </pre>
      </section>
      <aside className="panel api-guide">
        <span className="eyebrow">TEST ORACLE</span>
        <h3>Nimani tekshirasiz?</h3>
        <ol className="guide-steps">
          <li>Status kod talabga mosmi?</li>
          <li>Majburiy maydonlar va ularning turi to‘g‘rimi?</li>
          <li>Qidiruv, saralash va hisob-kitob mosmi?</li>
          <li>Noto‘g‘ri qiymatga tushunarli xato qaytadimi?</li>
          <li>So‘rov do‘kon holatini to‘g‘ri o‘zgartirdimi?</li>
        </ol>
        <div className="info-note">
          Demo email, parol va kuponlar “Talablar” bo‘limida. Ushbu API
          brauzerda simulyatsiya qilinadi; Postman uchun ochiq server endpointi
          emas.
        </div>
        <h3>Qo‘shimcha endpointlar</h3>
        <code>POST /orders</code>
        <code>POST /orders/:id/cancel</code>
        <p className="muted">
          Buyurtma yaratish uchun do‘konda savat tayyorlang. Talablar hamda
          do‘kon formalaridagi maydonlardan foydalaning.
        </p>
      </aside>
    </div>
  );
}

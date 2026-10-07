import React, { useState } from "react";
import { Play, Braces, Clock3, Copy, Check } from "lucide-react";
import { simulateApi } from "../lib/scenario.js";
const presets = [
  ["Mahsulotlar", "GET", "/products", ""],
  ["Qidiruv", "GET", "/products?search=air", ""],
  ["Buyurtmalar", "GET", "/orders", ""],
  ["Login", "POST", "/login", '{"email":"qa@lab.uz","password":"Test123!"}'],
  ["Kupon", "POST", "/coupons/check", '{"code":"QA10"}'],
];
export default function ApiLab({ session, onUpdate }) {
  const [method, setMethod] = useState("GET"),
    [path, setPath] = useState("/products"),
    [body, setBody] = useState(""),
    [response, setResponse] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  async function run() {
    setError("");
    let parsed = {};
    try {
      parsed = body ? JSON.parse(body) : {};
    } catch {
      setError("JSON noto‘g‘ri. Kalit va matnlarni qo‘shtirnoqqa oling.");
      return;
    }
    if (!path.startsWith("/")) {
      setError("Endpoint / belgisi bilan boshlanishi kerak.");
      return;
    }
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 220));
      const result = simulateApi(
        session.scenario,
        session.productState,
        session.fixedBugIds,
        { method, path, body: parsed },
      );
      setResponse({
        status: result.status,
        body: result.body,
        duration: result.duration,
      });
      onUpdate((current) =>
        current.id !== session.id
          ? {}
          : {
              ...(result.productState
                ? { productState: result.productState }
                : {}),
              activity: [
                {
                  id: crypto.randomUUID(),
                  at: new Date().toISOString(),
                  action: `API ${method} ${path}`,
                  detail: `${result.status} · ${result.duration} ms`,
                },
                ...current.activity,
              ].slice(0, 100),
            },
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="api-layout">
      <section className="panel api-main">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">API WORKBENCH</span>
            <h2>Javobni ham tekshiring.</h2>
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
        <div className="request-bar">
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
          <button className="btn btn-primary" onClick={run} disabled={busy}>
            <Play size={15} />
            {busy ? "Kutilmoqda…" : "Yuborish"}
          </button>
        </div>
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
                <Clock3 size={12} /> {response.duration} ms
              </span>
              <button
                className="icon-button"
                aria-label="Javobni nusxalash"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      JSON.stringify(response.body, null, 2),
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  } catch {
                    setError(
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

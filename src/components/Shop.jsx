import React, { useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  LogOut,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import {
  calculateCart,
  changeCart,
  filterProducts,
  initialProductState,
  money,
  simulateApi,
} from "../lib/scenario.js";
import "../shop.css";

function ProductArt({ product, small = false }) {
  return (
    <div
      className={`shop-art shop-art-${product.icon}${small ? " shop-art-small" : ""}`}
    >
      <img
        src={`/products/${product.icon}.jpg`}
        alt={`${product.name} — namuna surati`}
        width="720"
        height="720"
        loading={small ? "eager" : "lazy"}
        decoding="async"
      />
    </div>
  );
}
function Empty({ icon: Icon = ShoppingBag, title, children, action }) {
  return (
    <div className="shop-empty">
      <span>
        <Icon size={32} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export default function Shop({ session, onUpdate }) {
  const scenario = session.scenario;
  const state = { ...initialProductState(scenario), ...session.productState };
  const fixed = session.fixedBugIds || [];
  const totals = calculateCart(scenario, state, fixed);
  const products = filterProducts(scenario, state, fixed);
  const selected = scenario.products.find(
    (p) => p.id === state.selectedProduct,
  );
  const mutate = (action, detail, transform) =>
    onUpdate((current) => {
      const currentState = {
        ...initialProductState(current.scenario),
        ...current.productState,
      };
      const productState = transform(
        currentState,
        current.scenario,
        current.fixedBugIds || [],
      );
      const activity = action
        ? [
            {
              id: crypto.randomUUID(),
              at: new Date().toISOString(),
              action,
              detail,
            },
            ...(current.activity || []),
          ].slice(0, 100)
        : current.activity || [];
      return { productState, activity };
    });
  const patch = (values) =>
    mutate(null, null, (previous) => ({ ...previous, ...values }));
  const navigate = (view) =>
    mutate("Sahifa ochildi", view, (previous) => ({
      ...previous,
      view,
      errors: {},
      notice: "",
      selectedProduct: null,
    }));
  const addToCart = (product) =>
    mutate("Savatga qo‘shish", product.name, (previous, s, fixes) =>
      changeCart(
        s,
        previous,
        fixes,
        product.id,
        (previous.cart.find((l) => l.productId === product.id)?.quantity || 0) +
          1,
      ),
    );
  const apiAction = (method, path, body, label, callback) =>
    mutate(label, `${method} ${path}`, (previous, s, fixes) => {
      const response = simulateApi(s, previous, fixes, {
        method,
        path,
        body: typeof body === "function" ? body(previous) : body,
      });
      const next = response.productState || previous;
      return callback
        ? callback(next, response)
        : { ...next, notice: response.body.error || next.notice };
    });
  const field = (group, key, value) =>
    mutate(null, null, (previous) => ({
      ...previous,
      [group]: { ...previous[group], [key]: value },
      errors: { ...previous.errors, [key]: null },
    }));
  useEffect(() => {
    if (!state.selectedProduct) return undefined;
    const close = (e) => {
      if (e.key === "Escape")
        onUpdate((current) => ({
          productState: { ...current.productState, selectedProduct: null },
        }));
      if (e.key === "Tab") {
        const controls = [
          ...document.querySelectorAll(
            ".shop-product-modal button:not(:disabled), .shop-product-modal input, .shop-product-modal a[href]",
          ),
        ];
        const first = controls[0],
          last = controls.at(-1);
        if (first && e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (last && !e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [state.selectedProduct, onUpdate]);

  const orderSummary = (checkout = false) => (
    <aside className="shop-summary">
      <h3>Buyurtma xulosasi</h3>
      <div>
        <span>Mahsulotlar ({totals.quantity})</span>
        <strong data-testid="cart-subtotal">{money(totals.subtotal)}</strong>
      </div>
      <div>
        <span>Yetkazib berish</span>
        <strong
          data-testid="delivery-fee"
          className={totals.delivery === 0 ? "shop-positive" : ""}
        >
          {totals.delivery ? money(totals.delivery) : "Bepul"}
        </strong>
      </div>
      {totals.discount > 0 && (
        <div>
          <span>Chegirma · {state.coupon}</span>
          <strong className="shop-positive">−{money(totals.discount)}</strong>
        </div>
      )}
      <div className="shop-total">
        <span>Jami</span>
        <strong data-testid="cart-total">{money(totals.total)}</strong>
      </div>
      <p className="shop-summary-note">
        <Truck size={16} /> {money(300000)} dan boshlab yetkazish bepul
      </p>
      {!checkout && (
        <button
          className="shop-button shop-button-wide"
          onClick={() => navigate("checkout")}
        >
          Rasmiylashtirish <ArrowRight size={17} />
        </button>
      )}
      <span className="shop-secure">
        <ShieldCheck size={15} /> Demo xarid · haqiqiy to‘lov olinmaydi
      </span>
    </aside>
  );

  return (
    <section
      className={`shop-shell shop-variant-${scenario.variant}`}
      aria-label={`${scenario.brand} test do‘koni`}
    >
      <div className="shop-top-note">
        <span>Elektronika va uy uchun mahsulotlar</span>
        <span>
          <Truck size={13} /> 300 000 so‘mdan yetkazish bepul
        </span>
      </div>
      <header className="shop-header">
        <button
          className="shop-brand"
          onClick={() => navigate("catalog")}
          aria-label="Do‘kon bosh sahifasi"
        >
          <ShoppingBag
            className="shop-brand-mark"
            size={24}
            strokeWidth={2.2}
          />
          {scenario.brand}
          <span className="shop-brand-label">market</span>
        </button>
        <nav aria-label="Do‘kon navigatsiyasi">
          <button
            className={state.view === "catalog" ? "is-active" : ""}
            onClick={() => navigate("catalog")}
          >
            Katalog
          </button>
          <button
            className={state.view === "orders" ? "is-active" : ""}
            onClick={() => navigate("orders")}
          >
            Buyurtmalar{" "}
            {state.orders.filter((o) => o.status === "new").length > 0 && (
              <small>
                {state.orders.filter((o) => o.status === "new").length}
              </small>
            )}
          </button>
        </nav>
        <div className="shop-header-actions">
          <button
            className={state.view === "account" ? "is-active" : ""}
            onClick={() => navigate("account")}
            aria-label="Hisob"
          >
            <UserRound size={19} />
            <span>{state.user ? state.user.name.split(" ")[0] : "Kirish"}</span>
          </button>
          <button
            className="shop-cart-button"
            onClick={() => navigate("cart")}
            aria-label={`Savat, ${totals.quantity} mahsulot`}
          >
            <ShoppingBag size={19} />
            <span>Savat</span>
            <b>{totals.quantity}</b>
          </button>
        </div>
      </header>
      {state.notice && (
        <div className="shop-notice" role="status">
          <CheckCircle2 size={17} />
          <span>{state.notice}</span>
          <button
            aria-label="Xabarni yopish"
            onClick={() => patch({ notice: "" })}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {state.view === "catalog" && (
        <>
          <div className="shop-promotion">
            <div>
              <strong>Xaridingizga 10% chegirma</strong>
              <p>100 000 so‘mdan xarid qiling. Kuponni savatda kiriting.</p>
            </div>
            <div className="shop-promotion-code">
              <span>Kupon kodi</span>
              <b>QA10</b>
            </div>
          </div>
          <div className="shop-catalog" id={`catalog-${session.id}`}>
            <div className="shop-section-heading">
              <div>
                <h3>Mahsulotlar</h3>
              </div>
              <span className="shop-catalog-subtitle">
                {scenario.products.length} ta mahsulot · narxlar so‘mda
              </span>
            </div>
            <div className="shop-tools">
              <label className="shop-search">
                <Search size={17} />
                <input
                  value={state.query}
                  onChange={(e) => patch({ query: e.target.value })}
                  placeholder="Mahsulot qidirish..."
                  aria-label="Mahsulot qidirish"
                />
                {state.query && (
                  <button
                    onClick={() => patch({ query: "" })}
                    aria-label="Qidiruvni tozalash"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
              <label className="shop-sort">
                <SlidersHorizontal size={16} />
                <select
                  aria-label="Mahsulotlarni saralash"
                  value={state.sort}
                  onChange={(e) =>
                    mutate("Saralash", e.target.value, (previous) => ({
                      ...previous,
                      sort: e.target.value,
                    }))
                  }
                >
                  <option value="popular">Tavsiya etilgan</option>
                  <option value="price-asc">Arzon avval</option>
                  <option value="price-desc">Qimmat avval</option>
                  <option value="rating">Yuqori reyting</option>
                </select>
              </label>
            </div>
            <div className="shop-catalog-layout">
              <div className="shop-categories" aria-label="Kategoriyalar">
                {scenario.categories.map((category) => (
                  <button
                    key={category}
                    className={state.category === category ? "is-active" : ""}
                    onClick={() =>
                      mutate("Kategoriya filtri", category, (previous) => ({
                        ...previous,
                        category,
                      }))
                    }
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="shop-results">
                <p className="shop-result-count">
                  {products.length} ta mahsulot
                </p>
                {!products.length ? (
                  <Empty
                    icon={Search}
                    title="Mahsulot topilmadi"
                    action={
                      <button
                        className="shop-button shop-button-secondary"
                        onClick={() =>
                          patch({ query: "", category: "Barchasi" })
                        }
                      >
                        Filtrlarni tozalash
                      </button>
                    }
                  >
                    Boshqa so‘z yoki kategoriya bilan qidiring.
                  </Empty>
                ) : (
                  <div className="shop-grid">
                    {products.map((product) => (
                      <article
                        className="shop-product"
                        key={product.id}
                        data-testid={`product-${product.id}`}
                      >
                        <button
                          className="shop-product-visual"
                          onClick={() => patch({ selectedProduct: product.id })}
                          aria-label={`${product.name} tafsilotlari`}
                        >
                          <ProductArt product={product} />
                          {product.stock === 0 ? (
                            <span className="shop-badge shop-badge-unavailable">
                              Tugagan
                            </span>
                          ) : product.stock <= 2 ? (
                            <span className="shop-badge">Oz qoldi</span>
                          ) : null}
                          <span className="shop-product-view">
                            <Plus size={16} />
                          </span>
                        </button>
                        <div className="shop-product-meta">
                          <span>{product.category}</span>
                          <span>
                            <Star size={12} fill="currentColor" />
                            {product.rating} <small>({product.reviews})</small>
                          </span>
                        </div>
                        <button
                          className="shop-product-name"
                          onClick={() => patch({ selectedProduct: product.id })}
                        >
                          {product.name}
                        </button>
                        <div className="shop-product-bottom">
                          <div>
                            <strong>{money(product.price)}</strong>
                            <small>
                              {product.stock
                                ? `${product.stock} dona mavjud`
                                : "Hozir mavjud emas"}
                            </small>
                          </div>
                          <button
                            className="shop-add"
                            onClick={() => addToCart(product)}
                            aria-label={`${product.name} savatga qo‘shish`}
                          >
                            <ShoppingBag size={16} />
                            <span>Savatga</span>
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="shop-delivery-info">
            <Truck size={20} />
            <div>
              <strong>Yetkazib berish</strong>
              <p>
                300 000 so‘mdan kam — 20 000 so‘m. 300 000 so‘mdan boshlab
                bepul.
              </p>
            </div>
          </div>
        </>
      )}

      {state.view === "cart" && (
        <div className="shop-page">
          <button className="shop-back" onClick={() => navigate("catalog")}>
            <ArrowLeft size={15} /> Katalogga qaytish
          </button>
          <div className="shop-page-heading">
            <h2>Sizning savatingiz</h2>
            <p>Miqdorlarni tekshiring va buyurtmani rasmiylashtiring.</p>
          </div>
          {!totals.lines.length ? (
            <Empty
              title="Savat hozircha bo‘sh"
              action={
                <button
                  className="shop-button"
                  onClick={() => navigate("catalog")}
                >
                  Mahsulotlarni ko‘rish <ArrowRight size={16} />
                </button>
              }
            >
              O‘zingizga yoqqan mahsulotni qo‘shishdan boshlang.
            </Empty>
          ) : (
            <div className="shop-two-column">
              <div>
                <div className="shop-cart-items">
                  {totals.lines.map((line) => (
                    <div className="shop-cart-line" key={line.productId}>
                      <ProductArt product={line.product} small />
                      <div className="shop-cart-line-info">
                        <span>{line.product.category}</span>
                        <h3>{line.product.name}</h3>
                        <strong>{money(line.product.price)}</strong>
                        <small>Omborda: {line.product.stock} dona</small>
                      </div>
                      <div className="shop-quantity">
                        <button
                          aria-label={`${line.product.name} miqdorini kamaytirish`}
                          disabled={line.quantity <= 1}
                          onClick={() =>
                            mutate(
                              "Miqdor kamaytirildi",
                              line.product.name,
                              (previous, s, f) =>
                                changeCart(
                                  s,
                                  previous,
                                  f,
                                  line.productId,
                                  (previous.cart.find(
                                    (l) => l.productId === line.productId,
                                  )?.quantity || 1) - 1,
                                ),
                            )
                          }
                        >
                          <Minus size={13} />
                        </button>
                        <output aria-label={`${line.product.name} miqdori`}>
                          {line.quantity}
                        </output>
                        <button
                          aria-label={`${line.product.name} miqdorini oshirish`}
                          onClick={() =>
                            mutate(
                              "Miqdor oshirildi",
                              line.product.name,
                              (previous, s, f) =>
                                changeCart(
                                  s,
                                  previous,
                                  f,
                                  line.productId,
                                  (previous.cart.find(
                                    (l) => l.productId === line.productId,
                                  )?.quantity || 0) + 1,
                                ),
                            )
                          }
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <button
                        className="shop-delete"
                        aria-label={`${line.product.name} savatdan o‘chirish`}
                        onClick={() =>
                          mutate(
                            "Savatdan o‘chirish",
                            line.product.name,
                            (previous, s, f) =>
                              changeCart(s, previous, f, line.productId, 0),
                          )
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </div>
                <form
                  className="shop-coupon"
                  onSubmit={(e) => {
                    e.preventDefault();
                    apiAction(
                      "POST",
                      "/coupons/check",
                      (previous) => ({ code: previous.couponInput }),
                      "Kupon tekshirildi",
                    );
                  }}
                >
                  <label htmlFor={`coupon-${session.id}`}>
                    Kuponingiz bormi?
                  </label>
                  <div>
                    <input
                      id={`coupon-${session.id}`}
                      placeholder="Kupon kodini kiriting"
                      value={state.couponInput}
                      onChange={(e) => patch({ couponInput: e.target.value })}
                    />
                    <button
                      className="shop-button shop-button-secondary"
                      type="submit"
                    >
                      Qo‘llash
                    </button>
                  </div>
                  {state.couponMessage && (
                    <p role="status">{state.couponMessage}</p>
                  )}
                  {state.coupon && (
                    <button
                      type="button"
                      className="shop-text-button"
                      onClick={() =>
                        patch({
                          coupon: null,
                          couponMessage: "",
                          couponInput: "",
                        })
                      }
                    >
                      Kuponni olib tashlash
                    </button>
                  )}
                </form>
              </div>
              {orderSummary()}
            </div>
          )}
        </div>
      )}

      {state.view === "checkout" && (
        <div className="shop-page">
          <button className="shop-back" onClick={() => navigate("cart")}>
            <ArrowLeft size={15} /> Savatga qaytish
          </button>
          <div className="shop-page-heading">
            <h2>Buyurtmani rasmiylashtirish</h2>
            <p>Aloqa ma’lumotlari, manzil va to‘lov usulini kiriting.</p>
          </div>
          {!totals.lines.length ? (
            <Empty
              title="Avval mahsulot tanlang"
              action={
                <button
                  className="shop-button"
                  onClick={() => navigate("catalog")}
                >
                  Katalogga o‘tish
                </button>
              }
            >
              Rasmiylashtirish uchun savatingizga mahsulot qo‘shing.
            </Empty>
          ) : (
            <div className="shop-two-column">
              <form
                className="shop-form shop-checkout-form"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  apiAction(
                    "POST",
                    "/orders",
                    (previous) => previous.checkout,
                    "Buyurtma yaratish",
                  );
                }}
              >
                <h3>
                  <span>01</span> Yetkazish ma’lumotlari
                </h3>
                <div className="shop-field">
                  <label htmlFor={`name-${session.id}`}>Ism va familiya</label>
                  <input
                    id={`name-${session.id}`}
                    autoComplete="off"
                    value={state.checkout.name}
                    placeholder="Masalan, Aziza Karimova"
                    onChange={(e) => field("checkout", "name", e.target.value)}
                    aria-invalid={!!state.errors.name}
                  />
                  {state.errors.name && (
                    <small role="alert">{state.errors.name}</small>
                  )}
                </div>
                <div className="shop-field">
                  <label htmlFor={`phone-${session.id}`}>Telefon raqami</label>
                  <input
                    id={`phone-${session.id}`}
                    type="tel"
                    autoComplete="off"
                    value={state.checkout.phone}
                    placeholder="+998 90 123 45 67"
                    onChange={(e) => field("checkout", "phone", e.target.value)}
                    aria-invalid={!!state.errors.phone}
                  />
                  {state.errors.phone && (
                    <small role="alert">{state.errors.phone}</small>
                  )}
                </div>
                <div className="shop-field">
                  <label htmlFor={`address-${session.id}`}>To‘liq manzil</label>
                  <textarea
                    id={`address-${session.id}`}
                    rows={3}
                    value={state.checkout.address}
                    placeholder="Shahar, ko‘cha, uy va xonadon"
                    onChange={(e) =>
                      field("checkout", "address", e.target.value)
                    }
                    aria-invalid={!!state.errors.address}
                  />
                  {state.errors.address && (
                    <small role="alert">{state.errors.address}</small>
                  )}
                </div>
                <h3>
                  <span>02</span> To‘lov usuli
                </h3>
                <div className="shop-payment-options">
                  <label
                    className={
                      state.checkout.payment === "cash" ? "is-active" : ""
                    }
                  >
                    <input
                      type="radio"
                      name={`payment-${session.id}`}
                      checked={state.checkout.payment === "cash"}
                      onChange={() => field("checkout", "payment", "cash")}
                    />
                    <span>
                      <strong>Qabul qilganda</strong>
                      <small>Naqd yoki terminal orqali</small>
                    </span>
                  </label>
                  <label
                    className={
                      state.checkout.payment === "card" ? "is-active" : ""
                    }
                  >
                    <input
                      type="radio"
                      name={`payment-${session.id}`}
                      checked={state.checkout.payment === "card"}
                      onChange={() => field("checkout", "payment", "card")}
                    />
                    <span>
                      <strong>Demo karta</strong>
                      <small>Faqat sinov kartasi</small>
                    </span>
                  </label>
                </div>
                {state.checkout.payment === "card" && (
                  <div className="shop-field">
                    <label htmlFor={`card-${session.id}`}>
                      Demo karta raqami
                    </label>
                    <input
                      id={`card-${session.id}`}
                      value={state.checkout.card}
                      placeholder="4242 4242 4242 4242"
                      autoComplete="off"
                      onChange={(e) =>
                        field("checkout", "card", e.target.value)
                      }
                    />
                    <span className="shop-field-hint">
                      Haqiqiy karta kiritmang. Test raqami yuqorida.
                    </span>
                    {state.errors.card && (
                      <small role="alert">{state.errors.card}</small>
                    )}
                  </div>
                )}
                {state.errors.cart && (
                  <p className="shop-error" role="alert">
                    {state.errors.cart}
                  </p>
                )}
                <button className="shop-button shop-button-wide" type="submit">
                  Buyurtma berish <ArrowRight size={16} />
                </button>
                <p className="shop-form-note">
                  Bu o‘quv do‘koni. Buyurtma faqat shu mashqda saqlanadi.
                </p>
              </form>
              {orderSummary(true)}
            </div>
          )}
        </div>
      )}

      {state.view === "orders" && (
        <div className="shop-page">
          <div className="shop-page-heading">
            <h2>Buyurtmalarim</h2>
            <p>
              Barcha xaridlaringiz bir joyda.{" "}
              <strong>
                {state.orders.filter((o) => o.status === "new").length} ta faol
                buyurtma.
              </strong>
            </p>
          </div>
          {!state.orders.length ? (
            <Empty
              icon={Package}
              title="Hali buyurtma yo‘q"
              action={
                <button
                  className="shop-button"
                  onClick={() => navigate("catalog")}
                >
                  Xaridni boshlash <ArrowRight size={16} />
                </button>
              }
            >
              Birinchi buyurtmangiz shu yerda paydo bo‘ladi.
            </Empty>
          ) : (
            <div className="shop-order-list">
              {state.orders.map((order) => (
                <article className="shop-order" key={order.id}>
                  <header>
                    <div>
                      <h3>{order.id}</h3>
                      <span>
                        {order.date} ·{" "}
                        {order.items.reduce((sum, l) => sum + l.quantity, 0)} ta
                        mahsulot
                      </span>
                    </div>
                    <span
                      className={`shop-order-status ${order.status === "cancelled" ? "is-cancelled" : ""}`}
                    >
                      <span />
                      {order.status === "new" ? "Yangi" : "Bekor qilingan"}
                    </span>
                  </header>
                  <div className="shop-order-products">
                    {order.items.map((item) => (
                      <div key={item.productId}>
                        <span>
                          {item.name} <small>× {item.quantity}</small>
                        </span>
                        <strong>{money(item.price * item.quantity)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="shop-order-address">
                    <span>
                      <UserRound size={14} />
                      {order.customer.name}
                    </span>
                    <span>{order.customer.phone}</span>
                    <span>{order.customer.address || "—"}</span>
                  </div>
                  <footer>
                    <div>
                      <small>Jami to‘lov</small>
                      <strong>{money(order.total)}</strong>
                    </div>
                    {order.status === "new" && (
                      <button
                        className="shop-button shop-button-secondary"
                        onClick={() =>
                          apiAction(
                            "POST",
                            `/orders/${order.id}/cancel`,
                            {},
                            "Buyurtma bekor qilish",
                          )
                        }
                      >
                        Bekor qilish
                      </button>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {state.view === "account" && (
        <div className="shop-page shop-account-page">
          {state.user ? (
            <div className="shop-account-card">
              <div className="shop-avatar">{state.user.name.charAt(0)}</div>
              <h2>Xush kelibsiz, {state.user.name.split(" ")[0]}!</h2>
              <p>{state.user.email}</p>
              <button
                className="shop-button"
                onClick={() => navigate("orders")}
              >
                Buyurtmalarim <ChevronRight size={16} />
              </button>
              <button
                className="shop-text-button"
                onClick={() =>
                  mutate("Hisobdan chiqish", state.user.email, (previous) => ({
                    ...previous,
                    user: null,
                    notice: "Hisobdan chiqdingiz.",
                  }))
                }
              >
                <LogOut size={15} /> Hisobdan chiqish
              </button>
            </div>
          ) : (
            <form
              className="shop-form shop-login-card"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                apiAction(
                  "POST",
                  "/login",
                  (previous) => previous.login,
                  "Hisobga kirish",
                  (next, response) =>
                    response.status === 200
                      ? { ...next, notice: "Hisobga muvaffaqiyatli kirdingiz." }
                      : { ...next, errors: { login: response.body.error } },
                );
              }}
            >
              <span className="shop-login-icon">
                <UserRound size={25} />
              </span>
              <h2>Hisobga kirish</h2>
              <p>Hisobingizga kiring va xaridni davom ettiring.</p>
              <div className="shop-field">
                <label htmlFor={`email-${session.id}`}>Email</label>
                <input
                  id={`email-${session.id}`}
                  type="email"
                  autoComplete="off"
                  value={state.login.email}
                  placeholder="email@example.com"
                  onChange={(e) => field("login", "email", e.target.value)}
                />
              </div>
              <div className="shop-field">
                <label htmlFor={`password-${session.id}`}>Parol</label>
                <input
                  id={`password-${session.id}`}
                  type="password"
                  autoComplete="off"
                  value={state.login.password}
                  placeholder="Parolingizni kiriting"
                  onChange={(e) => field("login", "password", e.target.value)}
                />
              </div>
              {state.errors.login && (
                <p className="shop-error" role="alert">
                  {state.errors.login}
                </p>
              )}
              <button className="shop-button shop-button-wide" type="submit">
                Kirish <ArrowRight size={16} />
              </button>
              <div className="shop-demo-account">
                <strong>Test hisobi</strong>
                <span>
                  qa@lab.uz <b>·</b> Test123!
                </span>
              </div>
              <button
                className="shop-text-button"
                type="button"
                onClick={() => navigate("catalog")}
              >
                Mehmon sifatida davom etish
              </button>
            </form>
          )}
        </div>
      )}

      <footer className="shop-footer">
        <strong>
          {scenario.brand}
          <span> market</span>
        </strong>
        <small>
          O‘quv do‘koni · mahsulotlar va buyurtmalar simulyatsiya qilinadi
        </small>
      </footer>
      {selected && (
        <div
          className="shop-modal-backdrop"
          onClick={() => patch({ selectedProduct: null })}
        >
          <section
            className="shop-product-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="shop-modal-close"
              autoFocus
              aria-label="Mahsulot oynasini yopish"
              onClick={() => patch({ selectedProduct: null })}
            >
              <X size={21} />
            </button>
            <ProductArt product={selected} />
            <div className="shop-product-details">
              <span className="shop-eyebrow">{selected.category}</span>
              <h2>{selected.name}</h2>
              <span className="shop-rating">
                <Star size={14} fill="currentColor" /> {selected.rating}{" "}
                <small>({selected.reviews} ta sharh)</small>
              </span>
              <strong className="shop-detail-price">
                {money(selected.price)}
              </strong>
              <p>{selected.description}</p>
              <div className="shop-detail-facts">
                <span>
                  SKU <b>{selected.sku}</b>
                </span>
                <span>
                  Omborda <b>{selected.stock} dona</b>
                </span>
                <span>
                  Kafolat <b>12 oy</b>
                </span>
              </div>
              <button
                className="shop-button shop-button-wide"
                onClick={() => addToCart(selected)}
              >
                <ShoppingBag size={17} /> Savatga qo‘shish
              </button>
              {state.notice && (
                <p className="shop-detail-notice" role="status">
                  {state.notice}
                </p>
              )}
              <button
                className="shop-text-button"
                onClick={() => navigate("cart")}
              >
                Savatga o‘tish <ArrowRight size={14} />
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

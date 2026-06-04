import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function GroupDetail({ token, username, userId, group: initialGroup, onBack }) {
  const [group, setGroup] = useState(initialGroup);
  const [stats, setStats] = useState(null);
  const [view, setView] = useState("counter"); // counter | ranking | stats | settings
  const [photoModal, setPhotoModal] = useState(null);
  const [editDrinks, setEditDrinks] = useState(false);
  const [draftDrinks, setDraftDrinks] = useState([]);
  const fileInputRef = useRef(null);

  function h() { return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }; }

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    const res = await fetch(API + `/groups/${group.id}/stats`, { headers: h() });
    setStats(await res.json());
  }

  async function loadGroup() {
    const res = await fetch(API + `/groups/${group.id}`, { headers: h() });
    setGroup(await res.json());
  }

  function handlePlus(drinkId) {
    setPhotoModal(drinkId);
    setTimeout(() => fileInputRef.current?.click(), 50);
  }

  function handlePhotoSelected(e) {
    const file = e.target.files[0];
    if (!file || !photoModal) { setPhotoModal(null); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await fetch(API + `/groups/${group.id}/log`, {
        method: "POST", headers: h(),
        body: JSON.stringify({ drinkId: photoModal, photo: ev.target.result }),
      });
      setPhotoModal(null);
      loadStats();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleMinus(drinkId) {
    await fetch(API + `/groups/${group.id}/log/last`, {
      method: "DELETE", headers: h(), body: JSON.stringify({ drinkId }),
    });
    loadStats();
  }

  function myCount(drinkId) {
    if (!stats) return 0;
    return stats.my_logs.filter(l => l.drink_id === drinkId).length;
  }

  function myPoints() {
    if (!stats) return 0;
    return stats.my_logs.reduce((s, l) => s + l.points, 0);
  }

  // Settings: edit drinks
  function startEdit() {
    setDraftDrinks(group.drinks.map(d => ({ ...d })));
    setEditDrinks(true);
  }

  async function saveDrinks() {
    await fetch(API + `/groups/${group.id}/drinks`, {
      method: "PUT", headers: h(), body: JSON.stringify({ drinks: draftDrinks }),
    });
    setEditDrinks(false);
    loadGroup();
  }

  function updateDraft(idx, field, value) {
    setDraftDrinks(prev => prev.map((d, i) => i === idx ? { ...d, [field]: field === "points" ? Number(value) : value } : d));
  }

  const rankingTotal = stats?.ranking_total || [];
  const rankingToday = stats?.ranking_today || [];

  return (
    <div className="app">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhotoSelected} />

      {photoModal && (
        <div className="modal-overlay" onClick={() => setPhotoModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-emoji">📸</div>
            <p className="modal-text">Abriendo cámara / galería…</p>
            <button className="btn-cancel" onClick={() => setPhotoModal(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <header className="header" style={{ flexWrap: "wrap", gap: 8 }}>
        <button className="btn-cancel" style={{ border: "none", fontSize: 18, padding: "4px 8px" }} onClick={onBack}>←</button>
        <div className="logo" style={{ fontSize: 16 }}>{group.name}</div>
        <div style={{ fontSize: 11, background: "rgba(167,139,250,0.15)", color: "var(--accent)", borderRadius: 6, padding: "3px 8px", letterSpacing: 2, fontWeight: 700 }}>{group.code}</div>
        <nav className="nav" style={{ width: "100%", justifyContent: "center" }}>
          {["counter","ranking","gallery","stats","settings"].map(v => (
            <button key={v} className={`nav-btn ${view === v ? "active" : ""}`} onClick={() => { setView(v); if (v !== "counter") loadStats(); }}>
              {{ counter: "Mis copas", ranking: "Ranking", gallery: "📸 Galería", stats: "Stats", settings: "⚙️" }[v]}
            </button>
          ))}
        </nav>
      </header>

      {/* ── MIS COPAS ── */}
      {view === "counter" && (
        <main className="main">
          <div className="summary-total" style={{ marginBottom: 0 }}>
            <span className="summary-total-num">{myPoints()}</span>
            <span className="summary-total-label">tus puntos · {stats?.my_logs?.length || 0} copas</span>
          </div>
          <div className="guest-card">
            <div className="drinks-grid">
              {group.drinks.map(drink => {
                const count = myCount(drink.id);
                return (
                  <div key={drink.id} className="drink-row">
                    <span className="drink-emoji">{drink.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div className="drink-label">{drink.label}</div>
                      <div style={{ fontSize: 11, color: drink.color, fontWeight: 700 }}>{drink.points} pts</div>
                    </div>
                    <div className="counter-controls">
                      <button className="btn-counter minus" onClick={() => handleMinus(drink.id)} disabled={count === 0}>−</button>
                      <span className="count-display" style={{ color: count > 0 ? drink.color : undefined }}>{count}</span>
                      <button className="btn-counter plus" onClick={() => handlePlus(drink.id)} style={{ background: drink.color }}>📸</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* ── RANKING ── */}
      {view === "ranking" && (
        <main className="main">
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <div className="guest-card" style={{ flex: 1, padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>HOY</div>
              {rankingToday.length === 0 && <div style={{ color: "var(--text2)", fontSize: 13 }}>Sin datos</div>}
              {rankingToday.slice(0,3).map((r, i) => (
                <div key={r.user_id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{MEDAL[i] || `${i+1}.`}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: r.user_id === userId ? 700 : 400, color: r.user_id === userId ? "var(--accent)" : "var(--text)" }}>{r.username}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>{r.points}pts</span>
                </div>
              ))}
            </div>
          </div>

          <h3 className="section-title">Ranking total</h3>
          {rankingTotal.map((r, i) => (
            <div key={r.user_id} className="guest-card" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24, minWidth: 32 }}>{MEDAL[i] || `${i+1}.`}</span>
                <span className="guest-avatar" style={{ background: r.user_id === userId ? "linear-gradient(135deg,#a78bfa,#6d28d9)" : "var(--bg3)" }}>
                  {r.username.charAt(0).toUpperCase()}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: r.user_id === userId ? "var(--accent)" : "var(--text)" }}>{r.username} {r.user_id === userId ? "(tú)" : ""}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)" }}>{r.total} copas</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{r.points}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>puntos</div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                {group.drinks.filter(d => r.drinks[d.id] > 0).map(d => (
                  <span key={d.id} className="drink-pill" style={{ background: d.color+"22", color: d.color }}>
                    {d.emoji} {r.drinks[d.id]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </main>
      )}

      {/* ── STATS ── */}
      {/* ── GALERÍA ── */}
      {view === "gallery" && stats && (
        <main className="main">
          {stats.recent_photos.length === 0 ? (
            <div className="empty"><span>📷</span><p>Aún no hay fotos en este grupo.</p></div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>{stats.recent_photos.length} fotos del grupo</p>
              <div className="gallery-grid">
                {stats.recent_photos.map((entry) => (
                  <div key={entry.id} className="gallery-item">
                    <img src={entry.photo} alt="" className="gallery-img" />
                    <div className="gallery-info">
                      <span className="gallery-user">{entry.username}</span>
                      <span className="gallery-drink" style={{ color: entry.drink_color }}>{entry.drink_emoji}</span>
                      <span className="gallery-time">{entry.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      )}

      {view === "stats" && stats && (
        <main className="main">
          <div className="summary-total">
            <span className="summary-total-num">{stats.ranking_total.reduce((s,r) => s+r.total, 0)}</span>
            <span className="summary-total-label">consumiciones totales del grupo</span>
          </div>

          <h3 className="section-title">Bebidas más pedidas</h3>
          <div className="summary-drinks" style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16 }}>
            {group.drinks.map(d => {
              const total = stats.drink_totals[d.id] || 0;
              const grandTotal = Object.values(stats.drink_totals).reduce((s,v) => s+v, 0);
              return (
                <div key={d.id} className="summary-drink-row">
                  <span className="drink-emoji">{d.emoji}</span>
                  <span className="summary-drink-name">{d.label}</span>
                  <div className="summary-bar-wrap">
                    <div className="summary-bar" style={{ width: grandTotal ? `${(total/grandTotal)*100}%` : "0%", background: d.color }} />
                  </div>
                  <span className="summary-drink-count" style={{ color: d.color }}>{total}</span>
                </div>
              );
            })}
          </div>

          {stats.recent_photos.length > 0 && (
            <>
              <h3 className="section-title">Últimas fotos</h3>
              <div className="photo-log">
                {stats.recent_photos.slice(0,10).map(e => (
                  <div key={e.id} className="photo-entry">
                    <img src={e.photo} alt="" className="photo-thumb" />
                    <div className="photo-info">
                      <span className="photo-guest">{e.username}</span>
                      <span className="photo-drink" style={{ color: e.drink_color }}>{e.drink_emoji} {e.drink_label}</span>
                      <span className="photo-time">{e.time} · +{e.points}pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      )}

      {/* ── SETTINGS ── */}
      {view === "settings" && (
        <main className="main">
          <div className="guest-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12 }}>Código para invitar</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 6, color: "var(--accent)", textAlign: "center", padding: "12px 0" }}>{group.code}</div>
            <div style={{ fontSize: 12, color: "var(--text2)", textAlign: "center" }}>Comparte este código para que otros se unan</div>
          </div>

          {group.role === "admin" && (
            <>
              <h3 className="section-title">Editar bebidas y puntos</h3>
              {!editDrinks ? (
                <div className="guest-card">
                  <div className="drinks-grid">
                    {group.drinks.map(d => (
                      <div key={d.id} className="drink-row">
                        <span className="drink-emoji">{d.emoji}</span>
                        <span className="drink-label">{d.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: d.color }}>{d.points} pts</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn-add" style={{ margin: "12px 16px 12px", width: "calc(100% - 32px)" }} onClick={startEdit}>✏️ Editar</button>
                </div>
              ) : (
                <div className="guest-card" style={{ padding: 16 }}>
                  {draftDrinks.map((d, i) => (
                    <div key={d.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                      <input className="input" style={{ width: 44, textAlign: "center", padding: "6px 4px", fontSize: 20 }}
                        value={d.emoji} onChange={e => updateDraft(i, "emoji", e.target.value)} />
                      <input className="input" style={{ flex: 1 }} value={d.label} onChange={e => updateDraft(i, "label", e.target.value)} />
                      <input className="input" style={{ width: 54, textAlign: "center" }} type="number" min="0" max="99"
                        value={d.points} onChange={e => updateDraft(i, "points", e.target.value)} />
                      <span style={{ fontSize: 11, color: "var(--text2)", whiteSpace: "nowrap" }}>pts</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn-add" style={{ flex: 1 }} onClick={saveDrinks}>💾 Guardar</button>
                    <button className="btn-reset" style={{ flex: 1 }} onClick={() => setEditDrinks(false)}>Cancelar</button>
                  </div>
                </div>
              )}
            </>
          )}

          <button className="btn-reset" onClick={onBack} style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.3)" }}>
            ← Salir del grupo
          </button>
        </main>
      )}
    </div>
  );
}

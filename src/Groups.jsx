import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function Groups({ token, username, onEnterGroup, onLogout }) {
  const [groups, setGroups] = useState([]);
  const [mode, setMode] = useState(null); // "create" | "join"
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function h() { return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }; }

  useEffect(() => {
    fetch(API + "/groups", { headers: h() }).then(r => r.json()).then(setGroups);
  }, []);

  async function createGroup() {
    if (!name.trim()) return setError("Escribe un nombre");
    setLoading(true);
    const res = await fetch(API + "/groups", { method: "POST", headers: h(), body: JSON.stringify({ name }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    setGroups(prev => [...prev, { ...data, role: "admin" }]);
    setMode(null); setName(""); setLoading(false);
  }

  async function joinGroup() {
    if (!code.trim()) return setError("Escribe el código");
    setLoading(true);
    const res = await fetch(API + "/groups/join", { method: "POST", headers: h(), body: JSON.stringify({ code }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    setGroups(prev => [...prev, data]);
    setMode(null); setCode(""); setLoading(false);
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">🎉 CountIt</div>
        <div className="user-area" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="user-name">👤 {username}</span>
          <button className="btn-logout" onClick={onLogout}>Salir</button>
        </div>
      </header>
      <main className="main">
        <h2 className="section-title" style={{ fontSize: 18, color: "var(--text)", marginBottom: 4 }}>Mis grupos</h2>

        {groups.length === 0 && !mode && (
          <div className="empty"><span>🎊</span><p>No estás en ningún grupo todavía</p></div>
        )}

        <div className="guests-list">
          {groups.map(g => (
            <div key={g.id} className="guest-card" style={{ cursor: "pointer" }} onClick={() => onEnterGroup(g)}>
              <div className="guest-header">
                <div className="guest-info">
                  <span className="guest-avatar">{g.name.charAt(0).toUpperCase()}</span>
                  <div>
                    <div className="guest-name">{g.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text2)" }}>Código: <b style={{ color: "var(--accent)", letterSpacing: 2 }}>{g.code}</b></div>
                  </div>
                </div>
                {g.role === "admin" && <span className="drink-pill" style={{ background: "rgba(167,139,250,0.15)", color: "var(--accent)" }}>Admin</span>}
              </div>
            </div>
          ))}
        </div>

        {mode === "create" && (
          <div className="guest-card" style={{ padding: 16 }}>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 10 }}>Nombre del grupo</p>
            <div className="add-guest">
              <input className="input" placeholder="Ej: Fiesta de Ana" value={name} onChange={e => { setName(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && createGroup()} />
              <button className="btn-add" onClick={createGroup} disabled={loading}>{loading ? "..." : "Crear"}</button>
            </div>
            {error && <div className="auth-error" style={{ marginTop: 8 }}>⚠️ {error}</div>}
            <button className="btn-reset" style={{ marginTop: 8 }} onClick={() => { setMode(null); setError(""); }}>Cancelar</button>
          </div>
        )}

        {mode === "join" && (
          <div className="guest-card" style={{ padding: 16 }}>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 10 }}>Código del grupo</p>
            <div className="add-guest">
              <input className="input" placeholder="Ej: AB3X7K" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }} onKeyDown={e => e.key === "Enter" && joinGroup()} style={{ letterSpacing: 3, fontWeight: 700 }} />
              <button className="btn-add" onClick={joinGroup} disabled={loading}>{loading ? "..." : "Unirse"}</button>
            </div>
            {error && <div className="auth-error" style={{ marginTop: 8 }}>⚠️ {error}</div>}
            <button className="btn-reset" style={{ marginTop: 8 }} onClick={() => { setMode(null); setError(""); }}>Cancelar</button>
          </div>
        )}

        {!mode && (
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-add" style={{ flex: 1, padding: 12 }} onClick={() => { setMode("create"); setError(""); }}>+ Crear grupo</button>
            <button className="btn-add" style={{ flex: 1, padding: 12, background: "var(--bg3)", color: "var(--text)" }} onClick={() => { setMode("join"); setError(""); }}>🔑 Unirse con código</button>
          </div>
        )}
      </main>
    </div>
  );
}

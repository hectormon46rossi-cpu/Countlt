import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit() {
    setError("");
    if (!form.email || !form.password) return setError("Rellena todos los campos");
    if (mode === "register" && !form.username) return setError("Escribe un nombre de usuario");

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/login" : "/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password };

      const res = await fetch(API + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");

      localStorage.setItem("countit_token", data.token);
      localStorage.setItem("countit_username", data.username);
      onLogin(data.token, data.username);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">🎉</div>
        <h1 className="auth-title">CountIt</h1>
        <p className="auth-subtitle">Contador de consumiciones para fiestas</p>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setError(""); }}>
            Iniciar sesión
          </button>
          <button className={`auth-tab ${mode === "register" ? "active" : ""}`} onClick={() => { setMode("register"); setError(""); }}>
            Registrarse
          </button>
        </div>

        <div className="auth-form">
          {mode === "register" && (
            <div className="auth-field">
              <label>Nombre de usuario</label>
              <input
                className="input"
                placeholder="ej: dj_mario"
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          )}

          <div className="auth-field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div className="auth-field">
            <label>Contraseña</label>
            <input
              className="input"
              type="password"
              placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {error && <div className="auth-error">⚠️ {error}</div>}

          <button className="btn-auth" onClick={handleSubmit} disabled={loading}>
            {loading ? "Cargando..." : mode === "login" ? "Entrar 🎉" : "Crear cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}

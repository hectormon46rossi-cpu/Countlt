const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "countit_secret_2024";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: "10mb" }));

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No autorizado" });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: "Token inválido" }); }
}

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const DEFAULT_DRINKS = [
  { id: "cubata",   label: "Cubata",   emoji: "🥃", color: "#f59e0b", points: 5 },
  { id: "beer",     label: "Cerveza",  emoji: "🍺", color: "#eab308", points: 2 },
  { id: "shot",     label: "Chupito",  emoji: "🔥", color: "#ef4444", points: 1 },
  { id: "wine",     label: "Vino",     emoji: "🍷", color: "#9f1239", points: 3 },
  { id: "cocktail", label: "Cóctel",   emoji: "🍹", color: "#06b6d4", points: 4 },
  { id: "soda",     label: "Refresco", emoji: "🥤", color: "#10b981", points: 0 },
];

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post("/api/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "Todos los campos son obligatorios" });
  if (password.length < 6) return res.status(400).json({ error: "Contraseña mínimo 6 caracteres" });
  if (db.get("users").find({ email: email.toLowerCase() }).value()) return res.status(400).json({ error: "Email ya registrado" });
  if (db.get("users").find({ username }).value()) return res.status(400).json({ error: "Usuario ya existe" });
  const id = Date.now();
  db.get("users").push({ id, username, email: email.toLowerCase(), password: bcrypt.hashSync(password, 10) }).write();
  const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, username });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.get("users").find({ email: email?.toLowerCase() }).value();
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Email o contraseña incorrectos" });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, username: user.username });
});

// ─── Groups ───────────────────────────────────────────────────────────────────
app.get("/api/groups", auth, (req, res) => {
  const memberships = db.get("members").filter({ user_id: req.user.id }).value();
  const groups = memberships.map(m => {
    const g = db.get("groups").find({ id: m.group_id }).value();
    return g ? { ...g, role: m.role } : null;
  }).filter(Boolean);
  res.json(groups);
});

app.post("/api/groups", auth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nombre requerido" });
  let code;
  do { code = randomCode(); } while (db.get("groups").find({ code }).value());
  const id = Date.now();
  db.get("groups").push({ id, name: name.trim(), code, owner_id: req.user.id, drinks: DEFAULT_DRINKS, created_at: new Date().toISOString() }).write();
  db.get("members").push({ id: Date.now()+1, group_id: id, user_id: req.user.id, role: "admin" }).write();
  res.json(db.get("groups").find({ id }).value());
});

app.post("/api/groups/join", auth, (req, res) => {
  const { code } = req.body;
  const group = db.get("groups").find({ code: code?.toUpperCase() }).value();
  if (!group) return res.status(404).json({ error: "Código incorrecto" });
  const already = db.get("members").find({ group_id: group.id, user_id: req.user.id }).value();
  if (already) return res.status(400).json({ error: "Ya eres miembro de este grupo" });
  db.get("members").push({ id: Date.now(), group_id: group.id, user_id: req.user.id, role: "member" }).write();
  res.json({ ...group, role: "member" });
});

app.get("/api/groups/:id", auth, (req, res) => {
  const gid = Number(req.params.id);
  const membership = db.get("members").find({ group_id: gid, user_id: req.user.id }).value();
  if (!membership) return res.status(403).json({ error: "No eres miembro" });
  const group = db.get("groups").find({ id: gid }).value();
  const members = db.get("members").filter({ group_id: gid }).value().map(m => {
    const u = db.get("users").find({ id: m.user_id }).value();
    return { user_id: m.user_id, username: u?.username || "?", role: m.role };
  });
  res.json({ ...group, members, role: membership.role });
});

app.put("/api/groups/:id/drinks", auth, (req, res) => {
  const gid = Number(req.params.id);
  const membership = db.get("members").find({ group_id: gid, user_id: req.user.id }).value();
  if (!membership || membership.role !== "admin") return res.status(403).json({ error: "Solo el admin puede editar" });
  db.get("groups").find({ id: gid }).assign({ drinks: req.body.drinks }).write();
  res.json({ ok: true });
});

app.delete("/api/groups/:id/leave", auth, (req, res) => {
  db.get("members").remove({ group_id: Number(req.params.id), user_id: req.user.id }).write();
  res.json({ ok: true });
});

// ─── Drink log ────────────────────────────────────────────────────────────────
app.post("/api/groups/:id/log", auth, (req, res) => {
  const gid = Number(req.params.id);
  const membership = db.get("members").find({ group_id: gid, user_id: req.user.id }).value();
  if (!membership) return res.status(403).json({ error: "No eres miembro" });
  const { drinkId, photo } = req.body;
  const group = db.get("groups").find({ id: gid }).value();
  const drink = group.drinks.find(d => d.id === drinkId);
  if (!drink) return res.status(400).json({ error: "Bebida no encontrada" });
  const user = db.get("users").find({ id: req.user.id }).value();
  const entry = {
    id: Date.now(), group_id: gid, user_id: req.user.id, username: user.username,
    drink_id: drinkId, drink_label: drink.label, drink_emoji: drink.emoji,
    drink_color: drink.color, points: drink.points, photo: photo || null,
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    created_at: new Date().toISOString(),
  };
  db.get("drink_log").push(entry).write();
  res.json(entry);
});

app.delete("/api/groups/:id/log/last", auth, (req, res) => {
  const gid = Number(req.params.id);
  const { drinkId } = req.body;
  const logs = db.get("drink_log").filter({ group_id: gid, user_id: req.user.id, drink_id: drinkId }).value();
  if (!logs.length) return res.json({ ok: true });
  db.get("drink_log").remove({ id: logs[logs.length - 1].id }).write();
  res.json({ ok: true });
});

app.get("/api/groups/:id/stats", auth, (req, res) => {
  const gid = Number(req.params.id);
  if (!db.get("members").find({ group_id: gid, user_id: req.user.id }).value())
    return res.status(403).json({ error: "No eres miembro" });
  const today = new Date().toISOString().split("T")[0];
  const allLogs = db.get("drink_log").filter({ group_id: gid }).value();
  const todayLogs = allLogs.filter(l => l.date === today);
  function buildRanking(logs) {
    const map = {};
    logs.forEach(l => {
      if (!map[l.user_id]) map[l.user_id] = { user_id: l.user_id, username: l.username, points: 0, total: 0, drinks: {} };
      map[l.user_id].points += l.points;
      map[l.user_id].total += 1;
      map[l.user_id].drinks[l.drink_id] = (map[l.user_id].drinks[l.drink_id] || 0) + 1;
    });
    return Object.values(map).sort((a, b) => b.points - a.points);
  }
  function drinkTotals(logs) {
    const map = {};
    logs.forEach(l => { map[l.drink_id] = (map[l.drink_id] || 0) + 1; });
    return map;
  }
  res.json({
    ranking_total: buildRanking(allLogs),
    ranking_today: buildRanking(todayLogs),
    drink_totals: drinkTotals(allLogs),
    drink_totals_today: drinkTotals(todayLogs),
    recent_photos: allLogs.filter(l => l.photo).reverse(),
    my_logs: allLogs.filter(l => l.user_id === req.user.id),
  });
});

app.listen(PORT, () => console.log(`✅ CountIt backend en http://localhost:${PORT}`));

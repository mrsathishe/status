require("dotenv").config();

const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/status";

// Static login credentials (single user). Loaded from api/.env — never hardcoded.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET || "insecure-dev-secret";

const ROOT = path.join(__dirname, "..");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8 // 8 hours
    }
  })
);

// Gate protected API routes. Returns 401 so the SPA can show the login view.
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: "unauthorized" });
}

// --- Auth endpoints ---

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.user = username;
    return res.json({ ok: true, username });
  }
  return res.status(401).json({ ok: false, error: "Invalid username or password" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Lets the SPA check on load whether there is already a valid session.
app.get("/api/me", (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ authenticated: true, username: req.session.user });
  }
  return res.json({ authenticated: false });
});

// --- Protected API ---

app.get("/api/health/mongodb", requireAuth, async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({
      service: "mongodb",
      status: "healthy",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      service: "mongodb",
      status: "down",
      error: err.message
    });
  }
});

// --- Front-end (single-page app) ---
// Only expose css/js and index.html. The api/ folder (with .env) is never served.
app.use("/css", express.static(path.join(ROOT, "css")));
app.use("/js", express.static(path.join(ROOT, "js")));
app.get("/", (req, res) => res.sendFile(path.join(ROOT, "index.html")));

// Connect to MongoDB. Failures are reported by the health check above.
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

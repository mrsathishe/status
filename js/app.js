// Single-page app: toggles between a login view and the status dashboard.

const SERVICES = [{ key: "mongodb", url: "/api/health/mongodb" }];
const POLL_INTERVAL_MS = 10000;

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");

let pollTimer = null;
let clockTimer = null;

// --- View switching ---

function showLogin() {
  stopPolling();
  stopClock();
  dashboardView.classList.add("hidden");
  loginView.classList.remove("hidden");
}

function showDashboard() {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  startClock();
  startPolling();
}

// --- Live clock (date, day, time) ---

function updateClock() {
  const now = new Date();
  document.getElementById("clock-date").textContent = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  document.getElementById("clock-day").textContent = now.toLocaleDateString("en-GB", {
    weekday: "long"
  });
  document.getElementById("clock-time").textContent = now.toLocaleTimeString("en-GB");
}

function startClock() {
  updateClock();
  stopClock();
  clockTimer = setInterval(updateClock, 1000);
}

function stopClock() {
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
}

// --- Auth ---

async function checkSession() {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    if (data.authenticated) showDashboard();
    else showLogin();
  } catch {
    showLogin();
  }
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      loginForm.reset();
      showDashboard();
    } else {
      showError(data.error || "Login failed");
    }
  } catch {
    showError("Could not reach the server");
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await fetch("/api/logout", { method: "POST" });
  } finally {
    showLogin();
  }
});

function showError(message) {
  loginError.textContent = message;
  loginError.classList.remove("hidden");
}

// --- Health polling ---

function startPolling() {
  pollAll();
  stopPolling();
  pollTimer = setInterval(pollAll, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function pollAll() {
  SERVICES.forEach(checkService);
}

async function checkService({ key, url }) {
  const badge = document.getElementById(`${key}-status`);
  if (!badge) return;

  try {
    const res = await fetch(url);
    // Session expired while the dashboard was open — return to login.
    if (res.status === 401) {
      showLogin();
      return;
    }
    const data = await res.json();
    const active = data.status === "healthy";
    setBadge(badge, active ? "up" : "down", active ? "active" : "inactive");
  } catch {
    setBadge(badge, "down", "inactive");
  }
}

function setBadge(badge, state, label) {
  badge.className = `badge badge--${state}`;
  badge.textContent = label;
}

// Decide which view to show on load.
checkSession();

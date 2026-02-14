const API_URL = "http://localhost:8000/api/v1";

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface Profile {
  full_name?: string;
  phone?: string;
  location?: string;
  skills?: string[];
}

async function init() {
  const { token } = await chrome.storage.local.get("token");
  if (token) {
    try {
      const user = await fetchUser(token);
      if (user) {
        showProfile(user, token);
        return;
      }
    } catch {}
  }
  showLogin();
}

function showLogin() {
  const content = document.getElementById("content")!;
  content.innerHTML = `
    <form class="login-form" id="loginForm">
      <input type="email" id="email" placeholder="Email" required>
      <input type="password" id="password" placeholder="Password" required>
      <button type="submit">Sign In</button>
      <div id="error" class="error"></div>
    </form>
  `;

  document.getElementById("loginForm")!.onsubmit = async (e) => {
    e.preventDefault();
    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;
    const errorEl = document.getElementById("error")!;

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error("Invalid credentials");

      const data = await res.json();
      await chrome.storage.local.set({ token: data.access_token });
      init();
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : "Login failed";
    }
  };
}

async function showProfile(user: User, token: string) {
  const profile = await fetchProfile(token);
  const content = document.getElementById("content")!;

  content.innerHTML = `
    <div class="profile">
      <div class="profile-header">
        <div>
          <div class="profile-name">${user.full_name || "User"}</div>
          <div class="profile-email">${user.email}</div>
        </div>
      </div>
      <div class="divider"></div>
      <button id="fillBtn">⚡ Auto-Fill Current Page</button>
      <button id="dashboardBtn" class="btn-secondary">Open Dashboard</button>
      <button id="logoutBtn" class="btn-secondary">Logout</button>
      <div id="status" class="success"></div>
    </div>
  `;

  document.getElementById("fillBtn")!.onclick = async () => {
    const statusEl = document.getElementById("status")!;
    if (profile) {
      chrome.runtime.sendMessage({ type: "FILL_FORM", data: profile });
      statusEl.textContent = "Form filled!";
    } else {
      statusEl.textContent = "Please complete your profile first";
      statusEl.className = "error";
    }
  };

  document.getElementById("dashboardBtn")!.onclick = () => {
    chrome.tabs.create({ url: "http://localhost:3000/dashboard" });
  };

  document.getElementById("logoutBtn")!.onclick = async () => {
    await chrome.storage.local.remove("token");
    showLogin();
  };
}

async function fetchUser(token: string): Promise<User | null> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchProfile(token: string): Promise<Profile | null> {
  try {
    const res = await fetch(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

init();

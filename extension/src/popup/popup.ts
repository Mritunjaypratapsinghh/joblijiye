const API_URL = "https://joblijiye.onrender.com/api/v1";
const DASHBOARD_URL = "https://joblijiye.com";

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface Profile {
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  skills?: string[];
}

async function init() {
  const { token } = await chrome.storage.local.get("token");
  if (token) {
    try {
      const user = await fetchUser(token);
      if (user) {
        const profile = await fetchProfile(token);
        showProfile(user, profile, token);
        return;
      }
    } catch {}
  }
  showLogin();
}

function showLogin() {
  const content = document.getElementById("content")!;
  content.innerHTML = `
    <div class="logo">
      <span class="logo-icon">⚡</span>
      <span class="logo-text">JobLijiye</span>
    </div>
    <form class="login-form" id="loginForm">
      <input type="email" id="email" placeholder="Email" required>
      <input type="password" id="password" placeholder="Password" required>
      <button type="submit" id="submitBtn">Sign In</button>
      <div id="error" class="error"></div>
    </form>
    <div class="footer">
      <a href="${DASHBOARD_URL}/register" target="_blank">Create account</a>
    </div>
  `;

  document.getElementById("loginForm")!.onsubmit = async (e) => {
    e.preventDefault();
    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;
    const errorEl = document.getElementById("error")!;
    const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Invalid credentials");
      }

      const data = await res.json();
      await chrome.storage.local.set({ token: data.access_token });
      init();
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : "Login failed";
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  };
}

function showProfile(user: User, profile: Profile | null, token: string) {
  const content = document.getElementById("content")!;
  const profileComplete = profile?.full_name && profile?.phone;

  content.innerHTML = `
    <div class="profile">
      <div class="profile-header">
        <div class="avatar">${(user.full_name || user.email)[0].toUpperCase()}</div>
        <div>
          <div class="profile-name">${user.full_name || "User"}</div>
          <div class="profile-email">${user.email}</div>
        </div>
      </div>
      
      ${!profileComplete ? `
        <div class="warning">
          ⚠️ Complete your profile for better auto-fill
        </div>
      ` : ""}
      
      <div class="divider"></div>
      
      <button id="fillBtn" class="btn-primary">
        <span>⚡</span> Auto-Fill This Page
      </button>
      
      <button id="dashboardBtn" class="btn-secondary">
        Open Dashboard
      </button>
      
      <button id="profileBtn" class="btn-secondary">
        Edit Profile
      </button>
      
      <button id="logoutBtn" class="btn-text">
        Logout
      </button>
      
      <div id="status"></div>
    </div>
  `;

  document.getElementById("fillBtn")!.onclick = async () => {
    const statusEl = document.getElementById("status")!;
    if (!profile) {
      statusEl.textContent = "Please complete your profile first";
      statusEl.className = "error";
      return;
    }

    // Get active tab and send fill command
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "FILL_FORM", data: { ...profile, email: user.email } }, (response) => {
        if (chrome.runtime.lastError) {
          statusEl.textContent = "Cannot fill this page. Try refreshing.";
          statusEl.className = "error";
        } else {
          statusEl.textContent = "✅ Form filled!";
          statusEl.className = "success";
        }
      });
    }
  };

  document.getElementById("dashboardBtn")!.onclick = () => {
    chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard` });
  };

  document.getElementById("profileBtn")!.onclick = () => {
    chrome.tabs.create({ url: `${DASHBOARD_URL}/profile` });
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

// Background service worker
const API_URL = "https://joblijiye.onrender.com/api/v1";

// Listen for messages from popup/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PROFILE") {
    getProfile().then(sendResponse);
    return true;
  }
  if (message.type === "FILL_FORM") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "FILL_FORM", data: message.data });
      }
    });
  }
});

async function getProfile() {
  const { token } = await chrome.storage.local.get("token");
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const profile = await res.json();
    
    // Also get user email
    const userRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (userRes.ok) {
      const user = await userRes.json();
      profile.email = user.email;
    }
    
    return profile;
  } catch {
    return null;
  }
}

// Handle extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log("JobLijiye extension installed");
});

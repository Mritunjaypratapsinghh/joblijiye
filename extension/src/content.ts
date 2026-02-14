// Content script - runs on job application pages
interface ProfileData {
  full_name?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  skills?: string[];
  experience?: Array<{
    company: string;
    title: string;
    start_date: string;
    end_date: string;
    description: string;
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field: string;
    year: string;
  }>;
}

// Field mappings for common job application forms
const FIELD_MAPPINGS: Record<string, string[]> = {
  full_name: ["name", "full_name", "fullname", "applicant_name", "candidate_name"],
  first_name: ["first_name", "firstname", "fname", "given_name"],
  last_name: ["last_name", "lastname", "lname", "surname", "family_name"],
  email: ["email", "email_address", "e-mail"],
  phone: ["phone", "phone_number", "mobile", "telephone", "cell"],
  location: ["location", "city", "address", "current_location"],
  linkedin_url: ["linkedin", "linkedin_url", "linkedin_profile"],
  github_url: ["github", "github_url", "github_profile"],
  portfolio_url: ["portfolio", "website", "personal_website", "portfolio_url"],
};

// Fill form with profile data
function fillForm(profile: ProfileData) {
  if (!profile) return;

  const nameParts = profile.full_name?.split(" ") || [];
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const data: Record<string, string> = {
    full_name: profile.full_name || "",
    first_name: firstName,
    last_name: lastName,
    phone: profile.phone || "",
    location: profile.location || "",
    linkedin_url: profile.linkedin_url || "",
    github_url: profile.github_url || "",
    portfolio_url: profile.portfolio_url || "",
  };

  // Find and fill input fields
  document.querySelectorAll("input, textarea, select").forEach((el) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const name = (input.name || input.id || "").toLowerCase();
    const placeholder = (input.placeholder || "").toLowerCase();
    const label = findLabel(input)?.toLowerCase() || "";

    for (const [field, aliases] of Object.entries(FIELD_MAPPINGS)) {
      if (aliases.some((alias) => name.includes(alias) || placeholder.includes(alias) || label.includes(alias))) {
        if (data[field] && !input.value) {
          input.value = data[field];
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          highlightFilled(input);
        }
        break;
      }
    }
  });

  showNotification("Form auto-filled! Review before submitting.");
}

function findLabel(input: HTMLElement): string | null {
  // Check for associated label
  const id = input.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent;
  }
  // Check parent label
  const parentLabel = input.closest("label");
  if (parentLabel) return parentLabel.textContent;
  return null;
}

function highlightFilled(el: HTMLElement) {
  el.style.backgroundColor = "#e8f5e9";
  setTimeout(() => (el.style.backgroundColor = ""), 2000);
}

function showNotification(message: string) {
  const div = document.createElement("div");
  div.className = "job-tracker-notification";
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// Listen for fill command from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "FILL_FORM") {
    fillForm(message.data);
  }
});

// Add floating button on job pages
function addFloatingButton() {
  if (document.getElementById("job-tracker-btn")) return;

  const btn = document.createElement("button");
  btn.id = "job-tracker-btn";
  btn.innerHTML = "⚡ Auto-Fill";
  btn.className = "job-tracker-float-btn";
  btn.onclick = () => {
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, (profile) => {
      if (profile) {
        fillForm(profile);
      } else {
        showNotification("Please login to Job Tracker first");
      }
    });
  };
  document.body.appendChild(btn);
}

// Initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addFloatingButton);
} else {
  addFloatingButton();
}

// Content script - runs on job application pages
interface ProfileData {
  full_name?: string;
  email?: string;
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
  full_name: ["name", "full_name", "fullname", "applicant_name", "candidate_name", "your-name"],
  first_name: ["first_name", "firstname", "fname", "given_name", "first-name"],
  last_name: ["last_name", "lastname", "lname", "surname", "family_name", "last-name"],
  email: ["email", "email_address", "e-mail", "emailaddress"],
  phone: ["phone", "phone_number", "mobile", "telephone", "cell", "phonenumber", "mobile_phone"],
  location: ["location", "city", "address", "current_location", "current_city"],
  linkedin_url: ["linkedin", "linkedin_url", "linkedin_profile", "linkedinurl"],
  github_url: ["github", "github_url", "github_profile", "githuburl"],
  portfolio_url: ["portfolio", "website", "personal_website", "portfolio_url", "personal_site"],
  resume: ["resume", "cv", "resume_url", "resume_file"],
  cover_letter: ["cover_letter", "coverletter", "cover-letter"],
};

// ATS-specific selectors
const ATS_SELECTORS: Record<string, Record<string, string>> = {
  greenhouse: {
    first_name: "#first_name, input[name='first_name']",
    last_name: "#last_name, input[name='last_name']",
    email: "#email, input[name='email']",
    phone: "#phone, input[name='phone']",
    resume: "input[type='file'][name*='resume'], input[type='file'][id*='resume']",
    linkedin_url: "input[name*='linkedin'], input[id*='linkedin']",
    location: "input[name*='location'], input[id*='location']",
  },
  lever: {
    full_name: "input[name='name']",
    email: "input[name='email']",
    phone: "input[name='phone']",
    resume: "input[type='file']",
    linkedin_url: "input[name*='linkedin'], input[placeholder*='LinkedIn']",
    github_url: "input[name*='github'], input[placeholder*='GitHub']",
    portfolio_url: "input[name*='portfolio'], input[name*='website']",
    location: "input[name*='location']",
  },
  workday: {
    first_name: "input[data-automation-id='legalNameSection_firstName'], input[data-automation-id='firstName']",
    last_name: "input[data-automation-id='legalNameSection_lastName'], input[data-automation-id='lastName']",
    email: "input[data-automation-id='email'], input[type='email']",
    phone: "input[data-automation-id='phone'], input[data-automation-id='phonePrimary']",
    location: "input[data-automation-id='addressSection_city']",
  },
  icims: {
    first_name: "input[id*='FirstName'], input[name*='FirstName']",
    last_name: "input[id*='LastName'], input[name*='LastName']",
    email: "input[id*='Email'], input[name*='Email']",
    phone: "input[id*='Phone'], input[name*='Phone']",
  },
  smartrecruiters: {
    first_name: "input[name='firstName']",
    last_name: "input[name='lastName']",
    email: "input[name='email']",
    phone: "input[name='phoneNumber']",
    linkedin_url: "input[name*='linkedin']",
  },
  linkedin: {
    first_name: "input[id*='first-name'], input[name*='firstName']",
    last_name: "input[id*='last-name'], input[name*='lastName']",
    email: "input[id*='email'], input[type='email']",
    phone: "input[id*='phone'], input[type='tel']",
  },
};

// Detect which ATS is being used
function detectATS(): string | null {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  if (url.includes("greenhouse.io") || url.includes("boards.greenhouse")) return "greenhouse";
  if (url.includes("lever.co") || url.includes("jobs.lever")) return "lever";
  if (url.includes("workday.com") || url.includes("myworkdayjobs.com") || url.includes("wd5.myworkdayjobs")) return "workday";
  if (url.includes("icims.com") || hostname.includes("icims")) return "icims";
  if (url.includes("smartrecruiters.com")) return "smartrecruiters";
  if (url.includes("linkedin.com/jobs")) return "linkedin";
  
  // Check for embedded ATS iframes
  const iframes = document.querySelectorAll("iframe");
  for (const iframe of iframes) {
    const src = iframe.src || "";
    if (src.includes("greenhouse")) return "greenhouse";
    if (src.includes("lever")) return "lever";
  }
  
  return null;
}

// Fill form with profile data
function fillForm(profile: ProfileData) {
  if (!profile) return;

  const ats = detectATS();
  let filledCount = 0;

  // Prepare data
  const nameParts = profile.full_name?.split(" ") || [];
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const data: Record<string, string> = {
    full_name: profile.full_name || "",
    first_name: firstName,
    last_name: lastName,
    email: profile.email || "",
    phone: profile.phone || "",
    location: profile.location || "",
    linkedin_url: profile.linkedin_url || "",
    github_url: profile.github_url || "",
    portfolio_url: profile.portfolio_url || "",
  };

  // Try ATS-specific selectors first
  if (ats && ATS_SELECTORS[ats]) {
    for (const [field, selector] of Object.entries(ATS_SELECTORS[ats])) {
      const el = document.querySelector(selector) as HTMLInputElement;
      if (el && data[field] && !el.value) {
        el.value = data[field];
        triggerInputEvents(el);
        highlightFilled(el);
        filledCount++;
      }
    }
  }

  // Generic form filling
  document.querySelectorAll("input, textarea, select").forEach((el) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (input.type === "file" || input.type === "hidden" || input.type === "submit") return;
    if (input.value) return; // Skip already filled

    const name = (input.name || input.id || "").toLowerCase();
    const placeholder = (input.placeholder || "").toLowerCase();
    const ariaLabel = (input.getAttribute("aria-label") || "").toLowerCase();
    const label = findLabel(input)?.toLowerCase() || "";
    const allText = `${name} ${placeholder} ${ariaLabel} ${label}`;

    for (const [field, aliases] of Object.entries(FIELD_MAPPINGS)) {
      if (aliases.some((alias) => allText.includes(alias))) {
        if (data[field]) {
          input.value = data[field];
          triggerInputEvents(input);
          highlightFilled(input);
          filledCount++;
        }
        break;
      }
    }
  });

  showNotification(`✅ Auto-filled ${filledCount} fields! Review before submitting.`);
}

function triggerInputEvents(el: HTMLElement) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
  // For React apps
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (nativeInputValueSetter && el instanceof HTMLInputElement) {
    nativeInputValueSetter.call(el, el.value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function findLabel(input: HTMLElement): string | null {
  const id = input.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent;
  }
  const parentLabel = input.closest("label");
  if (parentLabel) return parentLabel.textContent;
  // Check previous sibling
  const prev = input.previousElementSibling;
  if (prev?.tagName === "LABEL") return prev.textContent;
  return null;
}

function highlightFilled(el: HTMLElement) {
  const originalBg = el.style.backgroundColor;
  el.style.backgroundColor = "#dcfce7";
  el.style.transition = "background-color 0.3s";
  setTimeout(() => {
    el.style.backgroundColor = originalBg;
  }, 2000);
}

function showNotification(message: string) {
  // Remove existing notification
  document.getElementById("jt-notification")?.remove();

  const div = document.createElement("div");
  div.id = "jt-notification";
  div.className = "job-tracker-notification";
  div.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">⚡</span>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

// Listen for fill command from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FILL_FORM") {
    fillForm(message.data);
    sendResponse({ success: true });
  }
  if (message.type === "DETECT_FORM") {
    const inputs = document.querySelectorAll("input:not([type='hidden']):not([type='submit']), textarea");
    sendResponse({ hasForm: inputs.length > 0, inputCount: inputs.length });
  }
  return true;
});

// Add floating button on job pages
function addFloatingButton() {
  if (document.getElementById("job-tracker-btn")) return;

  const btn = document.createElement("button");
  btn.id = "job-tracker-btn";
  btn.className = "job-tracker-float-btn";
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
    Auto-Fill
  `;
  btn.onclick = () => {
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, (profile) => {
      if (chrome.runtime.lastError) {
        showNotification("❌ Extension error. Please reload the page.");
        return;
      }
      if (profile) {
        fillForm(profile);
      } else {
        showNotification("⚠️ Please login to JobLijiye extension first");
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

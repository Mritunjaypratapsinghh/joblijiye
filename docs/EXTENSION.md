# Browser Extension Documentation

## Overview

Chrome/Brave extension (Manifest V3) that auto-fills job application forms using profile data from the Job Tracker platform.

## Features

- **Form Detection**: Automatically detects job application forms on supported sites
- **Auto-Fill**: Fills form fields with profile data in one click
- **Resume Upload**: Uploads tailored resume to file inputs
- **Application Tracking**: Reports successful applications back to dashboard
- **Profile Sync**: Keeps extension data in sync with web platform

## Supported Platforms

| Platform | Companies Using It | Support Level |
|----------|-------------------|---------------|
| LinkedIn Easy Apply | LinkedIn | Full |
| Indeed Apply | Indeed | Full |
| Greenhouse | Airbnb, Pinterest, Stripe, Cloudflare | Full |
| Lever | Netflix, Shopify, Twitch | Full |
| Workday | Google, Amazon, Microsoft | Partial |
| iCIMS | Many enterprises | Partial |
| SmartRecruiters | Various | Partial |

## Installation (Load Unpacked - Free)

1. Build the extension:
   ```bash
   cd extension
   npm install
   npm run build
   ```

2. Open Brave browser
3. Navigate to `brave://extensions/`
4. Enable "Developer mode" (top right toggle)
5. Click "Load unpacked"
6. Select the `extension/dist` folder
7. Extension is now installed!

## Project Structure

```
extension/
├── manifest.json           # Extension configuration
├── package.json
├── src/
│   ├── popup/              # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── background/         # Service worker
│   │   └── service-worker.js
│   ├── content/            # Content scripts
│   │   ├── content.js      # Main content script
│   │   └── form-detector.js
│   ├── adapters/           # Site-specific adapters
│   │   ├── base.js
│   │   ├── linkedin.js
│   │   ├── indeed.js
│   │   ├── greenhouse.js
│   │   ├── lever.js
│   │   └── workday.js
│   └── utils/
│       ├── api.js          # Backend API client
│       └── storage.js      # Chrome storage helpers
└── dist/                   # Built extension
```

## Manifest.json

```json
{
  "manifest_version": 3,
  "name": "Job Tracker Auto-Fill",
  "version": "1.0.0",
  "description": "Auto-fill job applications with your profile data",
  
  "permissions": [
    "storage",
    "activeTab"
  ],
  
  "host_permissions": [
    "https://www.linkedin.com/*",
    "https://www.indeed.com/*",
    "https://boards.greenhouse.io/*",
    "https://jobs.lever.co/*",
    "https://*.myworkdayjobs.com/*",
    "https://your-api.railway.app/*"
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  
  "background": {
    "service_worker": "background/service-worker.js"
  },
  
  "content_scripts": [
    {
      "matches": [
        "https://www.linkedin.com/jobs/*",
        "https://www.indeed.com/*",
        "https://boards.greenhouse.io/*",
        "https://jobs.lever.co/*",
        "https://*.myworkdayjobs.com/*"
      ],
      "js": ["content/content.js"],
      "css": ["content/content.css"]
    }
  ],
  
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## Core Components

### 1. Popup (popup.js)

User interface when clicking extension icon.

```javascript
// popup.js
class Popup {
  constructor() {
    this.api = new ApiClient();
    this.init();
  }

  async init() {
    const isLoggedIn = await this.checkAuth();
    if (isLoggedIn) {
      this.showDashboard();
    } else {
      this.showLogin();
    }
  }

  async checkAuth() {
    const { token } = await chrome.storage.local.get('token');
    return !!token;
  }

  async login(email, password) {
    const response = await this.api.login(email, password);
    await chrome.storage.local.set({ 
      token: response.access_token,
      profile: await this.api.getProfile()
    });
    this.showDashboard();
  }

  showDashboard() {
    // Show profile summary, recent applications, quick actions
  }

  async autoFillCurrentPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'autoFill' });
  }
}
```

### 2. Content Script (content.js)

Runs on job application pages, detects forms, handles auto-fill.

```javascript
// content.js
class ContentScript {
  constructor() {
    this.adapters = {
      'linkedin.com': LinkedInAdapter,
      'indeed.com': IndeedAdapter,
      'greenhouse.io': GreenhouseAdapter,
      'lever.co': LeverAdapter,
      'myworkdayjobs.com': WorkdayAdapter
    };
    this.init();
  }

  init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'autoFill') {
        this.autoFill();
      }
    });

    // Detect if we're on an application page
    this.detectApplicationForm();
  }

  detectApplicationForm() {
    const adapter = this.getAdapter();
    if (adapter && adapter.isApplicationPage()) {
      this.showAutoFillButton();
    }
  }

  getAdapter() {
    const hostname = window.location.hostname;
    for (const [domain, Adapter] of Object.entries(this.adapters)) {
      if (hostname.includes(domain)) {
        return new Adapter();
      }
    }
    return null;
  }

  showAutoFillButton() {
    const button = document.createElement('button');
    button.id = 'job-tracker-autofill';
    button.innerHTML = '⚡ Auto-Fill';
    button.onclick = () => this.autoFill();
    document.body.appendChild(button);
  }

  async autoFill() {
    const adapter = this.getAdapter();
    if (!adapter) return;

    // Get profile from storage
    const { profile, token } = await chrome.storage.local.get(['profile', 'token']);
    if (!profile) {
      alert('Please login to Job Tracker extension first');
      return;
    }

    // Fill the form
    await adapter.fillForm(profile);

    // Show success message
    this.showNotification('Form filled! Please review before submitting.');
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'job-tracker-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
}

new ContentScript();
```

### 3. Site Adapters

Each adapter knows how to fill forms on a specific platform.

```javascript
// adapters/base.js
class BaseAdapter {
  constructor() {
    this.selectors = {};
  }

  isApplicationPage() {
    throw new Error('Must implement isApplicationPage()');
  }

  async fillForm(profile) {
    throw new Error('Must implement fillForm()');
  }

  fillInput(selector, value) {
    const input = document.querySelector(selector);
    if (input && value) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  selectOption(selector, value) {
    const select = document.querySelector(selector);
    if (select) {
      const option = Array.from(select.options).find(o => 
        o.value === value || o.text.toLowerCase().includes(value.toLowerCase())
      );
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  async uploadFile(selector, fileUrl) {
    // Fetch file and create File object
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const file = new File([blob], 'resume.pdf', { type: 'application/pdf' });
    
    const input = document.querySelector(selector);
    if (input) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}
```

```javascript
// adapters/linkedin.js
class LinkedInAdapter extends BaseAdapter {
  constructor() {
    super();
    this.selectors = {
      firstName: 'input[name="firstName"]',
      lastName: 'input[name="lastName"]',
      email: 'input[name="email"]',
      phone: 'input[name="phone"]',
      resume: 'input[type="file"]',
      coverLetter: 'textarea[name="coverLetter"]'
    };
  }

  isApplicationPage() {
    return window.location.href.includes('/jobs/') && 
           document.querySelector('.jobs-easy-apply-modal');
  }

  async fillForm(profile) {
    const [firstName, ...lastNameParts] = profile.full_name.split(' ');
    const lastName = lastNameParts.join(' ');

    this.fillInput(this.selectors.firstName, firstName);
    this.fillInput(this.selectors.lastName, lastName);
    this.fillInput(this.selectors.email, profile.email);
    this.fillInput(this.selectors.phone, profile.phone);

    // Handle resume upload if available
    if (profile.resume_url) {
      await this.uploadFile(this.selectors.resume, profile.resume_url);
    }
  }
}
```

```javascript
// adapters/greenhouse.js
class GreenhouseAdapter extends BaseAdapter {
  constructor() {
    super();
    this.selectors = {
      firstName: '#first_name',
      lastName: '#last_name',
      email: '#email',
      phone: '#phone',
      resume: '#resume',
      linkedin: 'input[name*="linkedin"]',
      github: 'input[name*="github"]',
      portfolio: 'input[name*="portfolio"], input[name*="website"]'
    };
  }

  isApplicationPage() {
    return window.location.hostname.includes('greenhouse.io') &&
           document.querySelector('#application_form');
  }

  async fillForm(profile) {
    const [firstName, ...lastNameParts] = profile.full_name.split(' ');
    const lastName = lastNameParts.join(' ');

    this.fillInput(this.selectors.firstName, firstName);
    this.fillInput(this.selectors.lastName, lastName);
    this.fillInput(this.selectors.email, profile.email);
    this.fillInput(this.selectors.phone, profile.phone);
    this.fillInput(this.selectors.linkedin, profile.linkedin_url);
    this.fillInput(this.selectors.github, profile.github_url);
    this.fillInput(this.selectors.portfolio, profile.portfolio_url);

    if (profile.resume_url) {
      await this.uploadFile(this.selectors.resume, profile.resume_url);
    }
  }
}
```

### 4. Background Service Worker

Handles API communication and token refresh.

```javascript
// background/service-worker.js
const API_BASE = 'https://your-api.railway.app/api';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'apiRequest') {
    handleApiRequest(message.endpoint, message.options)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function handleApiRequest(endpoint, options = {}) {
  const { token } = await chrome.storage.local.get('token');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (response.status === 401) {
    // Token expired, try refresh
    await refreshToken();
    return handleApiRequest(endpoint, options);
  }

  return response.json();
}

async function refreshToken() {
  const { refresh_token } = await chrome.storage.local.get('refresh_token');
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token })
  });
  
  const data = await response.json();
  await chrome.storage.local.set({ 
    token: data.access_token,
    refresh_token: data.refresh_token
  });
}

// Report application to backend
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'reportApplication') {
    handleApiRequest('/extension/applied', {
      method: 'POST',
      body: JSON.stringify(message.data)
    }).then(sendResponse);
    return true;
  }
});
```

## User Flow

### First Time Setup

1. User installs extension (load unpacked)
2. Clicks extension icon
3. Logs in with Job Tracker credentials
4. Extension fetches and stores profile data
5. Ready to use!

### Daily Usage

1. User browses job listings (LinkedIn, Indeed, etc.)
2. Opens a job they want to apply to
3. Clicks "Apply" on the job site
4. Extension detects application form
5. Shows floating "⚡ Auto-Fill" button
6. User clicks button
7. Form fills automatically
8. User reviews and clicks Submit
9. Extension reports application to dashboard

## Styling (content.css)

```css
#job-tracker-autofill {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999999;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}

#job-tracker-autofill:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.job-tracker-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 999999;
  padding: 16px 24px;
  background: #10b981;
  color: white;
  border-radius: 8px;
  font-size: 14px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Highlight filled fields */
.job-tracker-filled {
  outline: 2px solid #10b981 !important;
  background-color: rgba(16, 185, 129, 0.1) !important;
}
```

## Development

### Build Commands

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run dev

# Production build
npm run build

# Lint
npm run lint
```

### Testing

1. Make changes to source files
2. Run `npm run build`
3. Go to `brave://extensions/`
4. Click refresh icon on the extension
5. Test on a job application page

## Troubleshooting

### Extension not detecting forms

- Check if the site is in the `host_permissions` list
- Verify the adapter's `isApplicationPage()` method
- Check browser console for errors

### Auto-fill not working

- Ensure you're logged in (check popup)
- Verify profile data is complete
- Check if selectors match current site structure

### Resume upload failing

- Verify resume URL is accessible
- Check CORS settings on backend
- Ensure file input accepts PDF files

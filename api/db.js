const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const isVercel = !!process.env.VERCEL;
const DB_DIR = isVercel ? '/tmp' : path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, 'qa.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    custom_category TEXT DEFAULT '',
    severity TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'open',
    assignee TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    problems TEXT DEFAULT '[]',
    recommendation TEXT DEFAULT '[]',
    screenshots TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    resolved_at TEXT,
    source TEXT DEFAULT 'developer'
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL,
    author TEXT DEFAULT '',
    text TEXT NOT NULL,
    type TEXT DEFAULT 'note',
    timestamp TEXT NOT NULL,
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
  );
`);

// Migration for existing databases: safely add source column if missing
try {
  db.exec("ALTER TABLE issues ADD COLUMN source TEXT DEFAULT 'developer'");
} catch(e) {
  // column already exists
}

// Seed default data if empty
function seedDefaults() {
  const count = db.prepare('SELECT COUNT(*) as c FROM issues').get().c;
  if (count > 0) return;

  const insertIssue = db.prepare(`
    INSERT INTO issues (title, category, custom_category, severity, status, assignee, due_date, problems, recommendation, screenshots, created_at, updated_at, resolved_at)
    VALUES (@title, @category, @customCategory, @severity, @status, @assignee, @dueDate, @problems, @recommendation, @screenshots, @createdAt, @updatedAt, @resolvedAt)
  `);

  const defaults = [
    { title: "No loading state on profile save, allows double submissions", category: "integration", customCategory: "", severity: "severe", status: "open", assignee: "", dueDate: "",
      problems: JSON.stringify(["Clicking the **Save** button sends a request but the button stays active.", "No spinner or loading indicator while the request is in flight.", "Users can click Save multiple times, sending duplicate `POST` requests."]),
      recommendation: JSON.stringify(["Disable the Save button and show a loading indicator during API requests.", "Add client-side request deduplication."]),
      screenshots: JSON.stringify(["screenshots/07_profile_personal_info_mid.png"]), createdAt: "2026-06-30T09:00:00Z", updatedAt: "2026-06-30T09:00:00Z", resolvedAt: null },
    { title: "API errors are silently swallowed, no user-facing messages", category: "integration", customCategory: "", severity: "high", status: "open", assignee: "", dueDate: "",
      problems: JSON.stringify(["When backend requests fail, the frontend shows no error message.", "The app silently redirects to sign-in, leaving users confused.", "No distinction between `401`, `429`, or `500` errors."]),
      recommendation: JSON.stringify(["Add a global error handler mapping HTTP status codes to messages.", "Show error notifications near the failed action instead of redirecting."]),
      screenshots: JSON.stringify(["screenshots/04_signin_page.png"]), createdAt: "2026-06-30T09:00:00Z", updatedAt: "2026-06-30T09:00:00Z", resolvedAt: null },
    { title: "Required profile fields have no client-side validation", category: "integration", customCategory: "", severity: "high", status: "open", assignee: "", dueDate: "",
      problems: JSON.stringify(["Profile form marks fields as required but does not validate before submission.", "Users can submit with empty required fields. Validation only runs server-side."]),
      recommendation: JSON.stringify(["Add inline validation on blur for required fields.", "Show error messages below each invalid field before allowing submission."]),
      screenshots: JSON.stringify(["screenshots/06_profile_personal_info_top.png"]), createdAt: "2026-06-30T09:00:00Z", updatedAt: "2026-06-30T09:00:00Z", resolvedAt: null },
    { title: "Session expiry redirects without saving form progress", category: "integration", customCategory: "", severity: "medium", status: "open", assignee: "", dueDate: "",
      problems: JSON.stringify(["When the auth token expires, the app immediately redirects to sign-in.", "Any unsaved form data is lost without warning."]),
      recommendation: JSON.stringify(["Save form state to sessionStorage before redirecting on token expiry.", "Show a re-authentication dialog instead of a hard redirect."]),
      screenshots: JSON.stringify(["screenshots/04_signin_page.png"]), createdAt: "2026-06-30T09:00:00Z", updatedAt: "2026-06-30T09:00:00Z", resolvedAt: null },
    { title: "Signup form is cut off on smaller screens, submit button unreachable", category: "onboarding", customCategory: "", severity: "severe", status: "open", assignee: "", dueDate: "",
      problems: JSON.stringify(["On screens shorter than 750px, the signup form is clipped at the bottom.", "The terms checkbox and Create Account button are hidden below the viewport.", "Container uses height: 100vh with overflow: hidden, preventing scroll."]),
      recommendation: JSON.stringify(["Change container from height: 100vh to min-height: 100vh.", "Remove overflow: hidden so the browser scrolls naturally."]),
      screenshots: JSON.stringify(["screenshots/02_signup_form_top.png", "screenshots/03_signup_form_bottom.png"]), createdAt: "2026-06-30T09:00:00Z", updatedAt: "2026-06-30T09:00:00Z", resolvedAt: null },
    { title: "Password checklist pushes form content further off-screen", category: "onboarding", customCategory: "", severity: "medium", status: "open", assignee: "", dueDate: "",
      problems: JSON.stringify(["Typing a password triggers an inline validation checklist below the field.", "This adds ~150px of height, pushing the submit button further out of view."]),
      recommendation: JSON.stringify(["Show password requirements in a tooltip or side panel instead of inline.", "On wider screens, position the checklist beside the password field."]),
      screenshots: JSON.stringify(["screenshots/03_signup_form_bottom.png"]), createdAt: "2026-06-30T09:00:00Z", updatedAt: "2026-06-30T09:00:00Z", resolvedAt: null },
    { title: "Sidebar highlights wrong page: Applications stays active on Profile", category: "profile", customCategory: "", severity: "medium", status: "open", assignee: "", dueDate: "",
      problems: JSON.stringify(["When viewing Profile or Documents, the Applications sidebar item remains highlighted.", "Gives the wrong visual signal about the current page."]),
      recommendation: JSON.stringify(["Set active sidebar state based on the current URL path."]),
      screenshots: JSON.stringify(["screenshots/07_profile_personal_info_mid.png"]), createdAt: "2026-06-30T09:00:00Z", updatedAt: "2026-06-30T09:00:00Z", resolvedAt: null },
    { title: "Date of Birth field uses US format instead of local standard", category: "profile", customCategory: "", severity: "medium", status: "open", assignee: "", dueDate: "",
      problems: JSON.stringify(["The date input uses the browser default mm/dd/yyyy format.", "Most users are in Africa where dd/mm/yyyy is standard, leading to incorrect entries."]),
      recommendation: JSON.stringify(["Use a custom date picker labelled DD/MM/YYYY.", "Or add a format hint next to the field."]),
      screenshots: JSON.stringify(["screenshots/06_profile_personal_info_top.png"]), createdAt: "2026-06-30T09:00:00Z", updatedAt: "2026-06-30T09:00:00Z", resolvedAt: null },
    { title: "Consultant popup appears immediately when viewing a scholarship", category: "profile", customCategory: "", severity: "medium", status: "open", assignee: "", dueDate: "",
      problems: JSON.stringify(["Opening any scholarship detail triggers a modal before the user can read anything.", "Interrupts the browsing experience."]),
      recommendation: JSON.stringify(["Delay the popup by 10-15 seconds, or show after the user scrolls halfway.", "Consider a non-blocking banner instead of a modal."]),
      screenshots: JSON.stringify(["screenshots/15_scholarship_detail_modal.png"]), createdAt: "2026-06-30T09:00:00Z", updatedAt: "2026-06-30T09:00:00Z", resolvedAt: null },
    { title: "Landing page loads correctly, no errors detected", category: "landing", customCategory: "", severity: "pass", status: "resolved", assignee: "", dueDate: "",
      problems: JSON.stringify(["All static assets load with HTTP 200 or 304.", "No JavaScript errors in the console."]),
      recommendation: JSON.stringify(["Monitor for regressions. Ensure local dev paths don't appear in production."]),
      screenshots: JSON.stringify(["screenshots/01_homepage_landing.png"]), createdAt: "2026-06-30T09:00:00Z", updatedAt: "2026-06-30T09:00:00Z", resolvedAt: "2026-06-30T09:00:00Z" }
  ];

  const insertMany = db.transaction((items) => {
    for (const item of items) insertIssue.run(item);
  });
  insertMany(defaults);
  console.log('Seeded', defaults.length, 'default issues.');
}

seedDefaults();

module.exports = db;

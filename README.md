# FreeUnApp QA Feedback System

A dynamic client-server QA issue tracker and dashboard built for **FreeUnApp** developers. This tool is designed to manage QA feedback, track issue resolutions, log status activities, and review audit findings in a clean, professional dashboard.

---

## Tech Stack

- **Frontend**: Vanilla JS (ES6+), HTML5 Canvas (custom charts), and modern CSS styling (Zinc palette, Inter typography, JetBrains Mono for code snippets). Fully responsive list and Kanban board views.
- **Backend**: Node.js & Express.
- **Database**: SQLite (via `better-sqlite3`) configured with WAL (Write-Ahead Logging) and Foreign Keys enabled.
- **Uploads**: Multer for handling file-based screenshot evidence stored directly on disk.

---

## File Structure

```
freeunapp/
├── qa-server/
│   ├── package.json    # Backend configuration & dependencies
│   ├── db.js           # SQLite setup, migrations & default data seeds
│   └── server.js       # Express server API endpoints & static serving
├── qa-frontend/
│   └── index.html      # Dynamic dashboard frontend UI
├── uploads/            # Dynamic user screenshot uploads (Git ignored)
├── screenshots/        # Static audit screenshot assets
├── data/               # Persistent SQLite database (Git ignored)
├── .gitignore          # Rules for ignoring node_modules, database files & uploads
└── README.md           # This setup & reference guide
```

---

## Setup & Running Locally

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
Navigate into the server directory and install the required modules:
```bash
cd qa-server
npm install
```

### 2. Start the Server
Start the Express server:
```bash
node server.js
```
The server will output:
```
Seeded 10 default issues.
QA Server running at http://localhost:3000
```

### 3. Open in Browser
Visit `http://localhost:3000` to access the live system.

---

## API Documentation

### Issues
- `GET /api/issues` - Returns all issues, each including its associated notes/activity thread.
- `GET /api/issues/:id` - Returns detailed information for a single issue.
- `POST /api/issues` - Creates a new issue.
- `PUT /api/issues/:id` - Updates an existing issue (also logs status changes to the activity history).
- `DELETE /api/issues/:id` - Deletes a specific issue.
- `POST /api/issues/:id/status` - Fast status update (Open / In Progress / Resolved / Won't Fix).
- `POST /api/issues/:id/duplicate` - Duplicates an issue.

### Notes & Comments
- `POST /api/issues/:id/notes` - Adds a developer note/comment to the issue feed.

### Data Management & Uploads
- `POST /api/upload` - Uploads screenshot files, returns server paths.
- `GET /api/export` - Downloads all issues as a JSON file.
- `POST /api/import` - Merges a JSON issues array into the database.
- `DELETE /api/issues` - Deletes all issues.

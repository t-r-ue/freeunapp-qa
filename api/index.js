const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Determine Environment
const isVercel = !!process.env.VERCEL;
const UPLOADS_DIR = isVercel ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Static assets
app.use('/screenshots', express.static(path.join(__dirname, '..', 'screenshots')));

// Serve static uploads locally
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/api/uploads', express.static(UPLOADS_DIR));

// Dynamic fallback route for serverless environments (e.g. Vercel)
const serveUpload = (req, res) => {
  const file = path.join(UPLOADS_DIR, req.params.filename);
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.status(404).send('Not Found');
  }
};
app.get('/uploads/:filename', serveUpload);
app.get('/api/uploads/:filename', serveUpload);

// Serve root page for local testing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});
app.get('/feedback.js', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'feedback.js'));
});
app.get('/test.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'test.html'));
});
app.get('/html2canvas.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'html2canvas.min.js'));
});

// Multer config for screenshot uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.round(Math.random() * 1e4) + ext;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  }
});

// ============================================================
// HELPERS
// ============================================================
function formatIssue(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    customCategory: row.custom_category,
    severity: row.severity,
    status: row.status,
    assignee: row.assignee,
    dueDate: row.due_date,
    problems: JSON.parse(row.problems || '[]'),
    recommendation: JSON.parse(row.recommendation || '[]'),
    screenshots: JSON.parse(row.screenshots || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    source: row.source || 'developer'
  };
}

function getNotesForIssue(issueId) {
  return db.prepare('SELECT * FROM notes WHERE issue_id = ? ORDER BY timestamp ASC').all(issueId).map(n => ({
    id: n.id,
    author: n.author,
    text: n.text,
    type: n.type,
    timestamp: n.timestamp
  }));
}

function getIssueWithNotes(id) {
  const row = db.prepare('SELECT * FROM issues WHERE id = ?').get(id);
  if (!row) return null;
  const issue = formatIssue(row);
  issue.notes = getNotesForIssue(id);
  return issue;
}

// ============================================================
// API ROUTES
// ============================================================

// GET /api/issues
app.get('/api/issues', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM issues ORDER BY id ASC').all();
    const issues = rows.map(r => {
      const issue = formatIssue(r);
      issue.notes = getNotesForIssue(r.id);
      return issue;
    });
    res.json(issues);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/issues/:id
app.get('/api/issues/:id', (req, res) => {
  const issue = getIssueWithNotes(parseInt(req.params.id));
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  res.json(issue);
});

// POST /api/issues
app.post('/api/issues', (req, res) => {
  const b = req.body;
  const now = new Date().toISOString();
  try {
    const result = db.prepare(`
      INSERT INTO issues (title, category, custom_category, severity, status, assignee, due_date, problems, recommendation, screenshots, created_at, updated_at, resolved_at, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b.title || '', b.category || 'other', b.customCategory || '',
      b.severity || 'medium', b.status || 'open', b.assignee || '', b.dueDate || '',
      JSON.stringify(b.problems || []), JSON.stringify(b.recommendation || []),
      JSON.stringify(b.screenshots || []),
      now, now, b.status === 'resolved' ? now : null,
      b.source || 'developer'
    );
    const issue = getIssueWithNotes(result.lastInsertRowid);
    res.status(201).json(issue);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/issues/:id
app.put('/api/issues/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM issues WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Issue not found' });

  const b = req.body;
  const now = new Date().toISOString();
  const oldStatus = existing.status;
  const newStatus = b.status || oldStatus;

  let resolvedAt = existing.resolved_at;
  if (newStatus === 'resolved' && !resolvedAt) resolvedAt = now;
  else if (newStatus !== 'resolved') resolvedAt = null;

  try {
    db.prepare(`
      UPDATE issues SET title=?, category=?, custom_category=?, severity=?, status=?, assignee=?, due_date=?, problems=?, recommendation=?, screenshots=?, updated_at=?, resolved_at=?
      WHERE id=?
    `).run(
      b.title !== undefined ? b.title : existing.title,
      b.category !== undefined ? b.category : existing.category,
      b.customCategory !== undefined ? b.customCategory : existing.custom_category,
      b.severity !== undefined ? b.severity : existing.severity,
      newStatus,
      b.assignee !== undefined ? b.assignee : existing.assignee,
      b.dueDate !== undefined ? b.dueDate : existing.due_date,
      b.problems !== undefined ? JSON.stringify(b.problems) : existing.problems,
      b.recommendation !== undefined ? JSON.stringify(b.recommendation) : existing.recommendation,
      b.screenshots !== undefined ? JSON.stringify(b.screenshots) : existing.screenshots,
      now, resolvedAt, id
    );

    if (oldStatus !== newStatus) {
      db.prepare('INSERT INTO notes (issue_id, author, text, type, timestamp) VALUES (?, ?, ?, ?, ?)').run(
        id, 'System',
        `Status changed from "${oldStatus.replace(/-/g, ' ')}" to "${newStatus.replace(/-/g, ' ')}"`,
        'activity', now
      );
    }

    res.json(getIssueWithNotes(id));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/issues/:id
app.delete('/api/issues/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM issues WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Issue not found' });
  try {
    db.prepare('DELETE FROM issues WHERE id = ?').run(id);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/issues/:id/status
app.post('/api/issues/:id/status', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM issues WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Issue not found' });

  const newStatus = req.body.status;
  if (!newStatus) return res.status(400).json({ error: 'Status required' });

  const now = new Date().toISOString();
  const oldStatus = existing.status;
  let resolvedAt = existing.resolved_at;
  if (newStatus === 'resolved' && !resolvedAt) resolvedAt = now;
  else if (newStatus !== 'resolved') resolvedAt = null;

  try {
    db.prepare('UPDATE issues SET status=?, updated_at=?, resolved_at=? WHERE id=?').run(newStatus, now, resolvedAt, id);

    if (oldStatus !== newStatus) {
      db.prepare('INSERT INTO notes (issue_id, author, text, type, timestamp) VALUES (?, ?, ?, ?, ?)').run(
        id, 'System',
        `Status changed from "${oldStatus.replace(/-/g, ' ')}" to "${newStatus.replace(/-/g, ' ')}"`,
        'activity', now
      );
    }

    res.json(getIssueWithNotes(id));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/issues/:id/notes
app.post('/api/issues/:id/notes', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM issues WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Issue not found' });

  const { author, text } = req.body;
  if (!text) return res.status(400).json({ error: 'Note text required' });

  const now = new Date().toISOString();
  try {
    db.prepare('INSERT INTO notes (issue_id, author, text, type, timestamp) VALUES (?, ?, ?, ?, ?)').run(
      id, author || '-', text, 'note', now
    );
    db.prepare('UPDATE issues SET updated_at=? WHERE id=?').run(now, id);
    res.json(getIssueWithNotes(id));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/issues/:id/duplicate
app.post('/api/issues/:id/duplicate', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM issues WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Issue not found' });

  const now = new Date().toISOString();
  try {
    const result = db.prepare(`
      INSERT INTO issues (title, category, custom_category, severity, status, assignee, due_date, problems, recommendation, screenshots, created_at, updated_at, resolved_at, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '[Copy] ' + existing.title, existing.category, existing.custom_category,
      existing.severity, 'open', existing.assignee, existing.due_date,
      existing.problems, existing.recommendation, existing.screenshots,
      now, now, null, existing.source || 'developer'
    );

    db.prepare('INSERT INTO notes (issue_id, author, text, type, timestamp) VALUES (?, ?, ?, ?, ?)').run(
      result.lastInsertRowid, 'System', 'Duplicated from #' + id, 'activity', now
    );

    res.status(201).json(getIssueWithNotes(result.lastInsertRowid));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/upload
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  const paths = req.files.map(f => 'api/uploads/' + f.filename);
  res.json({ paths });
});

// GET /api/export
app.get('/api/export', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM issues ORDER BY id ASC').all();
    const issues = rows.map(r => {
      const issue = formatIssue(r);
      issue.notes = getNotesForIssue(r.id);
      return issue;
    });
    res.setHeader('Content-Disposition', 'attachment; filename=freeunapp_qa_export.json');
    res.json(issues);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/import
app.post('/api/import', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected a JSON array' });

  const now = new Date().toISOString();
  try {
    const insertIssue = db.prepare(`
      INSERT INTO issues (title, category, custom_category, severity, status, assignee, due_date, problems, recommendation, screenshots, created_at, updated_at, resolved_at, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items) => {
      for (const b of items) {
        insertIssue.run(
          b.title || '', b.category || 'other', b.customCategory || '',
          b.severity || 'medium', b.status || 'open', b.assignee || '', b.dueDate || '',
          JSON.stringify(b.problems || []), JSON.stringify(b.recommendation || []),
          JSON.stringify(b.screenshots || []),
          b.createdAt || now, b.updatedAt || now,
          b.status === 'resolved' ? (b.resolvedAt || now) : null,
          b.source || 'developer'
        );
      }
    });
    insertMany(items);
    res.json({ imported: items.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/issues
app.delete('/api/issues', (req, res) => {
  try {
    db.prepare('DELETE FROM notes').run();
    db.prepare('DELETE FROM issues').run();
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// START (Only listen if running locally outside Vercel)
// ============================================================
if (!isVercel) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`QA Server running locally at http://localhost:${PORT}`);
  });
}

module.exports = app;

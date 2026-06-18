require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const session = require('express-session');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'storytime_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/stories',  require('./routes/stories'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/auth',     require('./routes/auth'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', user: req.session.user || null });
});

// All other routes → frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Boot: init DB first, then start server ──────────────────────
async function start() {
  try {
    const initDB = require('./db/init');
    await initDB();
    app.listen(PORT, () => {
      console.log(`\n🕯️  Storytime v2  →  http://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

start();

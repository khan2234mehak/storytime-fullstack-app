const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');
const bcrypt  = require('bcryptjs');

// ── MIDDLEWARE: require login ──
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, error: 'Not logged in' });
  next();
}

// ── REGISTER ──
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, avatar_emoji } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ success: false, error: 'All fields required' });
    if (password.length < 6)
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });

    // Check existing
    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?', [username, email]
    );
    if (existing.length > 0)
      return res.status(409).json({ success: false, error: 'Username or email already taken' });

    const hash = await bcrypt.hash(password, 10);
    const emoji = avatar_emoji || '📖';
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, avatar_emoji) VALUES (?, ?, ?, ?)',
      [username, email, hash, emoji]
    );

    const user = { id: result.insertId, username, email, avatar_emoji: emoji };
    req.session.user = user;
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── LOGIN ──
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, error: 'Username and password required' });

    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?', [username, username]
    );
    if (!rows.length)
      return res.status(401).json({ success: false, error: 'Invalid username or password' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, error: 'Invalid username or password' });

    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const userData = { id: user.id, username: user.username, email: user.email, avatar_emoji: user.avatar_emoji };
    req.session.user = userData;
    res.json({ success: true, user: userData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── LOGOUT ──
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ── GET CURRENT USER ──
router.get('/me', (req, res) => {
  if (!req.session.user) return res.json({ success: false, user: null });
  res.json({ success: true, user: req.session.user });
});

// ── GET READING HISTORY ──
router.get('/history', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT rh.*, s.cover_emoji, s.cover_color, s.genre
       FROM reading_history rh
       LEFT JOIN stories s ON s.id = rh.story_id
       WHERE rh.user_id = ?
       ORDER BY rh.played_at DESC`,
      [req.session.user.id]
    );
    res.json({ success: true, history: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET STATS ──
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;

    const [totalRows]     = await db.query('SELECT COUNT(*) as total FROM reading_history WHERE user_id = ?', [uid]);
    const [completedRows] = await db.query('SELECT COUNT(*) as total FROM reading_history WHERE user_id = ? AND completed = 1', [uid]);
    const [endingRows]    = await db.query(
      `SELECT ending_type, COUNT(*) as count FROM reading_history
       WHERE user_id = ? AND completed = 1 GROUP BY ending_type`, [uid]
    );
    const [favStory]      = await db.query(
      `SELECT story_title, COUNT(*) as times FROM reading_history
       WHERE user_id = ? GROUP BY story_title ORDER BY times DESC LIMIT 1`, [uid]
    );

    res.json({
      success: true,
      stats: {
        total_reads:    totalRows[0].total,
        completed:      completedRows[0].total,
        endings_by_type: endingRows,
        favourite_story: favStory[0] || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SAVE READING ENTRY (called from frontend on ending) ──
router.post('/history/add', requireAuth, async (req, res) => {
  try {
    const { story_id, story_title, ending_reached, ending_type, choices_made, scenes_visited, completed } = req.body;
    await db.query(
      `INSERT INTO reading_history
       (user_id, story_id, story_title, ending_reached, ending_type, choices_made, scenes_visited, completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.user.id, story_id, story_title, ending_reached || null,
       ending_type || null, choices_made || 0, scenes_visited || 0, completed ? 1 : 0]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── UPDATE AVATAR ──
router.put('/avatar', requireAuth, async (req, res) => {
  try {
    const { avatar_emoji } = req.body;
    await db.query('UPDATE users SET avatar_emoji = ? WHERE id = ?', [avatar_emoji, req.session.user.id]);
    req.session.user.avatar_emoji = avatar_emoji;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
module.exports.requireAuth = requireAuth;

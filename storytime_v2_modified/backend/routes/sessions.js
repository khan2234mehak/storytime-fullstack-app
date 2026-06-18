const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');
const crypto  = require('crypto');

// GET stats overview
router.get('/stats/overview', async (req, res) => {
  try {
    const [totalSessions]     = await db.query('SELECT COUNT(*) as count FROM player_sessions');
    const [completedSessions] = await db.query('SELECT COUNT(*) as count FROM player_sessions WHERE completed = 1');
    const [popularEndings]    = await db.query(
      `SELECT ending_reached, COUNT(*) as count FROM player_sessions
       WHERE completed = 1 AND ending_reached IS NOT NULL
       GROUP BY ending_reached ORDER BY count DESC LIMIT 5`
    );
    res.json({ success: true, stats: { total: totalSessions[0].count, completed: completedSessions[0].count, popularEndings }});
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST create new session
router.post('/new', async (req, res) => {
  try {
    const { story_id } = req.body;
    if (!story_id) return res.status(400).json({ success: false, error: 'story_id required' });
    const session_id = crypto.randomUUID();
    const user_id = req.session?.user?.id || null;
    await db.query(
      `INSERT INTO player_sessions (session_id, user_id, story_id, current_node_key, path_taken) VALUES (?, ?, ?, 'start', '[]')`,
      [session_id, user_id, story_id]
    );
    await db.query('UPDATE stories SET play_count = play_count + 1 WHERE id = ?', [story_id]);
    res.json({ success: true, session_id });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET session state
router.get('/:sessionId', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM player_sessions WHERE session_id = ?', [req.params.sessionId]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, session: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PUT advance session
router.put('/:sessionId/advance', async (req, res) => {
  try {
    const { next_node_key } = req.body;
    const sessionId = req.params.sessionId;
    const [rows] = await db.query('SELECT * FROM player_sessions WHERE session_id = ?', [sessionId]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Session not found' });
    const sess = rows[0];
    const path = JSON.parse(sess.path_taken || '[]');
    path.push(next_node_key);
    const [nodeRows] = await db.query(
      'SELECT is_ending, ending_type FROM story_nodes WHERE story_id = ? AND node_key = ?',
      [sess.story_id, next_node_key]
    );
    const isEnding   = nodeRows.length > 0 && nodeRows[0].is_ending;
    const endingType = isEnding ? nodeRows[0].ending_type : null;
    await db.query(
      `UPDATE player_sessions SET current_node_key=?, path_taken=?, completed=?, ending_reached=?, last_updated=datetime('now') WHERE session_id=?`,
      [next_node_key, JSON.stringify(path), isEnding, isEnding ? next_node_key : null, sessionId]
    );
    // Save reading history for logged-in users
    if (isEnding && sess.user_id) {
      const [storyRows] = await db.query('SELECT title FROM stories WHERE id = ?', [sess.story_id]);
      const storyTitle  = storyRows[0]?.title || 'Unknown';
      await db.query(
        `INSERT INTO reading_history (user_id, story_id, story_title, ending_reached, ending_type, choices_made, scenes_visited, completed) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [sess.user_id, sess.story_id, storyTitle, next_node_key, endingType, path.length, path.length]
      );
    }
    res.json({ success: true, completed: isEnding });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET all stories
router.get('/', async (req, res) => {
  try {
    const [stories] = await db.query(
      'SELECT * FROM stories ORDER BY created_at DESC'
    );
    res.json({ success: true, stories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single story info
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM stories WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Story not found' });
    res.json({ success: true, story: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET a specific node for a story
router.get('/:id/node/:nodeKey', async (req, res) => {
  try {
    const { id, nodeKey } = req.params;

    const [nodes] = await db.query(
      'SELECT * FROM story_nodes WHERE story_id = ? AND node_key = ?',
      [id, nodeKey]
    );

    if (!nodes.length) return res.status(404).json({ success: false, error: 'Node not found' });

    const node = nodes[0];

    // Get choices if not an ending
    let choices = [];
    if (!node.is_ending) {
      const [choiceRows] = await db.query(
        'SELECT * FROM choices WHERE node_id = ? ORDER BY choice_order ASC',
        [node.id]
      );
      choices = choiceRows;
    }

    res.json({ success: true, node, choices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST increment play count
router.post('/:id/play', async (req, res) => {
  try {
    await db.query('UPDATE stories SET play_count = play_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

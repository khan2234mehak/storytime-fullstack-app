// ============================================================
// STORYTIME — API Client with Smart Merge
// Shows all stories: backend DB + embedded + user-created
// ============================================================

const API_BASE = '/api';
let useBackend = true;

const api = {
  async getStories() {
    let stories = [];

    if (useBackend) {
      try {
        const res = await fetch(`${API_BASE}/stories`, { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        if (data.success && data.stories.length > 0) {
          stories = data.stories;
          // Supplement with any embedded stories not in backend
          STORIES_DATA.forEach(embedded => {
            if (!stories.find(s => s.title === embedded.title)) {
              stories.push(embedded);
            }
          });
        } else throw new Error('Empty response');
      } catch (err) {
        console.warn('Backend unavailable, using embedded data:', err.message);
        useBackend = false;
        stories = [...STORIES_DATA];
      }
    } else {
      stories = [...STORIES_DATA];
    }

    // Always merge custom user-created stories from localStorage
    try {
      const custom = JSON.parse(localStorage.getItem('st_custom_stories') || '[]');
      custom.forEach(s => {
        if (!stories.find(x => x.id === s.id)) stories.push(s);
      });
    } catch (e) {}

    return stories;
  },

  async getStory(id) {
    // Check custom stories first
    try {
      const custom = JSON.parse(localStorage.getItem('st_custom_stories') || '[]');
      const found = custom.find(s => s.id == id);
      if (found) return found;
    } catch (e) {}

    // Check embedded (for stories not in backend DB)
    const embedded = STORIES_DATA.find(s => s.id == id);
    if (!useBackend || embedded) {
      if (embedded) return embedded;
      throw new Error('Story not found');
    }

    try {
      const res = await fetch(`${API_BASE}/stories/${id}`);
      const data = await res.json();
      if (data.success) return data.story;
      throw new Error(data.error);
    } catch {
      useBackend = false;
      const story = STORIES_DATA.find(s => s.id == id);
      if (!story) throw new Error('Story not found');
      return story;
    }
  },

  async getNode(storyId, nodeKey) {
    // Custom stories
    try {
      const custom = JSON.parse(localStorage.getItem('st_custom_stories') || '[]');
      const story = custom.find(s => s.id == storyId);
      if (story) {
        const node = story.nodes[nodeKey];
        if (!node) throw new Error(`Node '${nodeKey}' not found`);
        return {
          node: { ...node, node_key: nodeKey, story_id: storyId },
          choices: (node.choices || []).map((c, i) => ({
            id: i, choice_text: c.text, next_node_key: c.next,
            choice_icon: c.icon || '→', choice_order: i
          }))
        };
      }
    } catch (e) {}

    // Embedded stories (ids 1-5 always use embedded data when available)
    const embeddedStory = STORIES_DATA.find(s => s.id == storyId);
    if (embeddedStory) {
      const node = embeddedStory.nodes[nodeKey];
      if (!node) throw new Error(`Node '${nodeKey}' not found`);
      return {
        node: { ...node, node_key: nodeKey, story_id: storyId },
        choices: (node.choices || []).map((c, i) => ({
          id: i, choice_text: c.text, next_node_key: c.next,
          choice_icon: c.icon || '→', choice_order: i
        }))
      };
    }

    if (!useBackend) throw new Error('Story not found');

    try {
      const res = await fetch(`${API_BASE}/stories/${storyId}/node/${nodeKey}`);
      const data = await res.json();
      if (data.success) return data;
      throw new Error(data.error);
    } catch {
      useBackend = false;
      return api.getNode(storyId, nodeKey);
    }
  },

  async createSession(storyId) {
    if (!useBackend) return `local-${Date.now()}`;
    if (String(storyId) === 'preview') return `local-${Date.now()}`;
    // Embedded stories use local sessions
    if (STORIES_DATA.find(s => s.id == storyId)) return `local-${Date.now()}`;
    // Custom stories use local sessions
    try {
      const custom = JSON.parse(localStorage.getItem('st_custom_stories') || '[]');
      if (custom.find(s => s.id == storyId)) return `local-${Date.now()}`;
    } catch (e) {}

    try {
      const res = await fetch(`${API_BASE}/sessions/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: storyId }),
        signal: AbortSignal.timeout(3000)
      });
      const data = await res.json();
      if (data.success) return data.session_id;
      throw new Error(data.error);
    } catch {
      return `local-${Date.now()}`;
    }
  },

  async advanceSession(sessionId, nextNodeKey) {
    if (!useBackend || sessionId.startsWith('local-')) return { success: true };
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/advance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next_node_key: nextNodeKey })
      });
      return await res.json();
    } catch {
      return { success: true };
    }
  }
};

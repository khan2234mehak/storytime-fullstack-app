// ============================================================
// STORYTIME — Story Creator Module
// ============================================================

let nodeCounter = 0;

// ── SHOW CREATE SCREEN ──
function showCreate() {
  audioEngine.sfx('page');
  showScreen('create-screen');
  if (document.getElementById('nodes-list').children.length === 0) {
    // Add default 'start' node
    addNode('start');
    addNode('ending_1');
    // Mark ending_1 as an ending by default
    const endingCard = document.querySelector('[data-node-id="ending_1"]');
    if (endingCard) {
      const endingCheck = endingCard.querySelector('.is-ending-check');
      if (endingCheck) { endingCheck.checked = true; toggleEndingMode(endingCheck); }
    }
  }
}

// ── ADD A NODE ──
function addNode(forcedId) {
  nodeCounter++;
  const nodeId = forcedId || `scene_${nodeCounter}`;
  const card = document.createElement('div');
  card.className = 'node-card';
  card.dataset.nodeId = nodeId;

  card.innerHTML = `
    <div class="node-card-head">
      <div class="node-id-badge">ID: <span class="node-id-display">${nodeId}</span></div>
      <input type="text" class="node-id-input" value="${nodeId}" placeholder="scene_id"
             oninput="updateNodeId(this)" title="Scene ID (used for linking)"/>
      <button class="node-remove-btn" onclick="removeNode(this)" title="Remove scene">✕ Remove</button>
    </div>
    <div class="create-fields" style="margin-bottom:.85rem">
      <div class="create-field">
        <label>Scene Title</label>
        <input type="text" class="node-title" placeholder="The Dark Corridor..." maxlength="80"/>
      </div>
    </div>
    <textarea class="node-content" placeholder="Write what happens in this scene. Describe the setting, the tension, the moment of decision..."></textarea>
    <div class="node-options">
      <label>
        <input type="checkbox" class="is-ending-check" onchange="toggleEndingMode(this)"/>
        This is an ending scene
      </label>
      <label class="mood-label">Mood:
        <select class="node-mood">
          <option value="default">Default</option>
          <option value="dark">Dark</option>
          <option value="stormy">Stormy</option>
          <option value="nightmare">Nightmare</option>
          <option value="cyberpunk">Cyberpunk</option>
          <option value="underground">Underground</option>
          <option value="corporate">Corporate</option>
          <option value="fantasy">Fantasy</option>
          <option value="dark-fantasy">Dark Fantasy</option>
          <option value="enchanted">Enchanted</option>
        </select>
      </label>
      <div class="ending-type-wrap" style="display:none">
        <label class="mood-label">Ending type:
          <select class="ending-type-sel">
            <option value="good">Good ✦</option>
            <option value="neutral">Neutral ⚖</option>
            <option value="bad">Bad 💀</option>
            <option value="secret">Secret 🌑</option>
          </select>
        </label>
      </div>
    </div>
    <div class="choices-section">
      <div class="choices-editor"></div>
      <button class="add-choice-btn" onclick="addChoice(this)">+ Add Choice</button>
    </div>`;

  document.getElementById('nodes-list').appendChild(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── UPDATE NODE ID ──
function updateNodeId(input) {
  const card = input.closest('.node-card');
  const display = card.querySelector('.node-id-display');
  const cleanId = input.value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  card.dataset.nodeId = cleanId;
  display.textContent = cleanId;
}

// ── REMOVE NODE ──
function removeNode(btn) {
  const card = btn.closest('.node-card');
  if (document.querySelectorAll('.node-card').length <= 1) {
    setValidation('You need at least one scene!', 'error');
    return;
  }
  card.style.opacity = '0';
  card.style.transform = 'translateY(-10px)';
  card.style.transition = 'all .3s ease';
  setTimeout(() => card.remove(), 300);
}

// ── TOGGLE ENDING MODE ──
function toggleEndingMode(checkbox) {
  const card = checkbox.closest('.node-card');
  const choicesSection = card.querySelector('.choices-section');
  const endingTypeWrap = card.querySelector('.ending-type-wrap');
  const isEnding = checkbox.checked;
  card.classList.toggle('is-ending', isEnding);
  choicesSection.style.display = isEnding ? 'none' : 'block';
  endingTypeWrap.style.display = isEnding ? 'flex' : 'none';
}

// ── ADD CHOICE ──
function addChoice(btn) {
  const editor = btn.previousElementSibling;
  const row = document.createElement('div');
  row.className = 'choice-row';
  row.innerHTML = `
    <input type="text" class="choice-icon" placeholder="→" maxlength="4" title="Icon (emoji)" value="→"/>
    <input type="text" class="choice-text" placeholder="Choice text shown to reader..." maxlength="120"/>
    <input type="text" class="choice-next" placeholder="Next scene ID..." maxlength="60"/>
    <button class="choice-remove" onclick="this.closest('.choice-row').remove()" title="Remove choice">✕</button>`;
  editor.appendChild(row);
  row.querySelector('.choice-text').focus();
}

// ── GATHER STORY DATA ──
function gatherStoryData() {
  const title = document.getElementById('cs-title').value.trim();
  const desc = document.getElementById('cs-desc').value.trim();
  const genre = document.getElementById('cs-genre').value;
  const emoji = document.getElementById('cs-emoji').value.trim() || '📖';
  const color = document.getElementById('cs-color').value;

  const nodes = {};
  let endingCount = 0;
  const errors = [];

  document.querySelectorAll('.node-card').forEach(card => {
    const id = card.dataset.nodeId;
    const titleEl = card.querySelector('.node-title');
    const contentEl = card.querySelector('.node-content');
    const moodEl = card.querySelector('.node-mood');
    const isEndingCheck = card.querySelector('.is-ending-check');
    const endingTypeSel = card.querySelector('.ending-type-sel');

    if (!id) { errors.push('One scene is missing an ID.'); return; }

    const nodeTitle = titleEl?.value.trim() || 'Untitled Scene';
    const nodeContent = contentEl?.value.trim() || '';

    if (!nodeContent) errors.push(`Scene "${id}": content is empty.`);

    const isEnding = isEndingCheck?.checked || false;
    if (isEnding) endingCount++;

    const choices = [];
    if (!isEnding) {
      card.querySelectorAll('.choice-row').forEach(row => {
        const text = row.querySelector('.choice-text')?.value.trim();
        const next = row.querySelector('.choice-next')?.value.trim();
        const icon = row.querySelector('.choice-icon')?.value.trim() || '→';
        if (text && next) choices.push({ text, next, icon });
      });
    }

    nodes[id] = {
      title: nodeTitle,
      content: nodeContent,
      background_mood: moodEl?.value || 'default',
      is_ending: isEnding,
      ending_type: isEnding ? (endingTypeSel?.value || 'neutral') : undefined,
      choices: isEnding ? [] : choices
    };
  });

  if (!title) errors.push('Story title is required.');
  if (!desc) errors.push('Story description is required.');
  if (!nodes['start']) errors.push('You must have a scene with ID "start".');
  if (endingCount === 0) errors.push('Add at least one ending scene.');

  // Check for broken links
  Object.entries(nodes).forEach(([id, node]) => {
    if (!node.is_ending) {
      if (node.choices.length === 0) errors.push(`Scene "${id}": needs at least one choice (or mark as ending).`);
      node.choices.forEach(c => {
        if (!nodes[c.next]) errors.push(`Scene "${id}": choice links to unknown scene "${c.next}".`);
      });
    }
  });

  return { title, desc, genre, emoji, color, nodes, errors };
}

// ── VALIDATE & SET MESSAGE ──
function setValidation(msg, type) {
  const el = document.getElementById('create-validation');
  el.textContent = msg;
  el.className = 'create-validation ' + (type || '');
}

// ── SAVE STORY ──
function saveStory() {
  audioEngine.sfx('choose');
  const { title, desc, genre, emoji, color, nodes, errors } = gatherStoryData();

  if (errors.length > 0) {
    setValidation('⚠ ' + errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} more)` : ''), 'error');
    return;
  }

  // Load existing custom stories
  let customStories = [];
  try { customStories = JSON.parse(localStorage.getItem('st_custom_stories') || '[]'); } catch(e) {}

  // Assign an ID above 1000 to avoid conflicts
  const newId = Date.now();
  const endingCount = Object.values(nodes).filter(n => n.is_ending).length;

  const story = {
    id: newId,
    title,
    description: desc,
    genre,
    cover_emoji: emoji,
    cover_color: color,
    total_endings: endingCount,
    play_count: 0,
    is_custom: true,
    nodes
  };

  customStories.push(story);
  try {
    localStorage.setItem('st_custom_stories', JSON.stringify(customStories));
  } catch(e) {
    setValidation('Could not save: localStorage unavailable.', 'error');
    return;
  }

  setValidation('✦ Story saved to your library!', 'ok');
  audioEngine.sfx('good');

  // Clear form & go to library after short delay
  setTimeout(() => {
    clearCreateForm();
    showLib();
  }, 1200);
}

// ── PREVIEW STORY ──
function previewStory() {
  audioEngine.sfx('whoosh');
  const { title, desc, genre, emoji, color, nodes, errors } = gatherStoryData();

  if (errors.length > 0) {
    setValidation('⚠ ' + errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} more)` : ''), 'error');
    return;
  }

  // Temporarily inject into state for playing
  const previewStoryObj = {
    id: 'preview',
    title: title || 'Preview',
    description: desc,
    genre,
    cover_emoji: emoji,
    cover_color: color,
    total_endings: Object.values(nodes).filter(n => n.is_ending).length,
    play_count: 0,
    nodes
  };

  // Add to STORIES_DATA temporarily
  const existingIdx = STORIES_DATA.findIndex(s => s.id === 'preview');
  if (existingIdx >= 0) STORIES_DATA.splice(existingIdx, 1);
  STORIES_DATA.push(previewStoryObj);

  setValidation('', '');
  startStory('preview');
}

// ── CLEAR FORM ──
function clearCreateForm() {
  document.getElementById('cs-title').value = '';
  document.getElementById('cs-desc').value = '';
  document.getElementById('cs-emoji').value = '';
  document.getElementById('cs-color').value = '#0d0d1a';
  document.getElementById('nodes-list').innerHTML = '';
  nodeCounter = 0;
  setValidation('', '');
}

// ── LOAD CUSTOM STORIES INTO STORIES_DATA ──
function loadCustomStories() {
  try {
    const customStories = JSON.parse(localStorage.getItem('st_custom_stories') || '[]');
    customStories.forEach(story => {
      // Don't duplicate
      if (!STORIES_DATA.find(s => s.id === story.id)) {
        STORIES_DATA.push(story);
      }
    });
  } catch(e) {}
}

// Run on init
document.addEventListener('DOMContentLoaded', () => {
  loadCustomStories();
});

// ============================================================
// STORYTIME — Application v2
// ============================================================

// ── STATE ──
const state = {
  currentStory: null,
  sessionId: null,
  choiceCount: 0,
  sceneCount: 0,
  pathKeys: []
};

// ── STAR CANVAS (Intro) ──
function initStars() {
  const canvas = document.getElementById('star-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [];
  let animId;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.3 + 0.05,
      alpha: Math.random() * 0.7 + 0.1,
      pulse: Math.random() * Math.PI * 2
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t = Date.now() / 1000;
    stars.forEach(s => {
      const a = s.alpha * (0.6 + 0.4 * Math.sin(t * s.speed + s.pulse));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,240,200,${a})`;
      ctx.fill();
    });
    animId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
  return () => cancelAnimationFrame(animId);
}

// ── ENDING PARTICLES ──
function spawnEndingParticles(type) {
  const canvas = document.getElementById('ending-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = {
    good:    ['#8edd70','#c8f0a0','#ffffff','#d4ff90'],
    bad:     ['#8b1828','#c42040','#400010','#ff4060'],
    neutral: ['#c8924a','#e8b96e','#f5d090','#ffffff'],
    secret:  ['#9050e0','#c090ff','#6030b0','#ffffff']
  };

  const palette = colors[type] || colors.neutral;
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: canvas.height + 20,
    vx: (Math.random() - 0.5) * 3,
    vy: -(Math.random() * 3 + 1.5),
    r: Math.random() * 4 + 2,
    alpha: 1,
    color: palette[Math.floor(Math.random() * palette.length)],
    decay: Math.random() * 0.008 + 0.004
  }));

  let animId;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    particles.forEach(p => {
      if (p.alpha <= 0) return;
      alive++;
      p.x += p.vx; p.y += p.vy; p.vy += 0.015;
      p.alpha -= p.decay;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2,'0');
      ctx.fill();
    });
    if (alive > 0) animId = requestAnimationFrame(draw);
  }
  draw();
}

// ── SCREEN TRANSITIONS ──
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(id);
  if (screen) {
    screen.classList.add('active');
    screen.scrollTop = 0;
  }
}

// ── INTRO ──
function onEnter() {
  audioEngine.startWithUserGesture();
  audioEngine.sfx('intro');
  document.getElementById('music-bar')?.classList.remove('hidden');
  setTimeout(() => showLib(), 600);
}

function goHome() {
  audioEngine.sfx('whoosh');
  showScreen('intro-screen');
}

// ── LIBRARY ──
async function showLib() {
  showScreen('library-screen');
  await loadStories();
}

async function loadStories() {
  const grid = document.getElementById('story-grid');
  grid.innerHTML = `<div class="loading-state"><div class="spin-glyph">✦</div><p>Summoning worlds...</p></div>`;

  try {
    const stories = await api.getStories();
    grid.innerHTML = '';
    stories.forEach((story, i) => {
      const card = buildStoryCard(story, i);
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `
      <div class="loading-state" style="color:var(--crimson2)">
        <div style="font-size:3rem;margin-bottom:1rem">⚠️</div>
        <p>Could not load stories.</p>
        <p style="font-size:.8rem;opacity:.6;margin-top:.5rem">${err.message}</p>
        <button class="ghost-btn" style="margin-top:1.5rem" onclick="loadStories()">↺ Retry</button>
      </div>`;
  }
}

function buildStoryCard(story, index) {
  const card = document.createElement('div');
  card.className = 'story-card';
  card.style.animationDelay = `${index * 0.15}s`;

  card.innerHTML = `
    <div class="card-banner" style="background:${story.cover_color}">
      <div class="card-banner-gradient" style="background:${story.cover_color}"></div>
      <div class="card-banner-overlay"></div>
      <div class="card-shine"></div>
      <div class="card-banner-emoji">${story.cover_emoji}</div>
      ${story.is_custom ? '<div class="card-custom-badge">✍ Custom</div>' : ''}
    </div>
    <div class="card-body">
      <div class="card-genre">${story.genre}</div>
      <h3 class="card-title">${story.title}</h3>
      <p class="card-desc">${story.description}</p>
    </div>
    <div class="card-foot">
      <div class="card-meta">
        <span><strong>${story.total_endings}</strong> endings</span>
        <span>Played <strong>${story.play_count || 0}×</strong></span>
      </div>
      <button class="card-read-btn" onclick="event.stopPropagation();showDetail(${story.id})">Read →</button>
    </div>`;

  // Hover SFX
  card.addEventListener('mouseenter', () => audioEngine.sfx('hover'));
  card.addEventListener('click', () => showDetail(story.id));
  return card;
}

// ── DETAIL ──
async function showDetail(storyId) {
  audioEngine.sfx('page');

  let story;
  try { story = await api.getStory(storyId); }
  catch(e) { console.error(e); return; }

  state.currentStory = story;

  // Genre pill
  document.getElementById('detail-genre-pill').textContent = story.genre;

  // Backdrop color
  const backdrop = document.getElementById('detail-backdrop');
  if (backdrop) backdrop.style.background = `radial-gradient(ellipse at center,${story.cover_color} 0%,transparent 70%)`;

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-emoji">${story.cover_emoji}</div>
    <h1 class="detail-title">${story.title}</h1>
    <p class="detail-desc">${story.description}</p>
    <div class="detail-stats">
      <div class="d-stat">
        <span class="d-stat-val">${story.total_endings}</span>
        <div class="d-stat-label">Endings</div>
      </div>
      <div class="d-stat">
        <span class="d-stat-val">${story.play_count || 0}</span>
        <div class="d-stat-label">Plays</div>
      </div>
      <div class="d-stat">
        <span class="d-stat-val">∞</span>
        <div class="d-stat-label">Paths</div>
      </div>
    </div>
    <div class="detail-rule"><span>✦</span></div>
    <p class="detail-warning">⚠ Your choices are permanent. There is no undo.</p>
    <button class="gold-btn" onclick="startStory(${story.id})" style="font-size:1rem;padding:1rem 2.5rem">
      Begin the Tale
    </button>`;

  showScreen('detail-screen');
}

// ── START STORY ──
async function startStory(storyId) {
  audioEngine.sfx('whoosh');

  state.choiceCount = 0;
  state.sceneCount = 0;
  state.pathKeys = [];

  try {
    state.sessionId = await api.createSession(storyId);
    showScreen('reading-screen');
    await loadNode('start');
  } catch (err) {
    console.error('Failed to start story:', err);
  }
}

// ── LOAD NODE ──
async function loadNode(nodeKey) {
  const container = document.getElementById('scene-container');
  container.innerHTML = `
    <div style="text-align:center;padding:5rem;color:var(--parch3);font-style:italic;animation:fade-up .4s ease">
      <div style="font-size:2rem;margin-bottom:1rem;color:var(--gold);animation:spin-y 2s linear infinite">✦</div>
      Turning the page...
    </div>`;

  try {
    const { node, choices } = await api.getNode(state.currentStory.id, nodeKey);
    state.sceneCount++;

    // Set reading atmosphere
    const mood = node.background_mood || 'default';
    const readBg = document.getElementById('read-bg');
    if (readBg) readBg.className = 'read-bg mood-' + mood;

    // Set music mood
    audioEngine.setMood(mood);

    // Update progress
    updateProgress();

    if (node.is_ending) {
      if (state.sessionId) api.advanceSession(state.sessionId, nodeKey).catch(()=>{});
      await sleep(400);
      showEnding(node);
    } else {
      renderScene(node, choices);
    }
  } catch (err) {
    container.innerHTML = `<div style="text-align:center;padding:4rem;color:var(--crimson2)">
      <p style="font-size:1.5rem;margin-bottom:1rem">⚠</p>
      <p>Failed to load scene: ${err.message}</p>
      <button class="ghost-btn" style="margin-top:1.5rem" onclick="showLib()">Return to Library</button>
    </div>`;
    console.error(err);
  }
}

// ── RENDER SCENE ──
function renderScene(node, choices) {
  const container = document.getElementById('scene-container');

  const choicesHTML = choices.length ? `
    <div class="choices-header">— What do you do? —</div>
    <div class="choices-list">
      ${choices.map(c => `
        <button class="choice-btn"
          onclick="makeChoice('${esc(c.next_node_key)}','${esc(c.choice_text)}')"
          onmouseenter="audioEngine.sfx('hover')">
          <span class="choice-ico">${c.choice_icon || '→'}</span>
          <span class="choice-label">${c.choice_text}</span>
          <span class="choice-arrow">→</span>
        </button>`).join('')}
    </div>` : '';

  container.innerHTML = `
    <div class="scene-card">
      <div class="scene-genre-tag">${state.currentStory?.genre || 'Story'}</div>
      <h2 class="scene-title">${node.title || 'A New Scene'}</h2>
      <div class="scene-prose">${node.content}</div>
      ${choicesHTML}
    </div>`;

  updateCrumbs();
  audioEngine.sfx('page');
}

// ── MAKE CHOICE ──
async function makeChoice(nextNodeKey) {
  state.choiceCount++;
  state.pathKeys.push(nextNodeKey);

  // Lock all buttons
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.45';
    btn.style.pointerEvents = 'none';
  });

  audioEngine.sfx('choose');

  if (state.sessionId) api.advanceSession(state.sessionId, nextNodeKey).catch(()=>{});

  await sleep(350);
  await loadNode(nextNodeKey);
}

// ── SHOW ENDING ──
function showEnding(node) {
  const type = node.ending_type || 'neutral';
  const config = {
    good:    { emblem: '🏆', badge: '✦ GOOD ENDING ✦',    sfx: 'good' },
    bad:     { emblem: '💀', badge: '✦ DARK ENDING ✦',    sfx: 'bad' },
    neutral: { emblem: '⚖️', badge: '✦ BITTERSWEET ENDING ✦', sfx: 'neutral' },
    secret:  { emblem: '🌑', badge: '✦ SECRET ENDING FOUND ✦', sfx: 'secret' }
  };
  const cfg = config[type] || config.neutral;

  document.getElementById('ending-emblem').textContent = cfg.emblem;
  document.getElementById('ending-badge').textContent = cfg.badge;
  document.getElementById('ending-title').textContent = node.title || 'The End';
  document.getElementById('ending-prose').textContent = node.content;
  document.getElementById('ending-stats-row').innerHTML =
    `Choices made: <strong>${state.choiceCount}</strong> &nbsp;·&nbsp; 
     Scenes visited: <strong>${state.sceneCount}</strong> &nbsp;·&nbsp; 
     Story: <strong>${state.currentStory?.title || ''}</strong>`;

  const endScreen = document.getElementById('ending-screen');
  endScreen.className = 'screen ending-' + type;

  showScreen('ending-screen');
  audioEngine.sfx(cfg.sfx);

  // Save to reading history if logged in
  saveReadingHistory({
    story_id: state.currentStory?.id,
    story_title: state.currentStory?.title,
    ending_reached: node.node_key || node.title,
    ending_type: type,
    choices_made: state.choiceCount,
    scenes_visited: state.sceneCount,
    completed: true
  }).catch(()=>{});
  setTimeout(() => spawnEndingParticles(type), 500);
}

// ── PROGRESS & CRUMBS ──
function updateProgress() {
  const pct = Math.min(Math.round(state.sceneCount * 14), 96);
  const fill = document.getElementById('read-fill');
  const gem = document.getElementById('read-gem');
  const chapter = document.getElementById('read-chapter');
  const choiceTally = document.getElementById('read-choices');

  if (fill) fill.style.width = pct + '%';
  if (gem) gem.style.left = pct + '%';
  if (chapter) chapter.textContent = `Scene ${state.sceneCount}`;
  if (choiceTally) choiceTally.textContent = `${state.choiceCount} choice${state.choiceCount !== 1 ? 's' : ''}`;
}

function updateCrumbs() {
  const trail = document.getElementById('crumb-trail');
  if (!trail) return;
  const count = Math.min(state.sceneCount, 10);
  trail.innerHTML = Array.from({ length: count }, () => '<div class="crumb-dot"></div>').join('');
}

// ── MODAL ──
function confirmExit() { document.getElementById('exit-modal').style.display = 'flex'; }
function closeModal()  { document.getElementById('exit-modal').style.display = 'none'; }
function exitStory()   { closeModal(); showLib(); }
function restartStory() {
  if (state.currentStory) startStory(state.currentStory.id);
}

// ── UTILS ──
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function esc(s) { return (s || '').replace(/'/g, "\\'").replace(/"/g, '\\"'); }

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  initStars();
  await initAuth(); // check existing session
  if (currentUser) document.body.classList.add('has-user-bar');

  // Close modal on backdrop click
  document.getElementById('exit-modal')?.addEventListener('click', e => {
    if (e.target.id === 'exit-modal') closeModal();
  });

  // Update vol slider fill on load
  const slider = document.getElementById('vol-slider');
  if (slider) {
    const v = slider.value;
    slider.style.background = `linear-gradient(90deg,var(--gold) ${v}%,rgba(200,146,74,.25) ${v}%)`;
    slider.addEventListener('input', function() {
      this.style.background = `linear-gradient(90deg,var(--gold) ${this.value}%,rgba(200,146,74,.25) ${this.value}%)`;
    });
  }
});

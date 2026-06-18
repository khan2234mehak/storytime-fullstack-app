// ============================================================
// STORYTIME — Auth & Profile Module (Frontend)
// ============================================================

let currentUser = null;
let selectedAvatar = '📖';

// ── CHECK SESSION ON LOAD ──
async function initAuth() {
  try {
    const res  = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      updateUserBar();
    }
  } catch (e) {}
}

// ── USER BAR (top strip when logged in) ──
function updateUserBar() {
  const bar  = document.getElementById('user-bar');
  const info = document.getElementById('user-bar-info');
  if (!bar || !info) return;
  if (currentUser) {
    bar.classList.remove('hidden');
    document.body.classList.add('has-user-bar');
    info.innerHTML = `<span class="user-avatar">${currentUser.avatar_emoji || '📖'}</span>
                      <span class="user-name">${currentUser.username}</span>`;
  } else {
    bar.classList.add('hidden');
    document.body.classList.remove('has-user-bar');
    info.innerHTML = '';
  }
}

// ── SHOW AUTH SCREEN ──
function showAuth(tab = 'login') {
  audioEngine.sfx('whoosh');
  showScreen('auth-screen');
  switchAuthTab(tab);
}

function switchAuthTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('login-error').textContent = '';
  document.getElementById('register-error').textContent = '';
}

function selectAvatar(el, emoji) {
  document.querySelectorAll('.avatar-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  selectedAvatar = emoji;
}

// ── LOGIN ──
async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.textContent = '';

  if (!username || !password) { errEl.textContent = 'Please fill in all fields.'; return; }

  const btn = document.querySelector('#login-form .auth-submit');
  const btnText = btn.querySelector('.auth-btn-text') || btn;
  btnText.textContent = 'Entering…'; btn.disabled = true;

  try {
    const res  = await fetch('/api/auth/login', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      updateUserBar();
      audioEngine.startWithUserGesture();
      document.getElementById('music-bar')?.classList.remove('hidden');
      audioEngine.sfx('good');
      await showLib();
    } else {
      errEl.textContent = data.error || 'Login failed.';
    }
  } catch (e) {
    errEl.textContent = 'Connection error. Try again.';
  } finally {
    (btn.querySelector('.auth-btn-text')||btn).textContent = 'Open the Gates'; btn.disabled = false;
  }
}

// ── REGISTER ──
async function doRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('register-error');
  errEl.textContent = '';

  if (!username || !email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }

  const btn = document.querySelector('#register-form .auth-submit');
  const btnText = btn.querySelector('.auth-btn-text') || btn;
  btnText.textContent = 'Creating…'; btn.disabled = true;

  try {
    const res  = await fetch('/api/auth/register', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, avatar_emoji: selectedAvatar })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      updateUserBar();
      audioEngine.startWithUserGesture();
      document.getElementById('music-bar')?.classList.remove('hidden');
      audioEngine.sfx('good');
      await showLib();
    } else {
      errEl.textContent = data.error || 'Registration failed.';
    }
  } catch (e) {
    errEl.textContent = 'Connection error. Try again.';
  } finally {
    (btn.querySelector('.auth-btn-text')||btn).textContent = 'Create My Chronicle'; btn.disabled = false;
  }
}

// ── LOGOUT ──
async function authLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch(e) {}
  currentUser = null;
  updateUserBar();
  audioEngine.sfx('whoosh');
  goHome();
}

// ── SHOW PROFILE ──
async function showProfile() {
  if (!currentUser) { showAuth('login'); return; }
  audioEngine.sfx('page');
  showScreen('profile-screen');

  // Render header
  document.getElementById('profile-header').innerHTML = `
    <div class="profile-avatar">${currentUser.avatar_emoji || '📖'}</div>
    <div class="profile-info">
      <h2 class="profile-username">${currentUser.username}</h2>
      <div class="profile-email">${currentUser.email}</div>
      <div class="profile-member">Member of the Grand Archive</div>
    </div>`;

  // Load stats + history in parallel
  try {
    const [statsRes, histRes] = await Promise.all([
      fetch('/api/auth/stats', { credentials: 'include' }),
      fetch('/api/auth/history', { credentials: 'include' })
    ]);
    const statsData = await statsRes.json();
    const histData  = await histRes.json();

    if (statsData.success) renderProfileStats(statsData.stats);
    if (histData.success)  renderHistory(histData.history);
  } catch(e) {
    document.getElementById('profile-history').innerHTML =
      '<p style="color:var(--parch3);padding:1rem">Could not load history.</p>';
  }
}

function renderProfileStats(stats) {
  const endingCounts = {};
  (stats.endings_by_type || []).forEach(r => endingCounts[r.ending_type] = r.count);

  document.getElementById('profile-stats-row').innerHTML = `
    <div class="pstat-card">
      <div class="pstat-val">${stats.total_reads}</div>
      <div class="pstat-label">Stories Read</div>
    </div>
    <div class="pstat-card">
      <div class="pstat-val">${stats.completed}</div>
      <div class="pstat-label">Completed</div>
    </div>
    <div class="pstat-card">
      <div class="pstat-val">${endingCounts.good || 0}</div>
      <div class="pstat-label">🏆 Good Endings</div>
    </div>
    <div class="pstat-card">
      <div class="pstat-val">${endingCounts.secret || 0}</div>
      <div class="pstat-label">🌑 Secrets Found</div>
    </div>
    <div class="pstat-card">
      <div class="pstat-val">${endingCounts.bad || 0}</div>
      <div class="pstat-label">💀 Dark Endings</div>
    </div>
    <div class="pstat-card">
      <div class="pstat-val">${stats.favourite_story ? stats.favourite_story.times + '×' : '—'}</div>
      <div class="pstat-label">Fav: ${stats.favourite_story ? stats.favourite_story.story_title : 'None yet'}</div>
    </div>`;
}

function renderHistory(history) {
  const el = document.getElementById('profile-history');
  if (!history.length) {
    el.innerHTML = `<div class="history-empty">
      <div style="font-size:2.5rem;margin-bottom:.75rem">📖</div>
      <p>Your chronicle is empty. Begin a story to write your legend.</p>
      <button class="ghost-btn" style="margin-top:1rem" onclick="showLib()">Browse Stories</button>
    </div>`;
    return;
  }

  const endingEmoji = { good:'🏆', bad:'💀', neutral:'⚖️', secret:'🌑' };
  el.innerHTML = history.map(h => `
    <div class="history-item">
      <div class="history-item-cover" style="background:${h.cover_color||'#1a1a2e'}">
        <span>${h.cover_emoji||'📖'}</span>
      </div>
      <div class="history-item-info">
        <div class="history-item-title">${h.story_title}</div>
        <div class="history-item-meta">
          <span class="genre-pill" style="font-size:.65rem;padding:.15rem .45rem">${h.genre||''}</span>
          ${h.completed
            ? `<span class="history-ending ${h.ending_type}">${endingEmoji[h.ending_type]||'📖'} ${h.ending_type} ending</span>`
            : '<span style="color:var(--parch3);font-size:.8rem">In progress</span>'}
        </div>
        <div class="history-item-stats">
          ${h.choices_made} choices · ${h.scenes_visited} scenes
        </div>
      </div>
      <div class="history-item-date">${formatDate(h.played_at)}</div>
    </div>`).join('');
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

// Save reading progress when user finishes a story
async function saveReadingHistory(storyData) {
  if (!currentUser) return;
  try {
    await fetch('/api/auth/history/add', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storyData)
    });
  } catch(e) {}
}

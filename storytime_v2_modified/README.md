# 🕯️ Storytime v2

Interactive storytelling app with beautiful animated login, 5 branching stories, and user accounts.

## ✅ Quick Start (3 steps)

```bash
# 1. Go into the backend folder
cd storytime_v2/backend

# 2. Install packages (only once)
npm install

# 3. Start the server
npm start
```

Then open your browser → **http://localhost:3001**

That's it. No MySQL, no database setup, no config needed.

---

## 📁 Project Structure

```
storytime_v2/
├── frontend/          ← HTML, CSS, JS (UI)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       ├── auth.js
│       ├── api.js
│       └── ...
└── backend/           ← Node.js + Express server
    ├── server.js
    ├── .env
    ├── db/
    │   ├── connection.js   ← SQLite (no MySQL needed)
    │   ├── init.js         ← Creates tables + seeds stories
    │   └── storytime.db    ← Auto-created on first run
    └── routes/
        ├── auth.js
        ├── stories.js
        └── sessions.js
```

---

## 🔑 Features

- ✨ Animated login/register screen
- 👤 User accounts (register, login, logout)
- 📖 5 fully-branching stories (Horror, Sci-Fi, Fantasy, Mystery, Thriller)
- 💾 SQLite database — auto-created, no setup needed
- 📊 Reading history saved per user
- 🎭 Avatar selection

## ⚙️ Change Port

Edit `backend/.env`:
```
PORT=3001
```

## 🌐 Node.js Version

Requires Node.js **v16 or higher**. Check with: `node --version`

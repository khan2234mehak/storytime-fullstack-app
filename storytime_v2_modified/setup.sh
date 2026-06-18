#!/bin/bash
echo ""
echo "🕯️  STORYTIME v2 — Setup"
echo "═══════════════════════════"
echo ""

cd "$(dirname "$0")/backend"

echo "📦 Installing packages..."
npm install

echo ""
echo "✅ Done! Start the server with:"
echo ""
echo "   cd backend && npm start"
echo ""
echo "Then open:  http://localhost:3001"
echo ""

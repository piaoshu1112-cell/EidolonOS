#!/bin/bash
# EidolonOS — Start all services
# Usage: bash scripts/start-services.sh

set -e

echo "⟢ Starting EidolonOS services..."

# 1. Main Next.js app (port 3000) — should already be running via bun run dev
if ! curl -s http://localhost:3000/api/dashboard > /dev/null 2>&1; then
  echo "  ⚠ Next.js app not running on :3000. Start it with: bun run dev"
else
  echo "  ✓ Next.js app running on :3000"
fi

# 2. Telegram Bot (port 3003)
if ! curl -s http://localhost:3003/health > /dev/null 2>&1; then
  echo "  → Starting TG Bot..."
  cd /home/z/my-project/mini-services/telegram-bot
  nohup bun run dev > /tmp/tg-bot.log 2>&1 &
  echo $! > /tmp/tg-bot.pid
  sleep 4
  if curl -s http://localhost:3003/health > /dev/null 2>&1; then
    echo "  ✓ TG Bot running on :3003 (PID: $(cat /tmp/tg-bot.pid))"
  else
    echo "  ✗ TG Bot failed to start. Check /tmp/tg-bot.log"
  fi
  cd /home/z/my-project
else
  echo "  ✓ TG Bot already running on :3003"
fi

echo ""
echo "⟢ EidolonOS services status:"
echo "   Web App:  http://localhost:3000"
echo "   Console:  http://localhost:3000/console"
echo "   TG Bot:   @EidolonOS_Bot (health: http://localhost:3003/health)"
echo ""
echo "   Production: https://eidolonos.xyz"

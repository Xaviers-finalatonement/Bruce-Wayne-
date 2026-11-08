#!/usr/bin/env bash
# Render several episodes one after another, detached from any agent session.
# Usage: setsid nohup bash engine/render_queue.sh <logdir> <episodeDir>... &
# Renders are chunked and resumable (see render.js), so re-running the queue continues where it stopped.
set -u
LOG="$1"; shift; mkdir -p "$LOG"
export RENDER_WORKERS="${RENDER_WORKERS:-3}"
for EP in "$@"; do
  name=$(basename "$EP")
  echo "$(date -u +%FT%TZ) start $EP" >> "$LOG/queue.log"
  if bash "$(dirname "$0")/run.sh" "$EP" > "$LOG/$name.log" 2>&1; then
    echo "$(date -u +%FT%TZ) done  $EP" >> "$LOG/queue.log"
  else
    echo "$(date -u +%FT%TZ) FAIL  $EP (see $name.log)" >> "$LOG/queue.log"
  fi
done
echo "$(date -u +%FT%TZ) queue finished" >> "$LOG/queue.log"

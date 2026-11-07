#!/usr/bin/env bash
set -euo pipefail
EP="${1:?usage: run.sh <episode_dir>}"; D="$(cd "$(dirname "$0")" && pwd)"
if [ -z "${STUDIO_PY:-}" ]; then
  V="$HOME/.cache/studio/venv"
  [ -x "$V/bin/python" ] || { python3 -m venv "$V"; "$V/bin/pip" install -q -r "$D/requirements.txt" pillow; }
  STUDIO_PY="$V/bin/python"
fi
"$STUDIO_PY" "$D/tts.py" "$EP"
node "$D/render.js" "$EP" --cues
"$STUDIO_PY" "$D/sound.py" "$EP"
node "$D/render.js" "$EP" --cover
node "$D/render.js" "$EP"
"$STUDIO_PY" "$D/measure.py" "$EP"

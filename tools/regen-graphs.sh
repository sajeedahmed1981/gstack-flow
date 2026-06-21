#!/usr/bin/env bash
# Regenerate code dependency graphs with Madge + Graphviz.
# Copy to your repo (e.g. recall/graphs/regen.sh) and EDIT the paths below.
#
# Requires: bun add -g madge   &&   brew install graphviz   (or your OS equivalent)
set -e
export PATH="$HOME/.bun/bin:/opt/homebrew/bin:$PATH"

OUT="recall/graphs"
mkdir -p "$OUT"

# --- EDIT THESE for your project layout ---
BACKEND_DIR="src"                       # set to "" to skip
FRONTEND_DIRS="app components lib"       # space-separated; relative to FRONTEND_ROOT
FRONTEND_ROOT="frontend"                 # set to "" if you have no frontend
# ------------------------------------------

if [ -n "$BACKEND_DIR" ] && [ -d "$BACKEND_DIR" ]; then
  echo "Backend ($BACKEND_DIR)…"
  madge --image "$OUT/backend-deps.svg" "$BACKEND_DIR"
  madge --circular "$BACKEND_DIR" || true
fi

if [ -n "$FRONTEND_ROOT" ] && [ -d "$FRONTEND_ROOT" ]; then
  echo "Frontend ($FRONTEND_ROOT)…"
  ( cd "$FRONTEND_ROOT" && \
    madge --image "../$OUT/frontend-deps.svg" --extensions ts,tsx,js,jsx \
      ${FRONTEND_ROOT:+--ts-config tsconfig.json} $FRONTEND_DIRS && \
    madge --circular --extensions ts,tsx,js,jsx --ts-config tsconfig.json $FRONTEND_DIRS || true )
fi

echo "Done → $OUT/*.svg"

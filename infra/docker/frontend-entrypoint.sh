#!/bin/sh
set -eu

cd /app

# The node_modules volume hides dependencies installed at image build time.
if [ ! -x node_modules/.bin/vite ]; then
  npm ci
fi

exec npm run dev -- --host 0.0.0.0 --port 5173

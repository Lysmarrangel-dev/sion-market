#!/usr/bin/env bash
# Vercel build for sionmarket.com: the static website at / and the customer app (Expo web) at /app.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
for f in *; do
  case "$f" in dist | build.sh | vercel.json | README.md) ;; *) cp -r "$f" dist/ ;; esac
done
cd ../apps/cliente
EXPO_BASE_URL=/app npx expo export --platform web --output-dir ../../sionmarket-web/dist/app

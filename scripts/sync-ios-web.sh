#!/usr/bin/env bash
# Copies the web app (web/) into the iPhone app (ios/MimiChecklist.swiftpm/Web), which bundles it.
# Run after changing anything in web/.   Check only (no changes, exit 1 if out of date):  --check
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/web/"
dst="$root/ios/MimiChecklist.swiftpm/Web/"

if [[ "${1:-}" == "--check" ]]; then
  if diff -rq -x README.md -x .DS_Store "$src" "$dst" >/dev/null 2>&1; then
    echo "iPhone app web files are up to date."
  else
    echo "iPhone app web files are out of date. Run scripts/sync-ios-web.sh" >&2
    diff -rq -x README.md -x .DS_Store "$src" "$dst" >&2 || true
    exit 1
  fi
  exit 0
fi

# Replace the copy, leaving out README.md (for the repository, not the app).
rm -rf "$dst"
mkdir -p "$dst"
cp -R "$src". "$dst"
rm -f "$dst/README.md"
find "$dst" -name .DS_Store -delete
echo "Copied web/ into ios/MimiChecklist.swiftpm/Web"

#!/bin/bash
# Miniatury do udostępnień (og:image 1200×630, JPG < 200 KB, bo WhatsApp nie pokazuje większych).
# Użycie: bash docs/og/zrob.sh   → docs/og/<strona>.jpg
set -e
cd "$(dirname "$0")"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for s in ${ZESTAW:-sprawdz instrukcja kreator instalator program-modulu regulamin prywatnosc}; do
  P=$(mktemp -d)
  "$CH" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$P" --allow-file-access-from-files \
    --force-device-scale-factor=1 --virtual-time-budget=3000 --window-size=1200,630 \
    --screenshot="$PWD/$s.png" "file://$PWD/og.html?s=$s" >/dev/null 2>&1
  rm -rf "$P"
  ffmpeg -hide_banner -loglevel error -y -i "$s.png" -q:v 3 "$s.jpg" && rm "$s.png"
  echo "$s.jpg $(( $(stat -f%z "$s.jpg") / 1024 )) KB"
done

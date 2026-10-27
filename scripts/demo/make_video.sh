#!/usr/bin/env bash
# Encodes the Playwright recording into the final demo video (H.264 MP4, trimmed to the demo).
# Usage: scripts/demo/make_video.sh <rec-dir> <out.mp4>
set -euo pipefail
rec=$1 out=$2
read -r start end < <(python3 -c "import json;m=json.load(open('$rec/marks.json'));print(m['start'],m['end'])")
ffmpeg -y -nostdin -loglevel error -ss "$start" -to "$end" -i "$rec/raw.webm" \
  -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -r 30 -movflags +faststart -an "$out"
ls -lh "$out"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$out"

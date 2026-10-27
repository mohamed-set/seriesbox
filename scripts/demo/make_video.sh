#!/usr/bin/env bash
# Encodes the Playwright recording into the final demo video (H.264 MP4, starting at the intro card).
# Playwright's video timeline drifts from wall-clock time, so the end is taken from the video itself and the
# result is sped up slightly if needed to stay within MAX_SECONDS (the assignment allows 5 minutes).
# Usage: scripts/demo/make_video.sh <rec-dir> <out.mp4>
set -euo pipefail
rec=$1 out=$2 max=${MAX_SECONDS:-295}
start=$(python3 -c "import json;print(json.load(open('$rec/marks.json'))['start'])")
tmp="$rec/trimmed.mp4"
ffmpeg -y -nostdin -loglevel error -ss "$start" -i "$rec/raw.webm" -an -c:v libx264 -preset ultrafast -crf 14 -r 30 "$tmp"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$tmp")
speed=$(python3 -c "print(max(1.0, $dur / $max))")
echo "recording: ${dur}s, speed x$speed"
ffmpeg -y -nostdin -loglevel error -i "$tmp" -vf "setpts=PTS/$speed" -r 30 \
  -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -an "$out"
rm "$tmp"
ls -lh "$out"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$out"

# `Videos/` — clip files and the `clipNx.mp4` naming

Each review clip lives in its own folder under `Videos/<dataset>/<clip_id>/`, with a
`frames.json` manifest and one or more `.mp4` files. The player (`app.js`) plays the
mp4 named by the manifest's `media_url` via a native `<video>` element.

## What the filenames mean

| File | What it is |
|------|-----------|
| `clip.mp4` | The **original** encode. One frame per sampled instant, at the source sampling rate. For a low-`sampling_fps` clip this can be very long to watch in real time (e.g. 0.1 fps → each frame is held ~10 s). |
| `clipNx.mp4` | The **same frames sped up N×** and re-encoded at ~1 fps, so it is quick to review. Examples: `clip2x.mp4`, `clip5x.mp4`, `clip10x.mp4`. |

**`N` is the speed-up factor, `N = 1 / sampling_fps`:**

| Source `sampling_fps` | 1 frame every… | Fast file | Speed-up |
|-----------------------|----------------|-----------|----------|
| 1.0   | 1 s  | *(none — `clip.mp4` is already ~1 fps)* | 1× |
| 0.5   | 2 s  | `clip2x.mp4`  | 2× |
| 0.2   | 5 s  | `clip5x.mp4`  | 5× |
| 0.1   | 10 s | `clip10x.mp4` | 10× |

So **`clip10x.mp4` = the clip played 10× faster than the raw 0.1‑fps source** (video120:
106 frames encoded at 1 fps → a 106‑second video that covers 1060 s of surgery).

Clips that were already sampled at ~1 fps (the cholect50 `..._1_0` folders and the
endoscapes `...__fps1` folder) have **no** `clipNx.mp4` — their `clip.mp4` is served directly.

## The timeline still reads true surgical seconds

Speeding up the file does **not** change the time shown to the reviewer. The scrubber and
time label are in *source* (surgical) seconds, not video seconds. The player derives shown
time from the manifest:

```
shown_seconds = media_start + video_time * (media_fps / native_fps)
```

For a fast clip, `media_fps` is scaled by the speed-up so the mapping stays correct:

| Clip | video length | `media_fps` | `native_fps` | timeline shown |
|------|-------------|-------------|--------------|----------------|
| `clip.mp4` (video1, 1 fps)      | 153 s | 1  | 1 | 0–153 s |
| `clip2x.mp4` (VID02, 0.5 fps)   | 121 s | ≈2 (1.99) | 1 | 0–241 s |
| `clip5x.mp4` (video201, 0.2 fps)| 97 s  | 5  | 1 | 0–485 s |
| `clip10x.mp4` (video120, 0.1 fps)| 106 s | 10 | 1 | 0–1060 s |

So an answer that references, say, `t = 900 s` seeks to video-second 90 of `clip10x.mp4`,
and the label still shows `900.0 s`. The player's speed buttons (0.5× / 1× / 2× / 4×,
default 1×) are ordinary playback multipliers on top of the already-sped file.

## Relevant `frames.json` fields

| Field | Meaning |
|-------|---------|
| `media_url` | Which mp4 to play (the `clipNx.mp4` when one exists, else `clip.mp4`). |
| `media_fps` | Source seconds per video second; scaled by the speed-up for a fast clip. |
| `native_fps` | Reference rate for the mapping (normally `1`). |
| `duration_seconds` | Real surgical duration of the clip (the timeline max). |
| `sampling_fps` | How the source was sampled; recorded for provenance. **Not** read by the player anymore — it's what determines `N` for the `clipNx` name. |

## Regenerating a fast clip

A `clipNx.mp4` is produced from `clip.mp4` with ffmpeg (`N = 1 / sampling_fps`):

```sh
# example for 0.1-fps source -> 10x
ffmpeg -y -i clip.mp4 \
  -vf "setpts=PTS/10,fps=1,format=yuv420p" -r 1 \
  -c:v libx264 -preset slow -crf 20 -movflags +faststart \
  clip10x.mp4
```

Then in `frames.json` set `media_url` to the new file and multiply `media_fps` by `N`
(and set `sampling_fps` to `1`, since the served file is now effectively 1 fps) so the
timeline keeps reading true surgical seconds. The original `clip.mp4` is kept alongside.

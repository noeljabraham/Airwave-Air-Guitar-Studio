# Airwave — Air Guitar Studio

Airwave turns your webcam into a musical instrument. Pinch your thumb and index finger on both hands, pull your hands apart, and release to leave a virtual guitar string in the air. Create several strings with different pitches, pluck them with your fingertip, or switch to piano and marimba.

Python handles hand tracking and gesture recognition. The browser displays the camera overlay, animates vibrating strings, and synthesizes sound.

## Features

- Create strings anywhere on the camera view with a two-hand pinch-and-pull gesture.
- Play multiple strings, including both pitches when a newly drawn string crosses an existing string.
- See thumb and index fingertip markers and fading string vibrations.
- Switch between guitar, piano, and marimba.
- Play with webcam gestures, mouse or touch, note buttons, and keyboard shortcuts.
- Reset strings, pause drawing, adjust volume, and move the piano or marimba playing area.

## Requirements

- Python 3.12
- A webcam and a browser with camera permission
- Speakers or headphones
- Internet access during dependency installation
- Node.js for the optional JavaScript tests

Development and simulated browser checks were performed on macOS with Brave. Camera accuracy depends on lighting, hand visibility, and camera position.

## Setup and run

Download or clone this repository, then open a terminal in its folder.

### macOS and Linux

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python studio.py
```

### Windows PowerShell

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe studio.py
```

Open [the local studio](http://127.0.0.1:8011), click **Enable camera**, and allow camera access. Keep the terminal running while you play. Press `Ctrl+C` in that terminal to stop the server.

If you use uv, setup is also available through these commands.

```sh
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python studio.py
```

## How to play

### Guitar

1. Show both hands to the camera.
2. Touch your left thumb to your left index finger and your right thumb to your right index finger.
3. Hold both pinches for at least a quarter-second, then pull your hands clearly apart. Small movements are filtered out.
4. Open either pinch to place the string at its current position.
5. Repeat to add more strings. Sweep an index fingertip across a placed string to pluck it.

Longer strings generally have lower pitches. Each string receives a distinct pitch. Crossing an existing string while drawing plays both notes together.

Choose **Pause drawing** to focus on playing, and **Add string** to enable drawing again. **Reset strings** clears the guitar. Strings remain when switching instruments and reset when the page reloads.

For mouse or touch input, drag across the surface while drawing is enabled to place a string. Pause drawing and drag across existing strings to pluck them.

### Piano and marimba

Start with your index fingertip above a key or bar, lower it past the top edge, then lift it above the playing area before the next strike. Adjust **Playing height** to a comfortable reach.

### Other controls

| Control | Action |
| --- | --- |
| A S D F G H J K | Play the first eight strings or instrument notes |
| Note buttons | Play an individual note |
| Output volume | Adjust sound volume |
| Stop camera | Release the webcam |

## How it works

The browser captures camera frames and sends them over a local WebSocket connection to the Python server. OpenCV decodes the images, MediaPipe locates hand landmarks, and the gesture recognizer checks pinches, outward movement, and release. The server returns landmarks and placement events to the browser.

The browser draws the mirrored camera overlay and generates instrument sounds with the Web Audio API. Processing runs on your computer. The server listens on `127.0.0.1`, and the application processes camera frames in memory.

| File | Purpose |
| --- | --- |
| `studio.py` | Local web server and MediaPipe tracking |
| `gesture.py` | Two-hand string creation logic |
| `app.mjs` | Camera controls, audio, rendering, and interaction |
| `instrument.mjs` | Notes, string intersections, tuning, and vibration |
| `index.html`, `style.css` | Studio interface |
| `requirements.txt` | Python dependencies |

## Troubleshooting

- **Camera blocked** — allow Camera in your browser's site controls. On macOS, also enable your browser under System Settings → Privacy & Security → Camera.
- **Camera unavailable** — check that the webcam is connected and close other applications using it.
- **Tracker disconnected** — run `studio.py` and open the studio on port `8011`.
- **Accidental or missed gestures** — keep both hands fully visible in good light. Hold both pinches briefly and make a clear outward pull. Use Pause drawing while playing.
- **No sound** — raise Output volume, check the browser tab and system volume, and click a note button.

The Python server must run locally for webcam tracking. GitHub Pages alone cannot run the Python tracker. Sounds are synthesized approximations of the instruments. Live tracking still needs calibration and testing across cameras and lighting conditions.

## Tests

```sh
.venv/bin/python -m unittest test_gesture
node --test instrument.test.mjs
```

On Windows, use `.venv\Scripts\python.exe` for the Python command.

The tests cover pinch-and-pull recognition, accidental touches, interrupted tracking, repeated placement, note mapping, intersections, and vibration calculations.

# midi2neurorave

Convert a **MIDI file** into **NeuroRAVE (Strudel) code**.

This is the *accurate* path: a MIDI file already contains the exact notes,
timing and instrument of each part, so the conversion is a direct 1:1
translation — no machine learning, no guessing. (Audio files can't do this;
only MIDI carries the note data.)

## Usage

No dependencies — just Node 18+:

```bash
# print the NeuroRAVE code for a MIDI file
node tools/midi2neurorave/midi2neurorave.mjs song.mid

# or save it to a file
node tools/midi2neurorave/midi2neurorave.mjs song.mid song.js

# try the built-in demo (no file needed)
node tools/midi2neurorave/midi2neurorave.mjs --demo
```

Then paste the output into the NeuroRAVE editor (or drop the `.js` into the
[songs collection repo](https://github.com/k4ran909/neurorave-songs-collection)).

## What it does

- Reads tempo → `setcps(bpm/60/4)` (1 cycle = 1 bar of 4/4)
- Each MIDI track → a `$:` layer
- Drum track (MIDI channel 10) → `s("bd ~ sd ~, hh*…")` using GM percussion mapping
- Melodic tracks → `note("…").s("gm_…")`, instrument chosen from the track's
  General-MIDI program
- Notes are quantized to a 16th-note grid; chords render as `[c4,e4,g4]`,
  sustains as `_`, rests as `~`

## Accuracy notes

- **Notes, octaves, timing and tempo are accurate** (to the 16th-note grid).
- The **instrument** is best-effort: NeuroRAVE has a fixed sound palette, so
  each part maps to the nearest General-MIDI soundfont (or `sawtooth` for bass).
  Every `.s("…")` in the output is easy to change to any NeuroRAVE sound.
- Very fine timing (swing/triplets) is rounded to the grid. Increase resolution
  by importing `midiToNeurorave(bytes, { stepsPerBeat: 6 })` for triplets.

## Use it from code (also works in the browser)

```js
import { midiToNeurorave } from './midi2neurorave.mjs';
const { code, info } = midiToNeurorave(uint8ArrayOfMidiFile);
```

The core has no Node dependencies, so the same function can power an
"upload a MIDI → get code" button on the website later.

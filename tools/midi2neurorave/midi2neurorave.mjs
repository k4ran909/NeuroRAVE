/*
midi2neurorave - convert a Standard MIDI File into NeuroRAVE (Strudel) code.

This is the "accurate" path: a MIDI file already contains the exact notes,
timing and instrument of each part, so the conversion is a direct translation
(no ML, no guessing). Audio files can't do this - only MIDI.

The core `midiToNeurorave(bytes)` has no dependencies and runs in the browser
too (pass a Uint8Array); the CLI at the bottom only loads node:fs when run
directly with `node midi2neurorave.mjs song.mid`.

NeuroRAVE conventions used:
- C4 = MIDI 60 (matches noteToMidi in @strudel/core)
- one bar = one cycle, so setcps(bpm/60/4) makes 1 cycle == 1 bar of 4/4
- timing is quantized to a step grid (16th notes by default)
*/

const NOTE_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

function midiToName(m) {
  const octave = Math.floor(m / 12) - 1; // 60 -> c4
  return NOTE_NAMES[m % 12] + octave;
}

// General MIDI percussion note -> NeuroRAVE drum-machine sound name
const DRUM_MAP = {
  35: 'bd', 36: 'bd', 37: 'rim', 38: 'sd', 39: 'cp', 40: 'sd',
  41: 'lt', 42: 'hh', 43: 'lt', 44: 'hh', 45: 'mt', 46: 'oh',
  47: 'mt', 48: 'ht', 49: 'cr', 50: 'ht', 51: 'rd', 52: 'cr',
  53: 'rd', 54: 'perc', 55: 'cr', 56: 'cb', 57: 'cr', 59: 'rd',
};
const drumName = (pitch) => DRUM_MAP[pitch] || 'perc';

// General MIDI program (0-127) -> a NeuroRAVE sound. Notes/timing are always
// accurate; the instrument is best-effort and easy to swap in the output.
function gmSound(prog) {
  if (prog <= 3 || prog === 7) return 'gm_piano';
  if (prog === 4) return 'gm_epiano1';
  if (prog === 5) return 'gm_epiano2';
  if (prog === 6) return 'gm_harpsichord';
  if (prog === 8) return 'gm_celesta';
  if (prog === 9) return 'gm_glockenspiel';
  if (prog === 10) return 'gm_music_box';
  if (prog === 11) return 'gm_vibraphone';
  if (prog === 12) return 'gm_marimba';
  if (prog === 13) return 'gm_xylophone';
  if (prog === 14) return 'gm_tubular_bells';
  if (prog === 15) return 'gm_dulcimer';
  if (prog >= 16 && prog <= 23) return 'gm_drawbar_organ';
  if (prog >= 32 && prog <= 39) return 'sawtooth'; // bass family -> synth bass
  return 'gm_piano'; // strings/brass/lead/etc -> safe default, change as you like
}

// ---------------------------------------------------------------------------
// MIDI parsing
// ---------------------------------------------------------------------------
function parseMidi(bytes) {
  let pos = 0;
  const u16 = () => ((bytes[pos++] << 8) | bytes[pos++]) >>> 0;
  const u32 = () => ((bytes[pos++] << 24) | (bytes[pos++] << 16) | (bytes[pos++] << 8) | bytes[pos++]) >>> 0;
  const tag = () => String.fromCharCode(bytes[pos++], bytes[pos++], bytes[pos++], bytes[pos++]);
  const vlq = () => {
    let v = 0, b;
    do {
      b = bytes[pos++];
      v = (v << 7) | (b & 0x7f);
    } while (b & 0x80);
    return v;
  };

  if (tag() !== 'MThd') throw new Error('Not a MIDI file (missing MThd header).');
  const headerLen = u32();
  u16(); // format
  const ntracks = u16();
  const division = u16();
  pos += headerLen - 6;
  const ppq = division & 0x8000 ? 480 : division; // SMPTE fallback

  const tracks = [];
  const tempos = [];
  let timeSig = { num: 4, den: 4 };

  for (let t = 0; t < ntracks && pos < bytes.length; t++) {
    if (tag() !== 'MTrk') break;
    const len = u32();
    const end = pos + len;
    let tick = 0;
    let running = 0;
    const active = {};
    const notes = [];
    const programs = {};
    let name = '';

    while (pos < end) {
      tick += vlq();
      let status = bytes[pos];
      if (status & 0x80) {
        pos++;
        if (status < 0xf0) running = status;
      } else {
        status = running;
      }
      const type = status & 0xf0;
      const chan = status & 0x0f;

      if (status === 0xff) {
        const metaType = bytes[pos++];
        const mlen = vlq();
        const data = bytes.slice(pos, pos + mlen);
        pos += mlen;
        if (metaType === 0x51 && mlen === 3) {
          const us = (data[0] << 16) | (data[1] << 8) | data[2];
          tempos.push({ tick, bpm: 60000000 / us });
        } else if (metaType === 0x58 && mlen >= 2) {
          timeSig = { num: data[0], den: 2 ** data[1] };
        } else if (metaType === 0x03) {
          name = String.fromCharCode(...data);
        }
      } else if (status === 0xf0 || status === 0xf7) {
        pos += vlq();
      } else if (type === 0x90) {
        const pitch = bytes[pos++];
        const vel = bytes[pos++];
        if (vel > 0) {
          active[`${chan}:${pitch}`] = { tick, vel };
        } else {
          const k = `${chan}:${pitch}`;
          if (active[k]) {
            notes.push({ chan, pitch, start: active[k].tick, dur: tick - active[k].tick, vel: active[k].vel });
            delete active[k];
          }
        }
      } else if (type === 0x80) {
        const pitch = bytes[pos++];
        pos++; // velocity
        const k = `${chan}:${pitch}`;
        if (active[k]) {
          notes.push({ chan, pitch, start: active[k].tick, dur: tick - active[k].tick, vel: active[k].vel });
          delete active[k];
        }
      } else if (type === 0xc0) {
        programs[chan] = bytes[pos++];
      } else if (type === 0xd0) {
        pos += 1;
      } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
        pos += 2;
      } else {
        pos += 1;
      }
    }
    pos = end;
    if (notes.length) tracks.push({ notes, programs, name });
  }

  const bpm = tempos.length ? tempos[0].bpm : 120;
  return { ppq, bpm, timeSig, tracks };
}

// ---------------------------------------------------------------------------
// MIDI -> NeuroRAVE code
// ---------------------------------------------------------------------------
function trackToMini(notes, ppq, timeSig, isDrum, opts) {
  const beatsPerBar = timeSig.num * (4 / timeSig.den);
  const steps = Math.max(1, Math.round(beatsPerBar * opts.stepsPerBeat));
  const ticksPerStep = (ppq * beatsPerBar) / steps;

  const startStepOf = (tick) => Math.round(tick / ticksPerStep);
  let lastStep = 0;
  for (const n of notes) lastStep = Math.max(lastStep, startStepOf(n.start));
  let totalBars = Math.floor(lastStep / steps) + 1;
  const truncated = totalBars > opts.maxBars;
  totalBars = Math.min(totalBars, opts.maxBars);

  // slot[globalStep] = array of token strings starting there; held = Set of steps
  const slots = Array.from({ length: totalBars * steps }, () => []);
  const held = new Set();

  for (const n of notes) {
    const s = startStepOf(n.start);
    if (s >= totalBars * steps) continue;
    const token = isDrum ? drumName(n.pitch) : midiToName(n.pitch);
    slots[s].push(token);
    if (!isDrum) {
      const durSteps = Math.max(1, Math.round(n.dur / ticksPerStep));
      const barEnd = (Math.floor(s / steps) + 1) * steps; // don't carry holds over barlines
      const heldEnd = Math.min(s + durSteps, barEnd);
      for (let h = s + 1; h < heldEnd; h++) held.add(h);
    }
  }

  const renderSlot = (i) => {
    const starts = slots[i];
    if (starts.length === 0) return held.has(i) && i % steps !== 0 ? '_' : '~';
    if (starts.length === 1) return starts[0];
    return `[${[...new Set(starts)].join(',')}]`;
  };

  const bars = [];
  for (let b = 0; b < totalBars; b++) {
    const tokens = [];
    for (let i = 0; i < steps; i++) tokens.push(renderSlot(b * steps + i));
    bars.push(tokens.join(' '));
  }

  const body = bars.length === 1 ? bars[0] : `<${bars.map((b) => `[${b}]`).join(' ')}>`;
  return { mini: body, bars: bars.length, truncated };
}

export function midiToNeurorave(bytes, options = {}) {
  const opts = { stepsPerBeat: 4, maxBars: 64, ...options };
  const midi = parseMidi(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  if (!midi.tracks.length) throw new Error('No notes found in this MIDI file.');

  const cps = midi.bpm / 60 / 4;
  const lines = [`setcps(${(Math.round(cps * 10000) / 10000)}) // ~${Math.round(midi.bpm)} bpm`, ''];
  const summary = [];

  midi.tracks.forEach((track, idx) => {
    const channel = track.notes[0].chan;
    const isDrum = track.notes.some((n) => n.chan === 9);
    const program = track.programs[channel] ?? 0;
    const { mini, bars, truncated } = trackToMini(track.notes, midi.ppq, midi.timeSig, isDrum, opts);
    const label = track.name || (isDrum ? 'drums' : `track ${idx + 1}`);
    if (isDrum) {
      lines.push(`$: s("${mini}") // ${label}`);
    } else {
      lines.push(`$: note("${mini}").s("${gmSound(program)}") // ${label}`);
    }
    summary.push(`  - ${label}: ${track.notes.length} notes, ${bars} bars${truncated ? ' (truncated)' : ''}`);
  });

  const code = lines.join('\n') + '\n';
  const info =
    `MIDI: ${Math.round(midi.bpm)} bpm, ${midi.timeSig.num}/${midi.timeSig.den}, ${midi.tracks.length} parts\n` +
    summary.join('\n');
  return { code, info };
}

// ---------------------------------------------------------------------------
// demo / self-test MIDI (format 0: tempo 120 + a little C-E-G-C melody)
// ---------------------------------------------------------------------------
export function demoMidi() {
  const bytes = [];
  const push = (...b) => bytes.push(...b);
  const writeVLQ = (v) => {
    const buf = [v & 0x7f];
    v >>= 7;
    while (v > 0) {
      buf.unshift((v & 0x7f) | 0x80);
      v >>= 7;
    }
    push(...buf);
  };
  // header
  push(0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96); // MThd, len6, fmt0, 1 track, 96 ppq
  // build track events
  const ev = [];
  const evPush = (...b) => ev.push(...b);
  const evVLQ = (v) => {
    const buf = [v & 0x7f];
    v >>= 7;
    while (v > 0) {
      buf.unshift((v & 0x7f) | 0x80);
      v >>= 7;
    }
    evPush(...buf);
  };
  evVLQ(0); evPush(0xff, 0x51, 0x03, 0x07, 0xa1, 0x20); // tempo 120bpm
  const seq = [60, 64, 67, 72]; // c4 e4 g4 c5, quarter notes (96 ticks)
  seq.forEach((p, i) => {
    evVLQ(i === 0 ? 0 : 0); evPush(0x90, p, 0x64); // note on
    evVLQ(96); evPush(0x80, p, 0x40); // note off after 1 beat
  });
  evVLQ(0); evPush(0xff, 0x2f, 0x00); // end of track
  push(0x4d, 0x54, 0x72, 0x6b); // MTrk
  push((ev.length >> 24) & 0xff, (ev.length >> 16) & 0xff, (ev.length >> 8) & 0xff, ev.length & 0xff);
  push(...ev);
  return new Uint8Array(bytes);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
async function main() {
  const { pathToFileURL } = await import('node:url');
  const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
  if (!isMain) return;

  const arg = process.argv[2];
  if (arg === '--demo' || arg === '--selftest') {
    const { code, info } = midiToNeurorave(demoMidi());
    console.error('--- self-test (built-in demo MIDI) ---\n' + info + '\n');
    console.log(code);
    return;
  }
  if (!arg) {
    console.error('usage: node midi2neurorave.mjs <song.mid> [out.js]');
    console.error('       node midi2neurorave.mjs --demo');
    process.exit(1);
  }
  const fs = await import('node:fs');
  const buf = fs.readFileSync(arg);
  const { code, info } = midiToNeurorave(new Uint8Array(buf));
  console.error(info + '\n');
  if (process.argv[3]) {
    fs.writeFileSync(process.argv[3], code);
    console.error('wrote ' + process.argv[3]);
  } else {
    console.log(code);
  }
}

main();

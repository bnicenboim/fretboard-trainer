# Fretboard Trainer

A guitar fretboard quiz that runs in the browser. Plain HTML, CSS and JavaScript: no build step, no dependencies, no framework. Keep it that way unless the owner asks otherwise.

## Run and check

- Open `index.html` in Chrome or Firefox, or use the Live Server extension. The microphone needs `file://`, `localhost` or HTTPS.
- Syntax check: `node --check js/app.js`
- There is no test suite. For behaviour checks, drive the page with Playwright and call the app's own functions, since a headless browser has no guitar:
  - `onMicNote(midi)` simulates a note the microphone accepted.
  - `G.q` is the open question (`G.q.answers()`, `G.q.midis`, `G.q.midi`, `G.q.answered`).
  - Clicking `.hit[data-s="2"][data-f="5"]` clicks string index 2, fret 5.
  - Set "Answer by" to clicking (`#answerBy` = `click`) before testing click answers; the default is the microphone, and clicks are then only taps.
- The pitch detector (`yin`, `micTick`) has never been tested against real audio in an automated way. Say so when changing it, and ask for a test on a real guitar.

## Files

- `index.html`: structure only. Every control has a unique `id`; `app.js` looks them up with `$('id')`.
- `css/styles.css`: colour tokens on `:root`. The palette, fonts (Inter, IBM Plex Mono) and shapes follow Pyramid Trainer: dark by default, light theme in two blocks (media query and `[data-theme="light"]`). Style through the tokens.
- `js/app.js`: one script, global functions, sections marked `/* ---------- name ---------- */`.
- `VERSION` at the top of `js/app.js` is shown at the bottom of the page. Bump it together with a new entry in `CHANGELOG.md`.
- `README.md`, `LICENSE` (MIT), `favicon.svg`, `docs/screenshot.png` (the screenshot in the README).
- `.nojekyll`: GitHub Pages serves the repository root as is, at https://bruno.nicenboim.me/fretboard-trainer/.
- `.github/workflows/check.yml`: runs the syntax check on every push.

## Hosted site

- `index.html` loads the GoatCounter visit counter (the `fretboard-trainer.goatcounter.com` site). It sets no cookies.
- The footer and the README carry the privacy text. Update both when the page starts storing or sending anything new.

## How the code is organised

- **Settings `S`**: plain object saved to `localStorage` under `fretTrainer.v3`. `DEF` holds defaults. Bump the key version when a default must replace what users already saved. Loaded values are validated right after load.
- **Quiz area `SEL`**: a `Set` of `"string-fret"` keys (string 0 is the high E). `S.sel` is its saved copy; call `syncSel()` after changing `SEL`. Use `inRegion`, `regionPositions`, `isWhole`.
- **Note pool**: `poolNames()` returns spelled names (`"F#"`, `"Bb"`, `"E#"`) from one of three modes: by type, from a scale, or picked notes (`S.custom`). `validPositions()` is the area filtered by the pool.
- **Names**: internal names are ASCII (`#`, `b`). `pretty()` converts to ♯/♭ for display. `pcName(pc)` gives the display name and joins both spellings with `/` when the pool has both. `withOct(name, midi)` adds the octave. Octaves are sounding pitch: open low E is E2 (MIDI 40), middle C is C4.
- **Quiz state `G`**: `G.phase` is one of `idle`, `pickstart`, `countin`, `question`, `reveal`. `G.marks` are the markers drawn on the neck, `G.log` the rows for the CSV, `G.st` the score.
- **Questions**: `mkFind`, `mkName`, `mkNear`, `mkEar` each return a question object with `text`, `sub`, `key`, and the functions `ok(position)`, `okMidi(midi)`, `answers()`, `label(position)`. `newQuestion()` picks one; `finish(right, info)` is the single exit and guards against double calls.
- **Input paths**: `onCell(s, f)` for clicks, `onChoice(name)` for the name buttons, `onMicNote(midi)` for the microphone.
- **Settings changes** go through `changed()`, which saves, stops a running quiz, and redraws.

## Required behaviour (do not regress)

- Playing on the guitar is the default answer method for every quiz.
- The area is chosen by dragging on the neck. The first drag on a whole fretboard replaces the selection; later drags add to it. Clicking a string label adds or removes that string. "Whole fretboard" resets, "Clear" empties.
- 22 frets by default. String labels show the open pitch (E4, B3, G3, D3, A2, E2).
- Clicking a spot outside a click-answer question plays it and shows its name briefly.
- "Show names" has three states: hidden (default), names, names with octave. It labels only the notes in the pool, only inside the area, and never while a question is open.
- After a wrong answer the right spot is outlined on the neck. No "It was F4" text.
- Without the metronome, the pause before the next question comes from the "After an answer" setting, with 1.5 s extra after a wrong answer, or a Next button.
- **Find every**: a wrong note never ends the question; the counter shows "2 of 4". With the microphone nothing is marked on the neck until the end, because the same pitch can sit on two strings; the count is of distinct pitches. With clicks the count is of spots.
- **Nearest note**: the user picks the first starting spot by clicking or playing. Each later question starts from the correct spot of the previous one. The starting pitch is ignored as an answer. Distance is Euclidean in (fret, string); ties all count. Direction (higher/lower) is always stated when the asked note equals the starting note, and otherwise follows the Direction setting.
- The CSV has one row per question, including the settings in force. Add a column when adding a setting or a kind of answer.

## Microphone rules (the fragile part)

A guitar note rings for seconds and the detector's reading can jump an octave as it decays. These guards exist for that; keep them when editing `micTick` and `onMicNote`:

- A note is accepted only when `mic.armed` is true (a new attack or real silence happened) or the new pitch is not octave-related to `mic.last`.
- `newQuestion()` and `pluck()` set `mic.armed = false`, so neither the tail of the last answer nor the app's own sound can answer a question.
- Five stable readings within 40 cents, at least 250 ms between accepted notes.
- In single-answer quizzes a wrong reading waits 350 ms (`q.pendingWrong`) for the right one before counting as wrong.

## Mistakes already made once

- Two elements shared the id `beats`; the select is `beatsSel`. Check new ids for clashes.
- Rows are hidden with the `hidden` attribute; the stylesheet needs `[hidden]{display:none!important}` because several rows are `display:flex`.
- Enter on a focused button also clicks that button. Keyboard shortcuts must `preventDefault` and skip events from inputs and string labels.
- Timers that advance the quiz go in `G.timers` so `clearTimers()` and `stop()` cancel them.



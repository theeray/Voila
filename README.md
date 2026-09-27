# Voilà!

OCR sheet music reader and transposer specifically designed for converting tunes to alto clef for viola and creating harmony and drones to accompany fiddle tunes.

## What works

- Import uncompressed MusicXML (`.musicxml`, `.xml`) or compressed MusicXML (`.mxl`), including PlayScore exports.
- Select a source part, switch between treble and alto clefs without changing pitch, shift octaves, and transpose by semitones.
- Display engraved notation and edit source notes, rests, accidentals, octaves, and durations with undo/redo.
- Generate editable MusicXML arrangements with diatonic thirds/sixths, tonic/fifth drones, and editable chord-symbol suggestions in major, natural minor, Dorian, or Mixolydian.
- Audition parts with synthesized audio, a tempo control, and a mixer.
- Export arrangement, melody, or corrected source as MusicXML; print the visible score or save it as a PDF.
- Experimental in-browser scan of a photo or individual PDF page using Oemer's pretrained notehead segmentation model and custom staff/pitch/rhythm analysis.

## Scanning limits

This is a reviewable draft scanner, **not PlayScore-level OMR**. Use clear, straight, printed single-melody staves. Set the printed clef, key signature, and time signature manually. Rests, local accidentals, ornaments, ties, repeats, key changes, and clef changes are not recognized reliably. The model detects noteheads; the app estimates other structure. Review every measure, or use PlayScore MusicXML for better recognition. No fabricated score is substituted when recognition fails.

PDF pages are handled individually. Handwriting and full piano/orchestral recognition are not supported. The 38 MB model loads on first scan; mobile memory and speed vary.

Harmony is a simple diatonic starting point, not an orchestration engine. Choose the correct tonal center/mode, audition, and edit the exported parts in MuseScore if desired. Playback follows basic repeats; complex endings and D.C./D.S. are not implemented. Transposing-instrument sources and multistaff parts require extra checking.

Music is processed on the user's device. No API key, paid recognition service, or server upload is required. Download scores before closing the page: there is no automatic score persistence.

## Run

Requires Node.js 20+.

```sh
npm ci
npm run dev
```

The `predev` / `prebuild` script downloads the official Oemer model and verifies its SHA-256. It stores two local asset chunks to stay within static hosting per-file limits. Model binaries are not committed.

```sh
npm run build
```

Deploy the `dist` folder to static hosting. For a subdirectory (such as GitHub Pages), build with `npm run build -- --base=/Voila/`.

## Attribution

- [Oemer](https://github.com/BreezeWhite/oemer) — notehead segmentation model, MIT; upstream license in `public/models/LICENSE.txt`.
- OpenSheetMusicDisplay / VexFlow — notation display.
- ONNX Runtime Web — on-device inference.
- PDF.js — PDF page rendering.
- fflate — compressed MusicXML import.

Voilà! is independent of PlayScore and MuseScore. Their proprietary recognition technology is not included.

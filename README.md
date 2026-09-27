# Voilà!

OCR sheet music reader and transposer specifically designed for converting tunes to alto clef for viola and creating harmony and drones to accompany fiddle tunes.

## What works

- Import uncompressed MusicXML (`.musicxml`, `.xml`) or compressed MusicXML (`.mxl`), including PlayScore exports.
- Select a source part, switch between treble and alto clefs without changing pitch, shift octaves, and transpose by semitones.
- Display engraved notation and edit source notes, rests, accidentals, octaves, and durations with undo/redo.
- Generate editable MusicXML arrangements with chord-aware smooth harmony or diatonic thirds/sixths. Harmony stays below the melody and within viola range, using rests when no suitable note fits.
- Suggest guitar chords across a whole phrase, using meter, melodic fit, common tones, and cadences. Supports major, natural minor, Dorian, Mixolydian, and editable slash chords. Imported chord changes are preserved unless a measure is explicitly replaced.
- Choose fixed tonic/fifth drones or adaptive drones that avoid prominent semitone/tritone clashes and incompatible chords. Drones use tied beat groups and sustain across ordinary barlines.
- Audition parts with on-device PCM media audio, a tempo control, and a mixer. Chord previews use guitar-range voicings with slash basses; tied notes sustain. The media playback route improves phone compatibility.
- Export arrangement, melody, or corrected source as MusicXML. Landscape Letter printing uses an independent layout with up to four measures per system and line endings at major repeats/section boundaries. Screen zoom is independent of print scale.
- Experimental in-browser scan of a photo or individual PDF page using Oemer's pretrained notehead segmentation model and custom staff/pitch/rhythm analysis. Preprocessing balances lighting and corrects slight tilt (about ±4°). Ambiguous noteheads and inconsistent measure lengths are flagged for review.

## Scanning limits

This is a reviewable draft scanner, **not PlayScore-level OMR**. Use clear, straight, printed single-melody staves. Set the printed clef, key signature, and time signature manually. Rests, local accidentals, ornaments, ties, repeats, key changes, and clef changes are not recognized reliably. The model detects noteheads; the app estimates other structure. Review every measure, or use PlayScore MusicXML for better recognition. No fabricated score is substituted when recognition fails.

PDF pages are handled individually. Handwriting and full piano/orchestral recognition are not supported. The 38 MB model loads on first scan; mobile memory and speed vary.

Accompaniment uses musical heuristics rather than a trained orchestration model. Suggestions are one chord per measure; imported multiple chord changes are retained. Adaptive drones are conservative and may rest for a whole measure. Fixed third/sixth harmony does not resolve every chromatic or contrapuntal case. Choose the correct tonal center/mode, audition, and edit the exported parts in MuseScore if desired. Playback follows basic two-pass repeats and standard first/second ending spans; nested repeats, custom repeat counts, and D.C./D.S. are not implemented. Transposing-instrument sources and multistaff parts require extra checking.

Music is processed on the user's device. No API key, paid recognition service, or server upload is required. Download scores before closing the page: there is no automatic score persistence.

## Run

Requires Node.js 20+.

```sh
npm ci
npm run dev
```

The `predev` / `prebuild` script downloads the official Oemer model and verifies its SHA-256. It stores two local asset chunks to stay within static hosting per-file limits. Model binaries are not committed.

```sh
npm test
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

## Validation

`npm test` covers exact pitch transposition, modal chord choices, preservation of imported chord changes, slash basses, harmony range and chord tones, drone rhythm/ties/clashes, repeat ending spans, PCM audio, print line breaks, and image preprocessing. OCR recognition still needs validation against a broad real-world sheet-music set; the included checks are not an accuracy benchmark.

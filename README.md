# Voilà!

OCR sheet music reader and transposer specifically designed for converting tunes to alto clef for viola and creating harmony and drones to accompany fiddle tunes.

## What works

- Import uncompressed MusicXML (`.musicxml`, `.xml`) or compressed MusicXML (`.mxl`), including PlayScore exports.
- Select a source part, switch between treble and alto clefs without changing pitch, shift octaves, and transpose by semitones.
- Click an engraved note on any staff and use arrow keys to edit it. Up/Down moves by scale step, Alt by semitone, Shift by octave; Left/Right selects nearby notes. Clicking a note auditions its displayed pitch and sets the playback start. Every pitch edit sounds the new note immediately; rests remain silent. Phone-friendly arrow buttons are included. Source rhythm/rest edits, generated pitch edits, and click-to-type titles support undo/redo. Edits use displayed pitches even after transposition.
- Generate editable MusicXML arrangements with chord-aware smooth harmony or diatonic thirds/sixths. Viola harmony sits below the melody; optional fiddle harmony gets a separate treble staff above it. Both can be enabled, with rests where no suitable pitch fits.
- Suggest guitar chords across a whole phrase, using meter, melodic fit, common tones, and cadences. Supports major, natural minor, Dorian, Mixolydian, and editable slash chords. Choose core chords, all triads, or seventh/sixth/suspended colors; change opportunities range from every two bars to every pulse. Imported changes and their timing are preserved; a manual edit replaces only its selected change point.
- Choose fixed tonic/fifth drones or adaptive drones that avoid prominent semitone/tritone clashes and incompatible chords. Moving drones add gentle root/fifth motion, flowing chord tones, or walking passing notes. They follow within-bar chord changes, use tied beat groups, and sustain across ordinary barlines.
- Highlight notes below standard tuning in complementary red and notes above an adjustable comfort guide in Oxbows blue. Select a warning for reversible octave alternatives. Each staff uses its own instrument range; checks follow transposition. High-note guides are configurable (first position, moderate, extended), not physical upper limits or fingering checks.
- Audition parts with on-device PCM media audio, a tempo control, and a mixer. Playback starts at the last selected note, synchronizing all parts and continuing held notes from that point. Use **From beginning** to hear the whole score. Chord previews use guitar-range voicings with slash basses; tied notes sustain. The media playback route improves phone compatibility.
- Export arrangement, melody, or corrected source as MusicXML. Landscape Letter printing uses an independent layout with up to four measures per system and line endings at major repeats/section boundaries. Screen zoom is independent of print scale.
- Experimental in-browser scan of a photo or individual PDF page using Oemer's pretrained notehead segmentation model and custom staff/pitch/rhythm analysis. Preprocessing balances lighting and corrects slight tilt (about ±4°). Ambiguous noteheads and inconsistent measure lengths are flagged for review. Optional context interpretation uses key/mode, confident neighbors, implied chords, and repeated phrases to choose nearby uncertain pitches; every changed reading stays amber and can be restored.

## Scanning limits

This is a reviewable draft scanner, **not PlayScore-level OMR**. Use clear, straight, printed single-melody staves. Set the printed clef, key signature, and time signature manually. Rests, local accidentals, ornaments, ties, repeats, key changes, and clef changes are not recognized reliably. The model detects noteheads; the app estimates other structure. Review every measure, or use PlayScore MusicXML for better recognition. No fabricated score is substituted when recognition fails.

PDF pages are handled individually. Handwriting and full piano/orchestral recognition are not supported. The 38 MB model loads on first scan; mobile memory and speed vary.

Accompaniment uses musical heuristics rather than a trained orchestration model. Chord frequency sets opportunities for changes, not a requirement to change harmony each time; neighboring slots may retain the same chord. Imported chord timing and manual overrides take precedence. Adaptive drones are conservative and may rest for a whole measure. Fixed third/sixth harmony does not resolve every chromatic or contrapuntal case. Choose the correct tonal center/mode, audition, and refine the parts in the workshop or MuseScore. Manual accompaniment pitch edits persist while editing the score but are regenerated when accompaniment settings change. Context correction is conservative and can still guess incorrectly; confident readings are left untouched and no rhythm is invented. Playback follows basic two-pass repeats and standard first/second ending spans; nested repeats, custom repeat counts, and D.C./D.S. are not implemented. Transposing-instrument sources and multistaff parts require extra checking.

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

`npm test` covers exact pitch transposition, modal chord choices, preservation of imported chord changes, slash basses, harmony range and chord tones, drone rhythm/ties/clashes, repeat ending spans, PCM audio, print line breaks, image preprocessing, chord timelines/complexity, moving-drone activity, separate fiddle harmony, tied pitch editing, displayed/source transposition, contextual ambiguity resolution, and instrument-range alternatives. OCR recognition still needs validation against a broad real-world sheet-music set; the included checks are not an accuracy benchmark.

### Oxbows Songbook integration

Send to Songbook opens the linked app and transfers a MusicXML arrangement, its
full original source and editing settings, and a vector landscape PDF. Songbook
ships this same editor locally, so editing and synthesized playback do not need
an authenticated iframe from the private Voilà! site. Imported PDFs open the
experimental scanner. Choose the page, printed clef, key, and meter before scanning.

Transfers use a random nonce and verify both the exact window and origin. Scores
are never put into a URL or sent to a server. If a browser blocks the popup or a
sign-in redirect disconnects it, Export → Download transfer file creates a
`.voila` file that either app can import. Plain MusicXML remains supported.

The thin blue locator follows HTML audio media time, interpolates between
engraved note positions, and returns to the selected note after stopping. Repeat
jumps and playback beginning partway through a measure use the same audio timeline.

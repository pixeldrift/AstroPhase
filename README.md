# AstroPhase

A pass-and-play lunar adventure built with Three.js and Vite.

## Run locally

```bash
npm install
npm run dev
```

## Current prototype

- Adjustable 3D tabletop camera with orbit, pan and zoom controls
- 32-space outer circuit and eight-part lunar phase ring
- Elevated, procedurally textured Moon with directional sunlight, shadowing and glow
- Sun marker placed in the same direction as the scene's key light
- Four colored rocket pieces: Grape, Orange, Lime and Cherry
- Basic pass-and-play turn flow, 1–6 movement roll and question prompts
- Correct answers collect the lunar phase associated with the player's landing space
- Question bank loaded from the tab-delimited `quesrikns.csv` file in the repository root

## Notes

The question file has a historical `.csv` filename but is tab-delimited. Keep its six-column structure:

`Difficulty<TAB>Questions<TAB>A<TAB>B<TAB>C<TAB>Answer`

This is an early visual/gameplay foundation. Rocket-part collection by difficulty, launch/fly-to-HUD animation, persistent game setup, and a proper win flow remain to be designed and play-tested.

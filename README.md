# AstroPhase

A pass-and-play lunar adventure built with Three.js and Vite.

## Run locally

```bash
npm install
npm run dev
```

## Current prototype

- Adjustable 3D tabletop camera with orbit, pan and zoom controls; one top-view shortcut
- 32 individually raised, beveled outer spaces on a terraced annular deck, grouped four per lunar phase
- Eight curved lunar-phase sectors with larger phase medallions and labels
- Textured Moon using the supplied lunar albedo and TIFF displacement maps
- Textured Sun with bright emissive surface and soft Fresnel edge glow
- Moon uses a dedicated directional light on its own Three.js layer, so the Sun illuminates the Moon without becoming the board's key light
- Sun and Moon share the same height; sunlight comes from the Full Moon side so New Moon faces the dark hemisphere, Full Moon faces the lit hemisphere, and the terminator aligns with the quarter phases
- Camera-facing radial halos plus a separate 2-D screen-space haze and restrained lens flare for the Sun and Moon only; no global bloom post-processing
- Shortened outer player-space wedges with player markers and numbering repositioned to match
- Board fill illumination remains independent of the celestial glow and directional light
- Independent hemisphere and fill lighting for the board and player pieces
- Supplied equirectangular star-field background texture
- Four upright colored rocket pieces: Grape, Orange, Lime and Cherry
- Outer track is explicitly grouped into four spaces per lunar phase sector
- Phase medallions use projected-sphere illumination, showing the correct waxing-right / waning-left sequence
- Eight-slot spinner, event deck, pass-and-play questions and phase/component collection

## Art assets

The supplied celestial textures are in `public/textures/`:
- `moon-albedo.jpg` — lunar surface color
- `moon-displacement.tiff` — decoded at runtime to displace the Moon's sphere geometry
- `sun-surface.jpg` — solar surface color
- `rocket-reference.png` — visual reference only

The supplied `IMG_8403.jpeg` star field is installed as `public/textures/starfield.jpg` and used as the scene background without altering its brightness or appearance.

## Future visual direction

- Earth as a distant celestial body, positioned consistently with the Sun/Moon composition
- Further art-direct the celestial-only lens flare intensity after browser play-testing
- Tune the star-field exposure in context only if play-testing shows it needs adjustment

## Question bank

The existing `quesrikns.csv` file is tab-delimited despite its extension. Keep its six-column structure:

`Difficulty<TAB>Questions<TAB>A<TAB>B<TAB>C<TAB>Answer`

## Prototype notes

This is an early gameplay and visual prototype. Rocket components are currently represented as HUD inventory; physical assembly and the lift-off animation that sends phase tokens into the player's HUD remain future work. A browser build and visual check are still required before merging.

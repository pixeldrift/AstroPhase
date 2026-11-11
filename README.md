# AstroPhase

A pass-and-play lunar adventure built with Three.js and Vite.

## Run locally

```bash
npm install
npm run dev
```

## Current prototype

- Adjustable 3D tabletop camera with orbit, pan and zoom controls
- 32-space outer circuit and eight curved lunar-phase sectors
- Textured Moon using the supplied lunar albedo and TIFF displacement maps
- Textured Sun with bright emissive surface and soft Fresnel edge glow
- Moon uses a dedicated directional light on its own Three.js layer, so the Sun illuminates the Moon without becoming the board's key light
- Sun and Moon share the same vertical position, giving the lunar terminator a horizontal light direction (vertical day/night boundary)
- Soft Fresnel halos plus Unreal Bloom post-processing for diffuse celestial glow
- Independent hemisphere and fill lighting for the board and player pieces
- Round, anti-aliased procedural stars (not square point sprites)
- Four upright colored rocket pieces: Grape, Orange, Lime and Cherry
- Eight-slot spinner, event deck, pass-and-play questions and phase/component collection

## Art assets

The supplied celestial textures are in `public/textures/`:
- `moon-albedo.jpg` — lunar surface color
- `moon-displacement.tiff` — decoded at runtime to displace the Moon's sphere geometry
- `sun-surface.jpg` — solar surface color
- `rocket-reference.png` — visual reference only

A separate star-field background image was mentioned for this iteration, but it was not present in the repository root or `public/textures/` when this branch was prepared. The current circular procedural star field remains as a temporary fallback. Once the image is available in the repository, it can be renamed and installed as the background environment.

## Future visual direction

- Earth as a distant celestial body, positioned consistently with the Sun/Moon composition
- Lens flare elements tied to camera visibility and screen-space alignment of the Sun, kept subtle and art-directed
- Replace the procedural star fallback with the supplied star-field image when available

## Question bank

The existing `quesrikns.csv` file is tab-delimited despite its extension. Keep its six-column structure:

`Difficulty<TAB>Questions<TAB>A<TAB>B<TAB>C<TAB>Answer`

## Prototype notes

This is an early gameplay and visual prototype. Rocket components are currently represented as HUD inventory; physical assembly and the lift-off animation that sends phase tokens into the player's HUD remain future work. A browser build and visual check are still required before merging.

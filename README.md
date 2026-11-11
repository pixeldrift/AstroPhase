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
- Lightly emissive near-side lunar surface; the Moon does not cast a shadow onto the board
- Textured, emissive Sun with a soft glow, aligned with the directional sunlight
- Four upright colored rocket pieces: Grape, Orange, Lime and Cherry
- Eight-slot spinner in the order **1, 3, 5, Event, 2, 4, 6, Event**
- Ten-card shuffled Event deck and pass-and-play question flow
- Phase tokens face inward toward the Moon, with labels on the outer side of each token
- Circular token geometry and disabled token shadow casting to avoid square plane shadows
- Correct answers collect a phase and the rocket component matching question difficulty
- Victory requires all eight lunar phases and all three rocket components (Easy, Medium, Hard)

## Art assets

The supplied images are organized under `public/textures/`:
- `moon-albedo.jpg` — lunar surface color
- `moon-displacement.tiff` — decoded at runtime to displace the Moon's sphere geometry
- `sun-surface.jpg` — solar surface color
- `rocket-reference.png` — visual reference only; the watermarked stock image is not rendered in-game

The TIFF decoder is provided by `utif`.

## Event cards

Solar Flare, Crew Exchange, Solar Eclipse, Oxygen Leak, Rocket Boost, Bad Weather, Fuel Leak, Space Sick, Slingshot and Spacewalk.

## Question bank

The existing `quesrikns.csv` file is tab-delimited despite its extension. Keep its six-column structure:

`Difficulty<TAB>Questions<TAB>A<TAB>B<TAB>C<TAB>Answer`

## Prototype notes

This is an early gameplay and visual prototype. Rocket components are currently represented as HUD inventory; physical assembly and the lift-off animation that sends phase tokens into the player's HUD remain future work. Run a browser build and play-test before merging.

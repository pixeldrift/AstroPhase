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
- Elevated, procedurally textured Moon with directional sunlight, cast shadows and glow
- Four colored rocket tokens: Grape, Orange, Lime and Cherry
- Eight-slot spinner in the order **1, 3, 5, Event, 2, 4, 6, Event**, with a rotating rocket pointer
- Ten-card shuffled Event deck; each card is drawn once before the deck reshuffles
- Pass-and-play turn flow and question prompts from the root question bank
- Correct answers collect the phase associated with the player's board position and the rocket component matching question difficulty
- Victory requires all eight lunar phases and all three rocket components (Easy, Medium, Hard)

## Event cards

Solar Flare, Crew Exchange, Solar Eclipse, Oxygen Leak, Rocket Boost, Bad Weather, Fuel Leak, Space Sick, Slingshot and Spacewalk.

Rocket Boost can be used immediately or saved for a later turn. Space Sick presents a Hard question but awards the Easy rocket component. Solar Eclipse allows a knowledge question and rocket-component reward but blocks phase collection for that turn.

## Question bank

The existing `quesrikns.csv` file is tab-delimited despite its extension. Keep its six-column structure:

`Difficulty<TAB>Questions<TAB>A<TAB>B<TAB>C<TAB>Answer`

## Prototype notes

This is an early gameplay and visual prototype. Movement and event rules are implemented for initial play-testing; the rocket-piece HUD is an inventory abstraction for now, and the physical assembly/lift-off animation that moves collected phase tokens into the player's HUD remains future work. A browser build and play-test are still required before merging.

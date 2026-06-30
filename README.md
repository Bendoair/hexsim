# Hex-Globe Kingdom Simulation

A tweakable Babylon.js simulation: kingdoms spread across a hex-tiled globe under
simple per-tile rules, settling toward a breathing equilibrium.

## Features

### The world
- **Goldberg hex globe** — a sphere tiled with hexagons and exactly 12 pentagons,
  rendered in Babylon.js with click-to-pick tile selection.
- **Seeded terrain generation** — blobby continents and oceans grown from a seed,
  plus farmland, mountains, and coastal rivers. Sea acts as an impassable wall.
  Everything (sea fraction, ocean seeds, farmland/mountain fractions, river
  chance) is tunable and regenerates live.

### Kingdoms
- **Found capitals** — click any land tile to plant a capital and start a kingdom
  (up to a configurable cap). Distance to the capital drives tile growth.
- **Found settlements** — click one of your own tiles to add a settlement, a
  secondary point source.
- **Capital floor** — capital tiles never drop below a minimum point value, so a
  besieged kingdom always keeps a durable heart.

### Simulation
Discrete, fixed ticks over a double-buffered, deterministic (seeded) state. Each
tick applies, in order:
1. **Accumulation** — tiles gain points, scaled by terrain and by distance
   falloff from the capital.
2. **Hostility** — tiles bordering enemy kingdoms are drained (capped per tick).
3. **Spread** — tiles past a threshold spend points to convert neighbors, with
   contested-tile resolution.
4. **Mutation** — a small seeded chance of allegiance flips or point bursts to
   keep borders breathing.
5. **Capital floor** — clamps capitals back up to their minimum.

### Controls & views
- **HUD** — play/pause, single step, reset, and a live tick counter.
- **Views** — color the globe by **Owner**, **Points**, or **Terrain**.
- **Icons** — toggle per-tile lucide icon overlays (terrain types + capitals).
- **Borders** — toggle inset, depth-tested kingdom border lines drawn inside each
  hex (no z-fighting, no see-through to the far side of the globe).
- **Control panel** — a live slider for every tunable in `SimConfig`; sim dials
  apply on the next tick, world dials regenerate the map.

## Getting started
```bash
npm install
npm run dev     # Vite dev server
npm test        # Vitest headless sim tests
```

---

## For the AI agent (Cursor)
1. Read **`docs/PROJECT.md`** — the source of truth (decisions, ruleset, architecture).
2. Read **`docs/TASKS.md`** — the ordered build checklist. Work it top to bottom.
3. The `.cursor/rules/` files load automatically:
   - `000-project.mdc` (always) — core constraints.
   - `100-core-architecture.mdc` — auto-loads when editing `core/`/`sim/`/`config/`.
   - `200-render-babylon.mdc` — auto-loads when editing `render/`.
   - `300-goldberg-geometry.mdc` — pull in (`@300-goldberg-geometry`) for geometry work.
4. If a task hits an **Open Question** (PROJECT.md §3), **stop and ask** — don't guess.

## Key constraints (full list in the rules)
- TypeScript strict, no `any`.
- Sim is double-buffered and tick-based; render loop is separate.
- `core/` and `sim/` never import Babylon — they run headless under Vitest.
- Terrain/features are composition on `Tile`, not subclasses.
- Every tunable lives in `SimConfig` and gets a UI slider.

## Layout
```
.cursor/rules/   Cursor project rules (.mdc)
docs/            PROJECT.md (spec), TASKS.md (checklist)
src/config/      SimConfig.ts — the tuning surface, with starting values
src/core/        World, HexGrid, Tile, Kingdom, terrain/, features/  (engine-agnostic)
src/sim/         Simulation + rules/                                 (engine-agnostic)
src/render/      Babylon: GlobeMesh, Picker, SceneSetup, colorBuffer, TileOverlays, KingdomBorders
src/ui/          ControlPanel (sliders), HUD (views, pause/step/reset)
src/main.ts      wiring
```

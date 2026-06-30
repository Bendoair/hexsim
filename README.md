# Hex-Globe Kingdom Simulation

A tweakable Babylon.js simulation: kingdoms spread across a hex-tiled globe under
simple per-tile rules, settling toward a breathing equilibrium.

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
src/render/      Babylon: GlobeMesh, Picker, SceneSetup, colorBuffer
src/ui/          ControlPanel (sliders), HUD (pause/step/reset)
src/main.ts      wiring
```

## Getting started (once scaffolded)
```bash
npm install
npm run dev     # Vite dev server
npm test        # Vitest headless sim tests
```

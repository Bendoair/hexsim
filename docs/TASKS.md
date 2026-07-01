# Task Checklist

Work top to bottom. Each task is sized for one agent session. Check the box,
update the doc, commit. Do **not** skip ahead — later steps assume earlier ones
verified. If a task reveals an Open Question (PROJECT.md §3), stop and ask.

## Step 0 — Scaffold
- [x] Vite + TypeScript (strict) project, Babylon.js installed.
- [x] Folder layout exactly as PROJECT.md §5.
- [x] Vitest configured; one trivial passing test in `core/`.
- [x] ESLint rule (or eslint-disable-free convention) forbidding Babylon imports in `core/` and `sim/`.

## Step 1 — Globe + picking
- [x] `render/SceneSetup`: engine, scene, ArcRotateCamera, hemispheric light.
- [x] `render/GlobeMesh`: `CreateGoldberg` (m=6, n=0 → 362 faces).
- [x] Orient mesh so two pentagons sit at poles.
- [x] `core/HexGrid`: build tile list + adjacency from the Goldberg face data.
- [x] Tag pentagon faces `isPoleCap=true`.
- [x] `render/Picker`: pointer pick → face index → tile id, log on click.
- [x] **Verify:** clicking any hex logs a stable id; pentagons identifiable.

## Step 2 — Static terrain
- [x] `core/terrain/`: `TerrainType` abstract + Grass, Sea (others later).
- [x] Seeded assignment of Land/Sea across tiles (graph region-growth).
- [x] `render/colorBuffer`: map terrain → per-face color, push to mesh.
- [x] **Verify:** land/sea pattern renders; face↔tile mapping visually correct.

## Step 3 — Capitals + ownership
- [x] `core/Kingdom` + `core/features/Capital`.
- [x] Click a land tile → create Kingdom with capital there (capped, Open Q#3).
- [x] Color tiles by owner; capital visually distinct (brightened).
- [x] `HexGrid` hex-distance (BFS) from a tile, used later by falloff.
- [x] **Verify:** multiple capitals placeable, each its own color.

## Step 4 — Tick loop (accumulation only)
- [x] `config/SimConfig` with all constants from PROJECT.md §4 + bounds.
- [x] `sim/Simulation`: double-buffered state, seeded RNG, `step()`.
- [x] `sim/rules/accumulation.ts` only.
- [x] `ui/HUD`: pause / step-once / reset / tick counter.
- [x] Debug overlay: show points per tile (brightness ramp).
- [x] **Test (headless):** after N ticks, near-capital tiles have more points than far ones.

## Step 5 — Spread + hostility
- [x] `sim/rules/hostility.ts` (capped drain).
- [x] `sim/rules/spread.ts`. Open Q#1 resolved: CONTEST (stronger attacker wins, tie-break lowest id).
- [x] Open Q#2 resolved: sea is a HARD WALL (impassable, not a spread neighbor, blocks distance).
- [x] **Verify:** kingdoms grow then stall; borders form at contact.
- [x] **Test:** lone-kingdom expansion DECELERATES, and two adjacent kingdoms settle on a STABLE border. (Note: §4's rules have no decay/cap, so a lone kingdom on finite land eventually fills it — equilibrium is a multi-kingdom, hostility-driven phenomenon. Decided with the human 2026-06-30.)

## Step 6 — Mutation + tuning
- [x] `sim/rules/mutation.ts`.
- [x] `ui/ControlPanel`: live sliders bound to every `SimConfig` field.
- [x] **Verify:** at mutation=0 borders freeze; small mutation makes them breathe.

## Step 7 — Extras (each fully additive)
- [x] `FarmlandTerrain`, `MountainTerrain` gain mods + config entries + sliders + seeded placement.
- [x] `RiverTerrain` — decided with the human to implement TILE-BASED (passable land with the river gain mod, seeded along coasts) rather than edge-based; no adjacency change. Config `world.riverChance` + slider.
- [x] `Settlement` feature (secondary gain source; flat accumulation bonus) + slider + left-click placement on owned tiles.
- [x] Each extra: new class + config entry + slider, **no** structural change.
- [x] **Border exchange** — bulk frontier deals between kingdom pairs; hostility
  defaults 0; exchange tunables + HUD event popup with on/off toggle.

# Task Checklist

Work top to bottom. Each task is sized for one agent session. Check the box,
update the doc, commit. Do **not** skip ahead — later steps assume earlier ones
verified. If a task reveals an Open Question (PROJECT.md §3), stop and ask.

## Step 0 — Scaffold
- [ ] Vite + TypeScript (strict) project, Babylon.js installed.
- [ ] Folder layout exactly as PROJECT.md §5.
- [ ] Vitest configured; one trivial passing test in `core/`.
- [ ] ESLint rule (or eslint-disable-free convention) forbidding Babylon imports in `core/` and `sim/`.

## Step 1 — Globe + picking
- [ ] `render/SceneSetup`: engine, scene, ArcRotateCamera, hemispheric light.
- [ ] `render/GlobeMesh`: `CreateGoldberg`, choose m/n for a reasonable tile count (start small, ~200–600 tiles).
- [ ] Orient mesh so two pentagons sit at poles.
- [ ] `core/HexGrid`: build tile list + adjacency from the Goldberg face data.
- [ ] Tag pole-adjacent pentagon faces `isPoleCap=true`.
- [ ] `render/Picker`: pointer pick → face index → tile id, log on click.
- [ ] **Verify:** clicking any hex logs a stable id; pentagons identifiable.

## Step 2 — Static terrain
- [ ] `core/terrain/`: `TerrainType` abstract + Grass, Sea (others later).
- [ ] Seeded assignment of Land/Sea across tiles.
- [ ] `render/colorBuffer`: map terrain → per-face color, push to mesh.
- [ ] **Verify:** land/sea pattern renders; face↔tile mapping visually correct.

## Step 3 — Capitals + ownership
- [ ] `core/Kingdom` + `core/features/Capital`.
- [ ] Click a land tile → create Kingdom with capital there.
- [ ] Color tiles by owner; capital visually distinct.
- [ ] `HexGrid` hex-distance (BFS) from a tile, used later by falloff.
- [ ] **Verify:** multiple capitals placeable, each its own color.

## Step 4 — Tick loop (accumulation only)
- [ ] `config/SimConfig` with all constants from PROJECT.md §4 + bounds.
- [ ] `sim/Simulation`: double-buffered state, seeded RNG, `step()`.
- [ ] `sim/rules/accumulation.ts` only.
- [ ] `ui/HUD`: pause / step-once / reset / tick counter.
- [ ] Debug overlay: show points per tile (e.g. brightness ramp).
- [ ] **Test (headless):** after N ticks, near-capital tiles have more points than far ones.

## Step 5 — Spread + hostility
- [ ] `sim/rules/hostility.ts` (capped drain).
- [ ] `sim/rules/spread.ts`. **ASK** the human re: conflict resolution (Open Q#1) before coding it.
- [ ] **ASK** re: sea passability (Open Q#2) when spread needs neighbor eligibility.
- [ ] **Verify:** kingdoms grow then stall; borders form at contact.
- [ ] **Test:** a lone kingdom on infinite land stops expanding at a finite radius.

## Step 6 — Mutation + tuning
- [ ] `sim/rules/mutation.ts`.
- [ ] `ui/ControlPanel`: live sliders bound to every `SimConfig` field.
- [ ] **Verify:** at mutation=0 borders freeze; small mutation makes them breathe.

## Step 7 — Extras (each fully additive)
- [ ] `FarmlandTerrain`, `MountainTerrain` gain mods + config entries.
- [ ] `RiverTerrain` (edge-based; affects adjacency cost) — design note first.
- [ ] `Settlement` feature (secondary gain source / soft capital).
- [ ] Each extra: new class + config entry + slider, **no** structural change.

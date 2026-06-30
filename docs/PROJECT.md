# Hex-Globe Kingdom Simulation — Project Spec

> **Read this file first.** It is the single source of truth. If code and this
> doc disagree, the doc wins until the doc is updated. Keep it updated.

## 1. What we are building

A small, **tweakable** simulation of kingdoms spreading across a hex-tiled
globe, rendered in the browser with Babylon.js. The user places capitals; simple
per-tile rules cause kingdoms to expand, clash at borders, and settle toward a
breathing equilibrium with occasional random mutation.

This is a personal/hobby project. Optimize for **clarity, expandability, and
fast iteration on rules**, not for production hardening.

## 2. Locked decisions (do not relitigate without asking the human)

| Decision | Choice | Why |
|---|---|---|
| Render engine | **Babylon.js** (WebGL2, WebGPU later) | Built-in `CreateGoldberg` hex-sphere; per-face color API; less boilerplate. |
| Globe geometry | **Goldberg polyhedron** | The only way to hex-tile a sphere. Always has exactly 12 pentagons. |
| The 12 pentagons | **Hidden at poles** | Orient globe so pentagons sit near poles; tag them `isPoleCap=true` and exclude from sim. Every *active* tile then has exactly 6 neighbors. |
| Timing | **Discrete fixed ticks** | Deterministic, seedable, trivial pause/step/reset. Render loop (60fps) is independent of sim ticks. |
| State update | **Double-buffered** | Read buffer A, write buffer B, swap. Prevents update-order artifacts. Non-negotiable. |
| Terrain & features | **Composition, not subclass of Tile** | A tile mutates terrain at runtime; subclassing would force object recreation and break references. |
| Language | **TypeScript**, strict mode | |
| Build tool | **Vite** | Fast HMR, matches iteration goal. |

## 3. Open questions (ASK the human before assuming)

These are **not yet decided**. Do not silently pick one — surface the question.

1. **Spread conflict resolution**: when two tiles target the same neutral tile in
   one tick, does it resolve simultaneously (both may grab, last-write-wins) or
   by contest (higher-points tile wins)? Default stub: contest, but flag it.
2. **Sea**: hard wall (not a neighbor for spread) or passable with zero gain?
   Default stub: hard wall, but flag it.
3. **Capital count / placement**: fixed N at start, or user adds any number any
   time? Default stub: user clicks to add, no cap.

## 4. The ruleset (per owned tile, per tick)

Order matters. Apply in this sequence, all reading from the *previous* buffer:

1. **Accumulation** — `points += base_gain * terrainMod * distanceFalloff`
   where `distanceFalloff = 1 / (1 + k * hexDistanceToCapital)`.
2. **Hostility drain** — for each neighbor owned by a *different* kingdom,
   `points -= hostility_cost`, total drain capped at `max_hostility`.
3. **Spread** — if `points >= spread_threshold`, convert one eligible neighbor
   (unowned, or enemy with low points); spend `spread_cost`; new tile starts low.
4. **Mutation** — each tile rolls `mutation_chance` to do a random small event
   (flip allegiance, point burst, later: terrain change).

Equilibrium emerges because distance falloff + hostility drain make far frontier
tiles unable to clear `spread_threshold`. Mutation keeps borders from freezing
solid. The key dial is the **`spread_cost : base_gain` ratio**.

Every constant above lives in `SimConfig` (see §6) and is bound to a UI slider.

## 5. Architecture (layers)

```
config/   SimConfig — all tunable constants, one object, defaults + bounds
core/     World, HexGrid, Tile, Kingdom, terrain/, features/  (pure data + logic, NO Babylon imports)
sim/      Simulation (tick loop, double buffer, seeded RNG), rules/ (one file per rule)
render/   GlobeMesh, Picker, SceneSetup, colorBuffer  (ALL Babylon code lives here)
ui/       ControlPanel (sliders→SimConfig), HUD (pause/step/reset, tick counter)
main.ts   wires World + Simulation + Renderer + UI
```

**Hard dependency rule:** `core/` and `sim/` must NOT import Babylon. Rendering
is a read-only view of sim state. This keeps the sim testable headless and lets
us swap renderers later. See the layering cursor rule.

## 6. Class model (composition-first)

```
SimConfig                  // plain object of tunables

World
 ├─ HexGrid                // tile array + neighbor adjacency + hex-distance (BFS)
 ├─ Tile[]                 // flat, index = id
 └─ Kingdom[]

Tile { id, ownerId|null, points, terrain: TerrainType, feature: Feature|null,
       faceIndex, isPoleCap }

TerrainType (abstract: gainMod, passable)
 ├─ GrassTerrain  ├─ FarmlandTerrain  ├─ MountainTerrain
 ├─ SeaTerrain    └─ RiverTerrain
Feature (abstract overlay)
 ├─ Capital       └─ Settlement

Kingdom { id, color, capitalTileId, ownedTileIds: Set }

Simulation { step(), rules: Rule[], rng }   // double-buffered
Renderer    { globe mesh, pickFace(), camera, lights, syncColors(world) }
```

`Rule` is an interface: `apply(tile, readState, writeState, grid, config, rng)`.
Adding farmland or a new behavior = add a TerrainType/Feature/Rule + a config
entry. No structural change. That is the whole point of the design.

## 7. Build order (each step independently runnable & verifiable)

1. Globe + picking: render Goldberg sphere, orient poles, click→tile id, tag pole caps.
2. Static terrain: assign Land/Sea, color faces. Verify face↔tile map.
3. Capitals + ownership: click to place capital, flood-fill color a kingdom.
4. Tick loop: double buffer + accumulation only; debug overlay shows points.
5. Spread + hostility: borders move; tune until expansion *and* stalling appear.
6. Mutation + tuning: find the parameter band where borders breathe.
7. Extras: farmland/mountain/river mods, settlements — additive only.

See `docs/TASKS.md` for the granular checklist per step.

## 8. Definition of done for any task

- TypeScript strict passes, no `any`.
- `core/` and `sim/` changes have a headless unit test (Vitest).
- The relevant build-order step still runs in the browser.
- New tunables are added to `SimConfig` with sane defaults AND a UI slider.
- This doc and `docs/TASKS.md` updated if scope changed.

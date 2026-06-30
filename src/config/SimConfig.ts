/**
 * SimConfig — every tunable constant for the simulation.
 *
 * Plain serializable object: no logic, no imports. Each field is bound to a UI
 * slider in ui/ControlPanel. Values below are STARTING POINTS, not tuned truth —
 * the whole project is about finding the band where borders breathe.
 *
 * The dial that matters most is spreadCost : baseGain.
 */
export interface SimConfig {
  /** Seed for the deterministic RNG. Same seed + same inputs => same run. */
  seed: number;

  // --- Capitals -----------------------------------------------------------
  /** Maximum number of capitals/kingdoms a user may place (Open Q#3: capped). */
  maxCapitals: number;       // suggested 8,    range 1–24

  // --- World generation (terrain layout) ----------------------------------
  world: {
    /** Fraction of non-pole tiles that become sea. */
    seaFraction: number;     // suggested 0.5,  range 0–0.9
    /** Number of ocean "seeds" grown into continents/oceans. More = choppier. */
    oceanSeeds: number;      // suggested 6,    range 1–30
    /** Fraction of LAND tiles seeded as farmland (high gain). */
    farmlandFraction: number; // suggested 0.15, range 0–0.6
    /** Fraction of LAND tiles seeded as mountain (low gain). */
    mountainFraction: number; // suggested 0.12, range 0–0.6
    /** Probability a coastal land tile becomes a river (small gain bonus). */
    riverChance: number;      // suggested 0.35, range 0–1
  };

  // --- Features -----------------------------------------------------------
  /** Flat extra points/tick a Settlement adds to its tile (secondary source). */
  settlementBonus: number;   // suggested 0.6,  range 0–5

  // --- Accumulation -------------------------------------------------------
  /** Points a tile gains per tick before modifiers. */
  baseGain: number;          // suggested 1.0,  range 0–5
  /** Distance falloff strength k in 1/(1 + k*dist). Higher = far tiles starve faster. */
  distanceK: number;         // suggested 0.35, range 0–2

  // --- Hostility ----------------------------------------------------------
  /** Points drained per enemy-owned neighbor per tick. */
  hostilityCost: number;     // suggested 0.4,  range 0–3
  /** Max total hostility drain per tile per tick (the cap you asked for). */
  maxHostility: number;      // suggested 1.5,  range 0–6

  // --- Spread -------------------------------------------------------------
  /** Points required before a tile may convert a neighbor. */
  spreadThreshold: number;   // suggested 10,   range 1–100
  /** Points spent to convert one neighbor. */
  spreadCost: number;        // suggested 6,    range 1–100
  /** Points a freshly converted tile starts with. */
  newTileSeedPoints: number; // suggested 1,    range 0–20

  // --- Mutation -----------------------------------------------------------
  /** Per-tile, per-tick probability of a small random event. 0 = borders freeze. */
  mutationChance: number;    // suggested 0.002, range 0–0.1

  // --- Terrain gain multipliers (applied as terrainMod) -------------------
  terrain: {
    grass: number;     // 1.0
    farmland: number;  // 1.6
    mountain: number;  // 0.5
    sea: number;       // 0.0  (and see Open Question: passable vs wall)
    river: number;     // 1.1
  };
}

export const DEFAULT_CONFIG: SimConfig = {
  seed: 1,
  maxCapitals: 8,
  world: {
    seaFraction: 0.5,
    oceanSeeds: 6,
    farmlandFraction: 0.15,
    mountainFraction: 0.12,
    riverChance: 0.35,
  },
  settlementBonus: 0.6,
  baseGain: 1.0,
  distanceK: 0.35,
  hostilityCost: 0.4,
  maxHostility: 1.5,
  spreadThreshold: 10,
  spreadCost: 6,
  newTileSeedPoints: 1,
  mutationChance: 0.002,
  terrain: { grass: 1.0, farmland: 1.6, mountain: 0.5, sea: 0.0, river: 1.1 },
};

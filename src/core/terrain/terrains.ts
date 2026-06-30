import { TerrainType, type TerrainId } from "./TerrainType";

/**
 * Concrete terrains. Each is a stateless singleton shared by every tile of that
 * type (terrain carries no per-tile state — that lives on the Tile). Only Grass
 * and Sea exist for now; Farmland/Mountain/River arrive in the Extras step.
 */
class Grass extends TerrainType {
  readonly id = "grass";
  readonly passable = true;
}

class Sea extends TerrainType {
  readonly id = "sea";
  // Resolved Open Q#2: sea is a HARD WALL — impassable, never a spread neighbor.
  readonly passable = false;
}

class Farmland extends TerrainType {
  readonly id = "farmland";
  readonly passable = true;
}

class Mountain extends TerrainType {
  readonly id = "mountain";
  readonly passable = true;
}

class River extends TerrainType {
  // Tile-based river (decided with the human): a passable land tile with a small
  // gain bonus, seeded along coasts. It does NOT alter adjacency cost.
  readonly id = "river";
  readonly passable = true;
}

export const GRASS: TerrainType = new Grass();
export const SEA: TerrainType = new Sea();
export const FARMLAND: TerrainType = new Farmland();
export const MOUNTAIN: TerrainType = new Mountain();
export const RIVER: TerrainType = new River();

/** Lookup table by id, for terrain that may be assigned dynamically later. */
export const TERRAIN_BY_ID: Readonly<Partial<Record<TerrainId, TerrainType>>> = {
  grass: GRASS,
  sea: SEA,
  farmland: FARMLAND,
  mountain: MOUNTAIN,
  river: RIVER,
};

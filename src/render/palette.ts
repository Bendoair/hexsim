import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { TerrainId } from "../core/terrain/TerrainType";

/**
 * Presentation-only color palette. Lives in render/ — core/sim never reference
 * colors (Kingdom colors are the one exception, stored as plain RGB on the model).
 */
export const TERRAIN_COLORS: Record<TerrainId, Color3> = {
  grass: new Color3(0.3, 0.58, 0.27),
  farmland: new Color3(0.74, 0.69, 0.27),
  mountain: new Color3(0.5, 0.47, 0.44),
  sea: new Color3(0.12, 0.3, 0.55),
  river: new Color3(0.3, 0.5, 0.75),
};

/** Pentagons / pole caps render in a flat, obviously-excluded color. */
export const POLE_CAP_COLOR = new Color3(0.16, 0.15, 0.2);

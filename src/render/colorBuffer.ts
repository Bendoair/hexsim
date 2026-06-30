import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { World } from "../core/World";
import { POLE_CAP_COLOR, TERRAIN_COLORS } from "./palette";

/**
 * ColorBuffer — writes one RGBA color per Goldberg face into the mesh's vertex
 * color buffer. Faces 0-11 are pentagons (5 verts each), 12+ are hexagons (6),
 * matching Babylon's Goldberg layout. First apply() uploads an updatable buffer;
 * later apply() calls update it in place, so per-tick recoloring stays cheap.
 */
export class ColorBuffer {
  private readonly mesh: Mesh;
  private readonly colors: Float32Array;
  private applied = false;

  constructor(mesh: Mesh, faceCount: number) {
    this.mesh = mesh;
    const totalVerts = 60 + Math.max(0, faceCount - 12) * 6;
    this.colors = new Float32Array(totalVerts * 4);
    this.colors.fill(1);
  }

  setFace(faceIndex: number, r: number, g: number, b: number, a = 1): void {
    const start = faceIndex < 12 ? faceIndex * 5 : 60 + (faceIndex - 12) * 6;
    const count = faceIndex < 12 ? 5 : 6;
    for (let v = 0; v < count; v++) {
      const o = (start + v) * 4;
      this.colors[o] = r;
      this.colors[o + 1] = g;
      this.colors[o + 2] = b;
      this.colors[o + 3] = a;
    }
  }

  apply(): void {
    if (this.applied) {
      this.mesh.updateVerticesData(VertexBuffer.ColorKind, this.colors);
    } else {
      this.mesh.setVerticesData(VertexBuffer.ColorKind, this.colors, true);
      this.applied = true;
    }
  }
}

/** Paint every face by terrain (pole caps get their own flat color). */
export function applyTerrainColors(world: World, colors: ColorBuffer): void {
  for (const tile of world.grid.tiles) {
    const c = tile.isPoleCap ? POLE_CAP_COLOR : TERRAIN_COLORS[tile.terrain.id];
    colors.setFace(tile.faceIndex, c.r, c.g, c.b);
  }
  colors.apply();
}

/**
 * Paint by ownership: pole caps and sea keep their terrain look, unowned land is
 * green, owned land takes its kingdom color, and a capital tile is brightened so
 * it reads as the seat of the kingdom.
 */
export function applyWorldColors(world: World, colors: ColorBuffer): void {
  for (const tile of world.grid.tiles) {
    if (tile.isPoleCap) {
      colors.setFace(tile.faceIndex, POLE_CAP_COLOR.r, POLE_CAP_COLOR.g, POLE_CAP_COLOR.b);
      continue;
    }
    if (!tile.terrain.passable) {
      const sea = TERRAIN_COLORS.sea;
      colors.setFace(tile.faceIndex, sea.r, sea.g, sea.b);
      continue;
    }
    if (tile.ownerId === null) {
      const c = TERRAIN_COLORS[tile.terrain.id];
      colors.setFace(tile.faceIndex, c.r, c.g, c.b);
      continue;
    }

    const kingdom = world.kingdomById(tile.ownerId);
    const base = kingdom?.color ?? { r: 1, g: 1, b: 1 };
    const kind = tile.feature?.kind;
    const lighten = kind === "capital" ? 0.55 : kind === "settlement" ? 0.3 : 0;
    colors.setFace(
      tile.faceIndex,
      mix(base.r, 1, lighten),
      mix(base.g, 1, lighten),
      mix(base.b, 1, lighten),
    );
  }
  colors.apply();
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Debug overlay: brightness ramps with a tile's points. Owned tiles fade from a
 * dim version of their kingdom color (low points) to bright (high points), so the
 * accumulation gradient near capitals is visible at a glance.
 */
export function applyPointsColors(world: World, colors: ColorBuffer): void {
  let maxPoints = 0;
  for (const tile of world.grid.tiles) {
    if (tile.ownerId !== null && tile.points > maxPoints) {
      maxPoints = tile.points;
    }
  }
  const denom = maxPoints > 0 ? maxPoints : 1;

  for (const tile of world.grid.tiles) {
    if (tile.isPoleCap) {
      colors.setFace(tile.faceIndex, POLE_CAP_COLOR.r, POLE_CAP_COLOR.g, POLE_CAP_COLOR.b);
      continue;
    }
    if (!tile.terrain.passable) {
      const sea = TERRAIN_COLORS.sea;
      colors.setFace(tile.faceIndex, sea.r * 0.5, sea.g * 0.5, sea.b * 0.5);
      continue;
    }
    if (tile.ownerId === null) {
      colors.setFace(tile.faceIndex, 0.08, 0.1, 0.08);
      continue;
    }
    const base = world.kingdomById(tile.ownerId)?.color ?? { r: 1, g: 1, b: 1 };
    const frac = Math.min(1, tile.points / denom);
    const brightness = 0.2 + 0.8 * frac;
    colors.setFace(tile.faceIndex, base.r * brightness, base.g * brightness, base.b * brightness);
  }
  colors.apply();
}

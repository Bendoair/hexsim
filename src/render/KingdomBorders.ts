import { CreateLineSystem } from "@babylonjs/core/Meshes/Builders/linesBuilder";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import type { Scene } from "@babylonjs/core/scene";
import type { GoldbergMesh } from "@babylonjs/core/Meshes/goldbergMesh";
import type { World } from "../core/World";

/** How far each edge endpoint is pulled toward the tile center (0..1). Insetting
 * keeps a kingdom's border inside its own hex so neighbours don't overdraw. */
const INSET = 0.16;
/** Radial lift above the surface to avoid z-fighting with the globe faces. */
const RAISE = 0.006;
/** Mix the border color this far toward white for visibility. */
const LIGHTEN = 0.35;

interface BorderEdge {
  /** The owned-tile side this edge belongs to (color + ownership come from it). */
  face: number;
  /** The tile across this edge; a border is drawn when it has a different owner. */
  neighbor: number;
  /** Inset + raised endpoints, in the globe's LOCAL frame. */
  a: Vector3;
  b: Vector3;
}

/**
 * KingdomBorders — draws a line along every hex edge where an owned tile meets a
 * tile of a different (or no) kingdom. Lines are inset inside the owning hex and
 * lifted slightly off the surface, so neighbouring kingdoms each draw their own
 * border without z-fighting or overlapping.
 *
 * Render-only. Edge geometry is precomputed once (topology is static); each
 * rebuild just picks which edges currently sit on a kingdom boundary.
 */
export class KingdomBorders {
  private readonly scene: Scene;
  private readonly globe: GoldbergMesh;
  private readonly edges: BorderEdge[] = [];
  private mesh: LinesMesh | null = null;

  constructor(scene: Scene, globe: GoldbergMesh) {
    this.scene = scene;
    this.globe = globe;
    this.precomputeEdges();
  }

  /** Rebuild the border mesh from the current ownership. Cheap; call after owner
   * changes (each tick while visible) or when toggled on. */
  rebuild(world: World): void {
    this.dispose();
    const lines: Vector3[][] = [];
    const colors: Color4[][] = [];

    for (const edge of this.edges) {
      const tile = world.grid.tile(edge.face);
      if (tile.ownerId === null) {
        continue;
      }
      const neighbor = world.grid.tile(edge.neighbor);
      if (neighbor.isPoleCap || neighbor.ownerId === tile.ownerId) {
        continue;
      }
      const base = world.kingdomById(tile.ownerId)?.color ?? { r: 1, g: 1, b: 1 };
      const color = new Color4(
        mix(base.r, 1, LIGHTEN),
        mix(base.g, 1, LIGHTEN),
        mix(base.b, 1, LIGHTEN),
        1,
      );
      lines.push([edge.a, edge.b]);
      colors.push([color, color]);
    }

    if (lines.length === 0) {
      return;
    }
    const mesh = CreateLineSystem(
      "kingdomBorders",
      { lines, colors, useVertexAlpha: false, updatable: false },
      this.scene,
    );
    mesh.parent = this.globe; // inherit the globe's pole orientation
    mesh.isPickable = false;
    // Same rendering group as the globe so the depth buffer is shared and
    // back-facing borders are occluded by the front of the globe (no see-through).
    mesh.renderingGroupId = 0;
    this.mesh = mesh;
  }

  /** Remove the border mesh (used when toggled off). */
  dispose(): void {
    if (this.mesh !== null) {
      this.mesh.dispose();
      this.mesh = null;
    }
  }

  /**
   * For every face edge, find the neighbour face across it (by shared vertex
   * positions) and store inset + raised endpoints. Runs once.
   */
  private precomputeEdges(): void {
    const positions = this.globe.getVerticesData(VertexBuffer.PositionKind);
    if (positions === null) {
      return;
    }
    const centers = this.globe.goldbergData.faceCenters;
    const adjacency = this.globe.goldbergData.adjacentFaces;
    const faceCount = this.globe.goldbergData.nbFaces;

    // Per-face ordered polygon vertices and a key-set for shared-edge matching.
    const faceVerts: Vector3[][] = [];
    const faceKeys: Set<string>[] = [];
    for (let f = 0; f < faceCount; f++) {
      const [start, count] = faceVertexRange(f);
      const verts: Vector3[] = [];
      const keys = new Set<string>();
      for (let v = 0; v < count; v++) {
        const o = (start + v) * 3;
        const p = new Vector3(positions[o] ?? 0, positions[o + 1] ?? 0, positions[o + 2] ?? 0);
        verts.push(p);
        keys.add(posKey(p));
      }
      faceVerts.push(verts);
      faceKeys.push(keys);
    }

    for (let f = 0; f < faceCount; f++) {
      const verts = faceVerts[f];
      const center = centers[f];
      const neighbors = adjacency[f];
      if (verts === undefined || center === undefined || neighbors === undefined) {
        continue;
      }
      for (let i = 0; i < verts.length; i++) {
        const va = verts[i];
        const vb = verts[(i + 1) % verts.length];
        if (va === undefined || vb === undefined) {
          continue;
        }
        const keyA = posKey(va);
        const keyB = posKey(vb);
        let neighbor = -1;
        for (const g of neighbors) {
          const keys = faceKeys[g];
          if (keys !== undefined && keys.has(keyA) && keys.has(keyB)) {
            neighbor = g;
            break;
          }
        }
        if (neighbor < 0) {
          continue;
        }
        this.edges.push({
          face: f,
          neighbor,
          a: placePoint(va, center),
          b: placePoint(vb, center),
        });
      }
    }
  }
}

function faceVertexRange(f: number): [number, number] {
  return f < 12 ? [f * 5, 5] : [60 + (f - 12) * 6, 6];
}

function posKey(p: Vector3): string {
  return `${p.x.toFixed(4)}_${p.y.toFixed(4)}_${p.z.toFixed(4)}`;
}

/** Pull a vertex toward the face center (inset), then lift it radially (raise). */
function placePoint(vertex: Vector3, center: Vector3): Vector3 {
  const inset = Vector3.Lerp(vertex, center, INSET);
  return inset.add(inset.clone().normalize().scale(RAISE));
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

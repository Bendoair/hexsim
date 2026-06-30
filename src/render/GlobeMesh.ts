import { CreateGoldberg } from "@babylonjs/core/Meshes/Builders/goldbergBuilder";
import type { GoldbergMesh } from "@babylonjs/core/Meshes/goldbergMesh";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Rendering/edgesRenderer";
import type { GlobeTopology } from "../core/HexGrid";

export interface GlobeMeshOptions {
  /** Goldberg tessellation. m=6,n=0 -> 362 faces (350 hexes + 12 pentagons). */
  readonly m: number;
  readonly n: number;
  readonly size: number;
}

export const DEFAULT_GLOBE_OPTIONS: GlobeMeshOptions = { m: 6, n: 0, size: 1 };

export interface GlobeMesh {
  readonly mesh: GoldbergMesh;
  /** Plain, Babylon-free description of the globe handed to core/. */
  readonly topology: GlobeTopology;
  /** Resolve a Babylon pick `faceId` (a triangle index) to a Goldberg face index. */
  faceIndexFromPickFaceId(pickFaceId: number): number | null;
}

/**
 * Builds the Goldberg hex-globe and everything the rest of the app needs to read
 * from it. The faceIndex <-> tileId map is the identity map: tile id i renders as
 * Goldberg face i. Pentagons (12 of them, the faces with 5 neighbors) are flagged
 * so core/ can tag them as pole caps and exclude them from the sim.
 */
export function createGlobeMesh(scene: Scene, options: GlobeMeshOptions = DEFAULT_GLOBE_OPTIONS): GlobeMesh {
  const mesh = CreateGoldberg("globe", { m: options.m, n: options.n, size: options.size }, scene);

  const data = mesh.goldbergData;
  const faceCount = data.nbFaces;
  const adjacency: number[][] = data.adjacentFaces.map((neighbors) => [...neighbors]);
  const isPentagon: boolean[] = adjacency.map((neighbors) => neighbors.length === 5);

  orientPentagonsToPoles(mesh, data.faceCenters, isPentagon);

  const material = new StandardMaterial("globeMat", scene);
  material.diffuseColor = new Color3(1, 1, 1);
  material.specularColor = new Color3(0.04, 0.04, 0.04);
  material.backFaceCulling = true;
  mesh.material = material;
  mesh.useVertexColors = true;

  mesh.enableEdgesRendering(0.999);
  mesh.edgesWidth = 2;
  mesh.edgesColor.set(0.05, 0.07, 0.12, 1);

  const triToFace = buildTriangleToFaceMap(mesh, data.faceCenters);

  const topology: GlobeTopology = { faceCount, adjacency, isPentagon };

  return {
    mesh,
    topology,
    faceIndexFromPickFaceId(pickFaceId: number): number | null {
      const face = triToFace[pickFaceId];
      return face === undefined ? null : face;
    },
  };
}

/**
 * Rotate the mesh so one pentagon points to +Y and its antipodal pentagon to -Y.
 * Purely cosmetic: it puts the irregular pentagons out of sight near the poles.
 * Local geometry (faceCenters, positions) is unchanged, so picking is unaffected.
 */
function orientPentagonsToPoles(
  mesh: GoldbergMesh,
  faceCenters: ReadonlyArray<Vector3>,
  isPentagon: ReadonlyArray<boolean>,
): void {
  let north = -1;
  for (let i = 0; i < isPentagon.length; i++) {
    if (isPentagon[i]) {
      north = i;
      break;
    }
  }
  if (north < 0) {
    return;
  }

  const from = faceCenters[north]?.clone().normalize();
  if (from === undefined) {
    return;
  }
  const to = new Vector3(0, 1, 0);

  const dot = Math.min(1, Math.max(-1, Vector3.Dot(from, to)));
  let quaternion: Quaternion;
  if (dot > 0.999999) {
    quaternion = Quaternion.Identity();
  } else if (dot < -0.999999) {
    quaternion = Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI);
  } else {
    const axis = Vector3.Cross(from, to).normalize();
    quaternion = Quaternion.RotationAxis(axis, Math.acos(dot));
  }
  mesh.rotationQuaternion = quaternion;
}

/**
 * Each Goldberg face is drawn as a fan of triangles. Babylon's pick result gives
 * a triangle index; we precompute which face every triangle belongs to by matching
 * each triangle's centroid to the nearest face center. Robust to internal ordering.
 */
function buildTriangleToFaceMap(mesh: GoldbergMesh, faceCenters: ReadonlyArray<Vector3>): Int32Array {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  const indices = mesh.getIndices();
  if (positions === null || indices === null) {
    throw new Error("Goldberg mesh is missing position or index data");
  }

  const triangleCount = indices.length / 3;
  const map = new Int32Array(triangleCount);

  for (let t = 0; t < triangleCount; t++) {
    const a = indices[t * 3] ?? 0;
    const b = indices[t * 3 + 1] ?? 0;
    const c = indices[t * 3 + 2] ?? 0;
    const ax = positions[a * 3] ?? 0;
    const ay = positions[a * 3 + 1] ?? 0;
    const az = positions[a * 3 + 2] ?? 0;
    const bx = positions[b * 3] ?? 0;
    const by = positions[b * 3 + 1] ?? 0;
    const bz = positions[b * 3 + 2] ?? 0;
    const cx0 = positions[c * 3] ?? 0;
    const cy0 = positions[c * 3 + 1] ?? 0;
    const cz0 = positions[c * 3 + 2] ?? 0;
    const cx = (ax + bx + cx0) / 3;
    const cy = (ay + by + cy0) / 3;
    const cz = (az + bz + cz0) / 3;

    let best = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let f = 0; f < faceCenters.length; f++) {
      const center = faceCenters[f];
      if (center === undefined) {
        continue;
      }
      const dx = center.x - cx;
      const dy = center.y - cy;
      const dz = center.z - cz;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = f;
      }
    }
    map[t] = best;
  }

  return map;
}

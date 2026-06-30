import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
// Side-effect import: Mesh.createInstance() is wired up by RegisterInstancedMesh,
// which deep type-only imports do not pull in. Without this, createInstance throws.
import "@babylonjs/core/Meshes/instancedMesh";
import type { Scene } from "@babylonjs/core/scene";
import type { GoldbergMesh } from "@babylonjs/core/Meshes/goldbergMesh";
import type { World } from "../core/World";
import type { Tile } from "../core/Tile";

import treesSvg from "lucide-static/icons/trees.svg?raw";
import wheatSvg from "lucide-static/icons/wheat.svg?raw";
import mountainSvg from "lucide-static/icons/mountain.svg?raw";
import wavesSvg from "lucide-static/icons/waves.svg?raw";
import crownSvg from "lucide-static/icons/crown.svg?raw";
import houseSvg from "lucide-static/icons/house.svg?raw";

/** One icon per terrain type, plus a special crown for capitals and a house for settlements. */
type IconKey = "grass" | "farmland" | "mountain" | "river" | "sea" | "capital" | "settlement";

interface IconSpec {
  svg: string;
  /** CSS color injected into the SVG stroke (lucide icons use currentColor). */
  color: string;
}

const ICONS: Record<IconKey, IconSpec> = {
  grass: { svg: treesSvg, color: "#eaf7e0" },
  farmland: { svg: wheatSvg, color: "#ffe7a6" },
  mountain: { svg: mountainSvg, color: "#ece9e6" },
  river: { svg: wavesSvg, color: "#cfe8ff" },
  sea: { svg: wavesSvg, color: "#bcd8ff" },
  capital: { svg: crownSvg, color: "#ffd24a" }, // special: gold crown
  settlement: { svg: houseSvg, color: "#ffffff" },
};

const ICON_SIZE = 0.07;
/** Distance to push the billboard outward along the surface normal from the face
 * center. 0 = sit exactly on the face center. */
const ICON_OFFSET = 0;
/** Render the SVG at this pixel size for a crisp texture. */
const ICON_PX = 128;

/**
 * TileOverlays — small lucide-static icon billboards drawn on top of each tile,
 * keyed by terrain type with a special icon for capitals/settlements.
 *
 * Render-only: it reads World state and never mutates it. One source plane +
 * material per icon type; each tile gets a cheap InstancedMesh sharing that
 * geometry/material. The whole layer hangs off one TransformNode so it can be
 * toggled with a single setEnabled call.
 */
export class TileOverlays {
  private readonly scene: Scene;
  private readonly globe: GoldbergMesh;
  private readonly root: TransformNode;
  private readonly sources = new Map<IconKey, Mesh>();
  private instances: InstancedMesh[] = [];
  private visible = true;

  constructor(scene: Scene, globe: GoldbergMesh) {
    this.scene = scene;
    this.globe = globe;
    // Identity root at world origin (NOT parented to the globe): billboards behave
    // badly under a rotated parent, so we instead bake the globe's orientation into
    // each icon's absolute world position and keep the parent transform-free.
    this.root = new TransformNode("tileOverlays", scene);
    this.buildSources();
  }

  /** Rebuild instances from the current terrain/feature layout. Cheap; call on
   * world regen and whenever a capital/settlement is placed (not every tick). */
  rebuild(world: World): void {
    this.clearInstances();
    const centers = this.globe.goldbergData.faceCenters;
    // faceCenters are in the globe's local frame; bake in the globe's (pole)
    // orientation so the absolute icon positions track the rendered tiles.
    const worldMatrix = this.globe.computeWorldMatrix(true);
    for (const tile of world.grid.tiles) {
      if (tile.isPoleCap) {
        continue;
      }
      const key = iconKeyForTile(tile);
      const source = this.sources.get(key);
      const center = centers[tile.faceIndex];
      if (source === undefined || center === undefined) {
        continue;
      }
      const worldCenter = Vector3.TransformCoordinates(center, worldMatrix);
      const instance = source.createInstance(`icon_${tile.id}`);
      instance.position = worldCenter.add(worldCenter.clone().normalize().scale(ICON_OFFSET));
      instance.billboardMode = TransformNode.BILLBOARDMODE_ALL;
      instance.isPickable = false;
      instance.parent = this.root;
      this.instances.push(instance);
    }
    this.root.setEnabled(this.visible);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.setEnabled(visible);
  }

  private buildSources(): void {
    for (const key of Object.keys(ICONS) as IconKey[]) {
      const spec = ICONS[key];
      const texture = makeIconTexture(spec.svg, spec.color, this.scene, `iconTex_${key}`);
      const material = new StandardMaterial(`iconMat_${key}`, this.scene);
      material.emissiveTexture = texture;
      material.opacityTexture = texture;
      material.diffuseColor = new Color3(0, 0, 0);
      material.specularColor = new Color3(0, 0, 0);
      material.disableLighting = true;
      material.backFaceCulling = false;

      const plane = CreatePlane(`iconSrc_${key}`, { size: ICON_SIZE }, this.scene);
      plane.material = material;
      plane.isVisible = false; // the source is hidden; only its instances render
      plane.isPickable = false;
      plane.parent = this.root;
      this.sources.set(key, plane);
    }
  }

  private clearInstances(): void {
    for (const instance of this.instances) {
      instance.dispose();
    }
    this.instances = [];
  }
}

function iconKeyForTile(tile: Tile): IconKey {
  const feature = tile.feature?.kind;
  if (feature === "capital") {
    return "capital";
  }
  if (feature === "settlement") {
    return "settlement";
  }
  return tile.terrain.id;
}

/**
 * Turn a lucide-static SVG string into a transparent Babylon texture: recolor the
 * stroke (lucide uses currentColor), bump it to a crisp pixel size, and load it
 * as an SVG data URI.
 */
function makeIconTexture(svgRaw: string, cssColor: string, scene: Scene, name: string): Texture {
  const svg = svgRaw
    .replace(/currentColor/g, cssColor)
    .replace(/width="24"/, `width="${ICON_PX}"`)
    .replace(/height="24"/, `height="${ICON_PX}"`);
  const dataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  // invertY=true (Babylon default) renders the SVG upright on a camera-facing billboard.
  const texture = new Texture(dataUri, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
  texture.hasAlpha = true;
  texture.name = name;
  return texture;
}

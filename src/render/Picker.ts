import { Scene } from "@babylonjs/core/scene";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import type { Observer } from "@babylonjs/core/Misc/observable";
import type { PointerInfo } from "@babylonjs/core/Events/pointerEvents";
import type { GlobeMesh } from "./GlobeMesh";
// Side-effect import: scene picking (pickInfo/faceId) is driven by Ray, which is
// not pulled in by deep @babylonjs/core imports. Without this, clicks never
// resolve to a face and capitals cannot be placed.
import "@babylonjs/core/Culling/ray";

export interface PickerOptions {
  /** Called with the resolved tile id (== faceIndex) when a globe face is clicked. */
  onPickTile: (tileId: number) => void;
}

/**
 * Picker — turns a pointer pick into a tile id via the globe's triangle->face map.
 * Render-only: it never mutates sim state, it just reports which tile was clicked.
 * Returns a disposer to detach the observer.
 */
export function createPicker(scene: Scene, globe: GlobeMesh, options: PickerOptions): () => void {
  const observer: Observer<PointerInfo> = scene.onPointerObservable.add((info) => {
    if (info.type !== PointerEventTypes.POINTERPICK) {
      return;
    }
    const pick = info.pickInfo;
    if (pick === null || !pick.hit || pick.pickedMesh !== globe.mesh || pick.faceId < 0) {
      return;
    }
    const faceIndex = globe.faceIndexFromPickFaceId(pick.faceId);
    if (faceIndex === null) {
      return;
    }
    options.onPickTile(faceIndex);
  });

  return () => {
    scene.onPointerObservable.remove(observer);
  };
}

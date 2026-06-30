import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";

export interface SceneContext {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: ArcRotateCamera;
}

/**
 * SceneSetup — engine, scene, camera and lights. All Babylon boilerplate lives
 * here (and only in render/). The globe mesh is added separately by GlobeMesh.
 */
export function createScene(canvas: HTMLCanvasElement): SceneContext {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.04, 0.06, 0.1, 1);

  const camera = new ArcRotateCamera(
    "camera",
    Math.PI / 2,
    Math.PI / 3,
    3.2,
    Vector3.Zero(),
    scene,
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 1.6;
  camera.upperRadiusLimit = 8;
  camera.wheelPrecision = 60;
  camera.minZ = 0.01;

  const keyLight = new HemisphericLight("keyLight", new Vector3(0.4, 1, 0.3), scene);
  keyLight.intensity = 0.9;
  const fillLight = new HemisphericLight("fillLight", new Vector3(-0.5, -1, -0.4), scene);
  fillLight.intensity = 0.35;

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());

  return { engine, scene, camera };
}

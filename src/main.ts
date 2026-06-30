/**
 * main.ts — application entry point. Wires World + Simulation + Renderer + UI.
 *
 * Step 6: full ruleset (accumulation -> hostility -> spread -> mutation) plus a
 * ControlPanel with a live slider for every SimConfig field. Structural sliders
 * (seed, sea layout) rebuild the world; the rest retune the running sim. Place
 * capitals by clicking land, then Play.
 */
import { createScene } from "./render/SceneSetup";
import { createGlobeMesh } from "./render/GlobeMesh";
import { createPicker } from "./render/Picker";
import { ColorBuffer, applyWorldColors, applyPointsColors, applyTerrainColors } from "./render/colorBuffer";
import { TileOverlays } from "./render/TileOverlays";
import { KingdomBorders } from "./render/KingdomBorders";
import { HexGrid } from "./core/HexGrid";
import { World } from "./core/World";
import { Simulation } from "./sim/Simulation";
import { accumulationRule } from "./sim/rules/accumulation";
import { hostilityRule } from "./sim/rules/hostility";
import { createSpreadRule } from "./sim/rules/spread";
import { mutationRule } from "./sim/rules/mutation";
import { HUD, type ViewMode } from "./ui/HUD";
import { ControlPanel } from "./ui/ControlPanel";
import { DEFAULT_CONFIG } from "./config/SimConfig";

const SIM_TICK_MS = 150;

const canvas = document.getElementById("renderCanvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("renderCanvas element not found");
}

const { scene } = createScene(canvas);
const globe = createGlobeMesh(scene);
const colors = new ColorBuffer(globe.mesh, globe.topology.faceCount);
const overlays = new TileOverlays(scene, globe.mesh);
const borders = new KingdomBorders(scene, globe.mesh);

let world = new World(new HexGrid(globe.topology), DEFAULT_CONFIG);
let sim = new Simulation(world, buildRules());
let view: ViewMode = "owners";
let bordersVisible = false;

function buildRules() {
  return [accumulationRule, hostilityRule, createSpreadRule(), mutationRule];
}

function recolor(): void {
  if (view === "points") {
    applyPointsColors(world, colors);
  } else if (view === "terrain") {
    applyTerrainColors(world, colors);
  } else {
    applyWorldColors(world, colors);
  }
}

function rebuildOverlays(): void {
  overlays.rebuild(world);
}

function refreshBorders(): void {
  if (bordersVisible) {
    borders.rebuild(world);
  }
}

let ticker: number | null = null;
function startTicking(): void {
  if (ticker !== null) {
    return;
  }
  ticker = window.setInterval(() => {
    sim.step();
    recolor();
    refreshBorders();
    hud.setTick(sim.tick);
  }, SIM_TICK_MS);
}
function stopTicking(): void {
  if (ticker !== null) {
    window.clearInterval(ticker);
    ticker = null;
  }
}

const hud = new HUD({
  onPlayPause: (playing) => (playing ? startTicking() : stopTicking()),
  onStep: () => {
    sim.step();
    recolor();
    refreshBorders();
    hud.setTick(sim.tick);
  },
  onReset: () => {
    stopTicking();
    sim.reset();
    recolor();
    refreshBorders();
    hud.setTick(sim.tick);
  },
  onSelectView: (next) => {
    view = next;
    recolor();
  },
  onToggleOverlay: (visible) => overlays.setVisible(visible),
  onToggleBorders: (visible) => {
    bordersVisible = visible;
    if (visible) {
      borders.rebuild(world);
    } else {
      borders.dispose();
    }
  },
});

new ControlPanel(DEFAULT_CONFIG, {
  onRegenerate: () => {
    stopTicking();
    world = new World(new HexGrid(globe.topology), DEFAULT_CONFIG);
    sim = new Simulation(world, buildRules());
    recolor();
    rebuildOverlays();
    refreshBorders();
    hud.setTick(sim.tick);
  },
});

createPicker(scene, globe, {
  onPickTile: (tileId) => {
    const result = world.addCapital(tileId);
    if (result.ok) {
      console.info(`Capital #${result.kingdom.id} founded on tile ${tileId}.`);
      recolor();
      rebuildOverlays();
      refreshBorders();
      return;
    }
    // Clicking an already-owned tile founds a settlement there instead.
    if (result.reason === "occupied") {
      const settlement = world.addSettlement(tileId);
      console.info(
        settlement.ok
          ? `Settlement founded on tile ${tileId}.`
          : `No settlement on tile ${tileId}: ${settlement.reason}`,
      );
      if (settlement.ok) {
        recolor();
        rebuildOverlays();
        refreshBorders();
      }
      return;
    }
    console.info(`No capital on tile ${tileId}: ${result.reason}`);
  },
});

recolor();
rebuildOverlays();
console.info(
  `Globe ready: ${world.grid.tileCount} tiles. Click LAND for a capital ` +
    `(max ${DEFAULT_CONFIG.maxCapitals}); click your own tile for a settlement. ` +
    `Then Play. Sliders on the right retune live.`,
);

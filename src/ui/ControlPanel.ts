import type { SimConfig } from "../config/SimConfig";

interface SliderSpec {
  label: string;
  min: number;
  max: number;
  step: number;
  get: () => number;
  set: (value: number) => void;
  /** Structural fields (terrain layout / seed) require rebuilding the world. */
  structural?: boolean;
}

export interface ControlPanelCallbacks {
  /** Called when a structural slider changes; rebuild world + sim. */
  onRegenerate: () => void;
}

/**
 * ControlPanel — a live slider for EVERY SimConfig field (the project's "every
 * tunable gets a UI slider" rule). Sim dials mutate the shared config object and
 * take effect on the next tick; structural dials (seed, sea layout) trigger a
 * world regenerate. Pure DOM; no sim logic here.
 */
export class ControlPanel {
  private readonly root: HTMLDivElement;

  constructor(config: SimConfig, callbacks: ControlPanelCallbacks) {
    this.root = document.createElement("div");
    this.root.style.cssText = [
      "position:fixed",
      "top:12px",
      "right:12px",
      "width:240px",
      "max-height:calc(100vh - 24px)",
      "overflow-y:auto",
      "padding:10px 12px",
      "background:rgba(12,16,26,0.86)",
      "border:1px solid rgba(255,255,255,0.12)",
      "border-radius:10px",
      "color:#dfe6f3",
      "font:12px/1.3 system-ui,sans-serif",
      "z-index:10",
    ].join(";");

    this.addHeading("World (regenerates)");
    this.addSlider(callbacks, {
      label: "seed",
      min: 0,
      max: 9999,
      step: 1,
      structural: true,
      get: () => config.seed,
      set: (v) => (config.seed = v),
    });
    this.addSlider(callbacks, {
      label: "sea fraction",
      min: 0,
      max: 0.9,
      step: 0.01,
      structural: true,
      get: () => config.world.seaFraction,
      set: (v) => (config.world.seaFraction = v),
    });
    this.addSlider(callbacks, {
      label: "ocean seeds",
      min: 1,
      max: 30,
      step: 1,
      structural: true,
      get: () => config.world.oceanSeeds,
      set: (v) => (config.world.oceanSeeds = v),
    });
    this.addSlider(callbacks, {
      label: "farmland fraction",
      min: 0,
      max: 0.6,
      step: 0.01,
      structural: true,
      get: () => config.world.farmlandFraction,
      set: (v) => (config.world.farmlandFraction = v),
    });
    this.addSlider(callbacks, {
      label: "mountain fraction",
      min: 0,
      max: 0.6,
      step: 0.01,
      structural: true,
      get: () => config.world.mountainFraction,
      set: (v) => (config.world.mountainFraction = v),
    });
    this.addSlider(callbacks, {
      label: "river chance",
      min: 0,
      max: 1,
      step: 0.01,
      structural: true,
      get: () => config.world.riverChance,
      set: (v) => (config.world.riverChance = v),
    });
    this.addSlider(callbacks, {
      label: "max capitals",
      min: 1,
      max: 24,
      step: 1,
      get: () => config.maxCapitals,
      set: (v) => (config.maxCapitals = v),
    });
    this.addSlider(callbacks, {
      label: "capital min points",
      min: 0,
      max: 100,
      step: 1,
      get: () => config.capitalMinPoints,
      set: (v) => (config.capitalMinPoints = v),
    });

    this.addHeading("Accumulation");
    this.addSlider(callbacks, {
      label: "base gain",
      min: 0,
      max: 5,
      step: 0.1,
      get: () => config.baseGain,
      set: (v) => (config.baseGain = v),
    });
    this.addSlider(callbacks, {
      label: "distance k",
      min: 0,
      max: 2,
      step: 0.01,
      get: () => config.distanceK,
      set: (v) => (config.distanceK = v),
    });

    this.addHeading("Hostility");
    this.addSlider(callbacks, {
      label: "hostility cost",
      min: 0,
      max: 3,
      step: 0.1,
      get: () => config.hostilityCost,
      set: (v) => (config.hostilityCost = v),
    });
    this.addSlider(callbacks, {
      label: "max hostility",
      min: 0,
      max: 6,
      step: 0.1,
      get: () => config.maxHostility,
      set: (v) => (config.maxHostility = v),
    });

    this.addHeading("Spread");
    this.addSlider(callbacks, {
      label: "spread threshold",
      min: 1,
      max: 100,
      step: 1,
      get: () => config.spreadThreshold,
      set: (v) => (config.spreadThreshold = v),
    });
    this.addSlider(callbacks, {
      label: "spread cost",
      min: 1,
      max: 100,
      step: 1,
      get: () => config.spreadCost,
      set: (v) => (config.spreadCost = v),
    });
    this.addSlider(callbacks, {
      label: "new tile seed points",
      min: 0,
      max: 20,
      step: 1,
      get: () => config.newTileSeedPoints,
      set: (v) => (config.newTileSeedPoints = v),
    });

    this.addHeading("Border exchange");
    this.addSlider(callbacks, {
      label: "frontier sum threshold",
      min: 10,
      max: 200,
      step: 1,
      get: () => config.exchangeFrontierSumThreshold,
      set: (v) => (config.exchangeFrontierSumThreshold = v),
    });
    this.addSlider(callbacks, {
      label: "exchange min tiles",
      min: 1,
      max: 5,
      step: 1,
      get: () => config.exchangeMinTiles,
      set: (v) => (config.exchangeMinTiles = v),
    });
    this.addSlider(callbacks, {
      label: "exchange max tiles",
      min: 2,
      max: 10,
      step: 1,
      get: () => config.exchangeMaxTiles,
      set: (v) => (config.exchangeMaxTiles = v),
    });
    this.addSlider(callbacks, {
      label: "forced ratio",
      min: 1.2,
      max: 5,
      step: 0.1,
      get: () => config.exchangeForcedRatio,
      set: (v) => (config.exchangeForcedRatio = v),
    });
    this.addSlider(callbacks, {
      label: "one-way ratio",
      min: 1,
      max: 3,
      step: 0.1,
      get: () => config.exchangeOneWayRatio,
      set: (v) => (config.exchangeOneWayRatio = v),
    });
    this.addSlider(callbacks, {
      label: "base accept chance",
      min: 0,
      max: 1,
      step: 0.01,
      get: () => config.exchangeBaseAcceptChance,
      set: (v) => (config.exchangeBaseAcceptChance = v),
    });
    this.addSlider(callbacks, {
      label: "advantage slope",
      min: 0,
      max: 1,
      step: 0.01,
      get: () => config.exchangeAdvantageSlope,
      set: (v) => (config.exchangeAdvantageSlope = v),
    });
    this.addSlider(callbacks, {
      label: "exchange point cost",
      min: 0,
      max: 50,
      step: 1,
      get: () => config.exchangePointCost,
      set: (v) => (config.exchangePointCost = v),
    });

    this.addHeading("Mutation");
    this.addSlider(callbacks, {
      label: "mutation chance",
      min: 0,
      max: 0.1,
      step: 0.001,
      get: () => config.mutationChance,
      set: (v) => (config.mutationChance = v),
    });

    this.addHeading("Features");
    this.addSlider(callbacks, {
      label: "settlement bonus",
      min: 0,
      max: 5,
      step: 0.1,
      get: () => config.settlementBonus,
      set: (v) => (config.settlementBonus = v),
    });

    this.addHeading("Terrain gain mods");
    const terrainKeys = ["grass", "farmland", "mountain", "sea", "river"] as const;
    for (const key of terrainKeys) {
      this.addSlider(callbacks, {
        label: key,
        min: 0,
        max: 3,
        step: 0.1,
        get: () => config.terrain[key],
        set: (v) => (config.terrain[key] = v),
      });
    }

    document.body.appendChild(this.root);
  }

  private addHeading(text: string): void {
    const h = document.createElement("div");
    h.textContent = text;
    h.style.cssText = "margin:10px 0 4px;font-weight:600;opacity:0.7;letter-spacing:0.02em";
    this.root.appendChild(h);
  }

  private addSlider(callbacks: ControlPanelCallbacks, spec: SliderSpec): void {
    const row = document.createElement("label");
    row.style.cssText = "display:block;margin:6px 0";

    const caption = document.createElement("div");
    caption.style.cssText = "display:flex;justify-content:space-between;gap:8px";
    const name = document.createElement("span");
    name.textContent = spec.label;
    const value = document.createElement("span");
    value.style.cssText = "font-variant-numeric:tabular-nums;opacity:0.85";
    value.textContent = format(spec.get());
    caption.append(name, value);

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    input.value = String(spec.get());
    input.style.cssText = "width:100%";
    input.addEventListener("input", () => {
      const v = Number(input.value);
      spec.set(v);
      value.textContent = format(v);
      if (spec.structural) {
        callbacks.onRegenerate();
      }
    });

    row.append(caption, input);
    this.root.appendChild(row);
  }
}

function format(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

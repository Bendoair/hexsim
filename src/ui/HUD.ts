export type ViewMode = "owners" | "points" | "terrain";

export interface HudCallbacks {
  onPlayPause: (playing: boolean) => void;
  onStep: () => void;
  onReset: () => void;
  onSelectView: (view: ViewMode) => void;
  onToggleOverlay: (visible: boolean) => void;
  onToggleBorders: (visible: boolean) => void;
}

const VIEW_OPTIONS: ReadonlyArray<{ id: ViewMode; label: string }> = [
  { id: "owners", label: "Owner" },
  { id: "points", label: "Points" },
  { id: "terrain", label: "Terrain" },
];

/**
 * HUD — control bar plus a Views section. Top row: play/pause, step, reset, tick.
 * Second row ("Views"): mutually-exclusive Owner/Points/Terrain selector and an
 * Icons on/off toggle. Pure DOM; reports intent through callbacks and never
 * touches sim state directly.
 */
export class HUD {
  private readonly root: HTMLDivElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly tickLabel: HTMLSpanElement;
  private readonly viewButtons = new Map<ViewMode, HTMLButtonElement>();
  private readonly overlayBtn: HTMLButtonElement;
  private readonly bordersBtn: HTMLButtonElement;
  private playing = false;
  private view: ViewMode = "owners";
  private overlayVisible = true;
  private bordersVisible = false;

  constructor(callbacks: HudCallbacks) {
    this.root = document.createElement("div");
    this.root.style.cssText = [
      "position:fixed",
      "top:12px",
      "left:12px",
      "display:flex",
      "flex-direction:column",
      "gap:8px",
      "padding:8px 10px",
      "background:rgba(12,16,26,0.82)",
      "border:1px solid rgba(255,255,255,0.12)",
      "border-radius:10px",
      "color:#dfe6f3",
      "font:13px/1.2 system-ui,sans-serif",
      "z-index:10",
      "user-select:none",
    ].join(";");

    // --- Row 1: transport controls -----------------------------------------
    const controls = this.makeRow();
    this.playBtn = this.makeButton("Play", () => {
      this.playing = !this.playing;
      this.playBtn.textContent = this.playing ? "Pause" : "Play";
      callbacks.onPlayPause(this.playing);
    });
    const stepBtn = this.makeButton("Step", () => callbacks.onStep());
    const resetBtn = this.makeButton("Reset", () => {
      this.playing = false;
      this.playBtn.textContent = "Play";
      callbacks.onReset();
    });
    this.tickLabel = document.createElement("span");
    this.tickLabel.style.cssText = "margin-left:4px;font-variant-numeric:tabular-nums;opacity:0.85";
    this.setTick(0);
    controls.append(this.playBtn, stepBtn, resetBtn, this.tickLabel);

    // --- Row 2: views ------------------------------------------------------
    const views = this.makeRow();
    const viewsLabel = document.createElement("span");
    viewsLabel.textContent = "Views";
    viewsLabel.style.cssText = "font-weight:600;opacity:0.7;margin-right:2px";
    views.append(viewsLabel);

    for (const option of VIEW_OPTIONS) {
      const btn = this.makeButton(option.label, () => {
        this.view = option.id;
        this.refreshViewButtons();
        callbacks.onSelectView(option.id);
      });
      this.viewButtons.set(option.id, btn);
      views.append(btn);
    }

    const divider = document.createElement("span");
    divider.style.cssText = "width:1px;align-self:stretch;background:rgba(255,255,255,0.15);margin:0 2px";
    views.append(divider);

    this.overlayBtn = this.makeButton("Icons: on", () => {
      this.overlayVisible = !this.overlayVisible;
      this.overlayBtn.textContent = `Icons: ${this.overlayVisible ? "on" : "off"}`;
      callbacks.onToggleOverlay(this.overlayVisible);
    });
    this.bordersBtn = this.makeButton("Borders: off", () => {
      this.bordersVisible = !this.bordersVisible;
      this.bordersBtn.textContent = `Borders: ${this.bordersVisible ? "on" : "off"}`;
      callbacks.onToggleBorders(this.bordersVisible);
    });
    views.append(this.overlayBtn, this.bordersBtn);

    this.root.append(controls, views);
    document.body.appendChild(this.root);
    this.refreshViewButtons();
  }

  setTick(tick: number): void {
    this.tickLabel.textContent = `tick ${tick}`;
  }

  private refreshViewButtons(): void {
    for (const [id, btn] of this.viewButtons) {
      const active = id === this.view;
      btn.style.background = active ? "#3355aa" : "#1d2740";
      btn.style.borderColor = active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)";
    }
  }

  private makeRow(): HTMLDivElement {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;align-items:center";
    return row;
  }

  private makeButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText = [
      "background:#1d2740",
      "color:#dfe6f3",
      "border:1px solid rgba(255,255,255,0.15)",
      "border-radius:7px",
      "padding:5px 10px",
      "cursor:pointer",
      "font:13px system-ui,sans-serif",
    ].join(";");
    btn.addEventListener("click", onClick);
    return btn;
  }
}

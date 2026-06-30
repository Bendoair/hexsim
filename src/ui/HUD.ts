export type ViewMode = "owners" | "points";

export interface HudCallbacks {
  onPlayPause: (playing: boolean) => void;
  onStep: () => void;
  onReset: () => void;
  onToggleView: (view: ViewMode) => void;
}

/**
 * HUD — minimal control bar: play/pause, step-once, reset, a tick counter and a
 * view toggle (ownership vs the points debug overlay). Pure DOM; it reports user
 * intent through callbacks and never touches sim state directly.
 */
export class HUD {
  private readonly root: HTMLDivElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly stepBtn: HTMLButtonElement;
  private readonly viewBtn: HTMLButtonElement;
  private readonly tickLabel: HTMLSpanElement;
  private playing = false;
  private view: ViewMode = "owners";

  constructor(callbacks: HudCallbacks) {
    this.root = document.createElement("div");
    this.root.style.cssText = [
      "position:fixed",
      "top:12px",
      "left:12px",
      "display:flex",
      "gap:8px",
      "align-items:center",
      "padding:8px 10px",
      "background:rgba(12,16,26,0.82)",
      "border:1px solid rgba(255,255,255,0.12)",
      "border-radius:10px",
      "color:#dfe6f3",
      "font:13px/1.2 system-ui,sans-serif",
      "z-index:10",
      "user-select:none",
    ].join(";");

    this.playBtn = this.makeButton("Play", () => {
      this.playing = !this.playing;
      this.playBtn.textContent = this.playing ? "Pause" : "Play";
      callbacks.onPlayPause(this.playing);
    });
    this.stepBtn = this.makeButton("Step", () => callbacks.onStep());
    const resetBtn = this.makeButton("Reset", () => {
      this.playing = false;
      this.playBtn.textContent = "Play";
      callbacks.onReset();
    });
    this.viewBtn = this.makeButton("View: owners", () => {
      this.view = this.view === "owners" ? "points" : "owners";
      this.viewBtn.textContent = `View: ${this.view}`;
      callbacks.onToggleView(this.view);
    });

    this.tickLabel = document.createElement("span");
    this.tickLabel.style.cssText = "margin-left:4px;font-variant-numeric:tabular-nums;opacity:0.85";
    this.setTick(0);

    this.root.append(this.playBtn, this.stepBtn, resetBtn, this.viewBtn, this.tickLabel);
    document.body.appendChild(this.root);
  }

  setTick(tick: number): void {
    this.tickLabel.textContent = `tick ${tick}`;
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

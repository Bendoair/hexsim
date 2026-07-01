import type { World } from "../core/World";
import type { BorderExchangeEvent } from "../sim/SimEvent";

const DISMISS_MS = 4000;

/**
 * ExchangeEventPopup — short-lived toast when kingdoms complete a bulk border
 * exchange. Pure DOM; matches HUD/ControlPanel styling. Queues multiple events
 * from the same tick and shows them sequentially.
 */
export class ExchangeEventPopup {
  private enabled = true;
  private readonly queue: Array<{ event: BorderExchangeEvent; world: World }> = [];
  private showing = false;
  private dismissTimer: number | null = null;
  private readonly host: HTMLDivElement;

  constructor() {
    this.host = document.createElement("div");
    this.host.style.cssText = [
      "position:fixed",
      "bottom:24px",
      "left:50%",
      "transform:translateX(-50%)",
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "gap:8px",
      "z-index:20",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(this.host);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  show(event: BorderExchangeEvent, world: World): void {
    if (!this.enabled) {
      return;
    }
    this.queue.push({ event, world });
    if (!this.showing) {
      this.showNext();
    }
  }

  private showNext(): void {
    const next = this.queue.shift();
    if (next === undefined) {
      this.showing = false;
      return;
    }
    this.showing = true;
    const toast = this.buildToast(next.event, next.world);
    this.host.appendChild(toast);

    if (this.dismissTimer !== null) {
      window.clearTimeout(this.dismissTimer);
    }
    this.dismissTimer = window.setTimeout(() => {
      toast.remove();
      this.dismissTimer = null;
      this.showNext();
    }, DISMISS_MS);
  }

  private clear(): void {
    this.queue.length = 0;
    this.host.replaceChildren();
    this.showing = false;
    if (this.dismissTimer !== null) {
      window.clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }

  private buildToast(event: BorderExchangeEvent, world: World): HTMLDivElement {
    const proposer = world.kingdomById(event.proposerId);
    const receiver = world.kingdomById(event.receiverId);
    const proposerLabel = proposer !== undefined ? `Kingdom ${proposer.id}` : `Kingdom ${event.proposerId}`;
    const receiverLabel = receiver !== undefined ? `Kingdom ${receiver.id}` : `Kingdom ${event.receiverId}`;

    const panel = document.createElement("div");
    panel.style.cssText = [
      "padding:10px 14px",
      "background:rgba(12,16,26,0.92)",
      "border:1px solid rgba(255,255,255,0.15)",
      "border-radius:10px",
      "color:#dfe6f3",
      "font:13px/1.35 system-ui,sans-serif",
      "box-shadow:0 8px 24px rgba(0,0,0,0.35)",
      "min-width:220px",
      "text-align:center",
    ].join(";");

    const title = document.createElement("div");
    title.textContent = "Border exchange";
    title.style.cssText = "font-weight:600;margin-bottom:6px";

    const body = document.createElement("div");
    body.style.cssText = "display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px";

    if (proposer !== undefined) {
      body.append(this.kingdomChip(proposerLabel, proposer.color));
    }
    const gainProposer = document.createElement("span");
    gainProposer.textContent = `+${event.tilesToProposer}`;
    gainProposer.style.cssText = "font-weight:600";

    if (event.tilesToReceiver > 0 && receiver !== undefined) {
      body.append(gainProposer, document.createTextNode("/"), this.kingdomChip(receiverLabel, receiver.color));
      const gainReceiver = document.createElement("span");
      gainReceiver.textContent = `+${event.tilesToReceiver}`;
      gainReceiver.style.cssText = "font-weight:600";
      body.append(gainReceiver);
    } else {
      body.append(gainProposer);
    }

    const sub = document.createElement("div");
    sub.textContent = event.forced ? "Forced" : "Accepted";
    sub.style.cssText = "margin-top:6px;opacity:0.75;font-size:12px";

    panel.append(title, body, sub);
    return panel;
  }

  private kingdomChip(label: string, color: { r: number; g: number; b: number }): HTMLSpanElement {
    const chip = document.createElement("span");
    chip.style.cssText = [
      "display:inline-flex",
      "align-items:center",
      "gap:6px",
      "padding:2px 8px",
      "border-radius:6px",
      "background:rgba(255,255,255,0.06)",
    ].join(";");

    const swatch = document.createElement("span");
    swatch.style.cssText = [
      "width:10px",
      "height:10px",
      "border-radius:2px",
      `background:rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)})`,
    ].join(";");

    const text = document.createElement("span");
    text.textContent = label;

    chip.append(swatch, text);
    return chip;
  }
}

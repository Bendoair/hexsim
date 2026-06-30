import { Feature } from "./Feature";

/**
 * Settlement — a secondary point source. While a capital anchors distance falloff,
 * a settlement just adds a flat per-tick bonus (config.settlementBonus) to its
 * tile, letting a kingdom reinforce a frontier. Purely additive.
 */
export class Settlement extends Feature {
  readonly kind = "settlement";
  constructor(readonly kingdomId: number) {
    super();
  }
}

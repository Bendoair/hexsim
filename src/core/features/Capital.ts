import { Feature } from "./Feature";

/** Capital — the founding tile of a kingdom. Distance falloff is measured from it. */
export class Capital extends Feature {
  readonly kind = "capital";
  constructor(readonly kingdomId: number) {
    super();
  }
}

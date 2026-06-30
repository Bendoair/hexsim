/**
 * Feature — an optional overlay attached to a Tile by composition (Tile has a
 * `feature` field). Capital now; Settlement later. Like terrain, features use a
 * small class hierarchy but are never mixed into Tile via subclassing.
 */
export type FeatureKind = "capital" | "settlement";

export abstract class Feature {
  abstract readonly kind: FeatureKind;
}

import { describe, expect, it } from "vitest";
import { HexGrid, type GlobeTopology } from "../core/HexGrid";
import { World } from "../core/World";
import { Simulation } from "./Simulation";
import { accumulationRule } from "./rules/accumulation";
import { hostilityRule } from "./rules/hostility";
import { createSpreadRule } from "./rules/spread";
import { mutationRule } from "./rules/mutation";
import { DEFAULT_CONFIG, type SimConfig } from "../config/SimConfig";

function lineTopology(n: number): GlobeTopology {
  const adjacency: number[][] = [];
  for (let i = 0; i < n; i++) {
    const neighbors: number[] = [];
    if (i > 0) neighbors.push(i - 1);
    if (i < n - 1) neighbors.push(i + 1);
    adjacency.push(neighbors);
  }
  return { faceCount: n, adjacency, isPentagon: new Array<boolean>(n).fill(false) };
}

function twoKingdomWorld(mutationChance: number): World {
  const config: SimConfig = {
    ...DEFAULT_CONFIG,
    mutationChance,
    world: { ...DEFAULT_CONFIG.world, seaFraction: 0 },
  };
  const world = new World(new HexGrid(lineTopology(21)), config);
  world.addCapital(0);
  world.addCapital(20);
  return world;
}

function rules() {
  return [accumulationRule, hostilityRule, createSpreadRule(), mutationRule];
}

const snapshot = (world: World): string => world.grid.tiles.map((t) => t.ownerId ?? "-").join(",");

describe("mutation", () => {
  it("freezes borders solid at mutationChance = 0", () => {
    const world = twoKingdomWorld(0);
    const sim = new Simulation(world, rules());
    while (sim.tick < 800) sim.step();
    const a = snapshot(world);
    while (sim.tick < 1200) sim.step();
    expect(snapshot(world)).toBe(a);
  });

  it("makes borders move with a small mutationChance", () => {
    const world = twoKingdomWorld(0.02);
    const sim = new Simulation(world, rules());
    while (sim.tick < 800) sim.step();
    const a = snapshot(world);
    let changed = false;
    for (let t = 0; t < 400; t++) {
      sim.step();
      if (snapshot(world) !== a) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
    // Both kingdoms still exist; mutation jostles the border, doesn't delete sides.
    expect(world.grid.tiles.some((t) => t.ownerId === 0)).toBe(true);
    expect(world.grid.tiles.some((t) => t.ownerId === 1)).toBe(true);
  });

  it("is deterministic under a fixed seed", () => {
    const run = (): string => {
      const world = twoKingdomWorld(0.02);
      const sim = new Simulation(world, rules());
      while (sim.tick < 500) sim.step();
      return snapshot(world);
    };
    expect(run()).toBe(run());
  });
});

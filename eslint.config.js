import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Layering guard: core/, sim/, and config/ are the engine-agnostic heart of the
 * project and MUST run headless (no Babylon, no DOM). The rules below fail lint
 * if anything under those folders imports Babylon or touches browser globals.
 */
const headlessNoBabylonDom = {
  files: ["src/core/**/*.ts", "src/sim/**/*.ts", "src/config/**/*.ts"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          { name: "babylonjs", message: "core/sim/config must not import Babylon." },
        ],
        patterns: [
          {
            group: ["@babylonjs/*", "babylonjs/*"],
            message: "core/sim/config must not import Babylon. Pass plain data in from render/.",
          },
        ],
      },
    ],
    "no-restricted-globals": [
      "error",
      { name: "window", message: "core/sim/config must not touch the DOM." },
      { name: "document", message: "core/sim/config must not touch the DOM." },
    ],
  },
};

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  headlessNoBabylonDom,
);

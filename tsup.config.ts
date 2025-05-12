import { defineConfig } from "tsup";
import type { Options, Format } from "tsup";

// Ensure that these option fields are not undefined
type MandatoryOptions = Options & {
  outDir: string;
  format: Format | Format[];
};

// Default config, used as a base template
const DEFAULT_CONFIG: Options = {
    clean: true, // clean up the dist folder
    dts: true, // generate dts files
    minify: true,
    entry: ["src/index.mts"],
    sourcemap: true,
    splitting: true,
    esbuildOptions(options, context) {
      if (context.format === 'cjs') {
        options.outdir = 'dist/cjs'
      } else if (context.format === 'esm') {
        options.outdir = 'dist/esm'
      }
    }
};

// Common.js config
const COMMON_CONFIG: MandatoryOptions = {
    ...DEFAULT_CONFIG,
    entry: ["src/index.mts"],
    format: "cjs",
    outDir: "dist/common",
  };
  
  // ESM config
  const ESM_CONFIG: MandatoryOptions = {
    ...DEFAULT_CONFIG,
    entry: ["src/**/*.mts"],
    format: "esm",
    outDir: "dist/esm",
  };
  
  export default defineConfig([COMMON_CONFIG, ESM_CONFIG]);
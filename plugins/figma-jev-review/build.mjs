import { build } from "esbuild";

const banner = [
  "#!/usr/bin/env node",
  "// This bundle ships as ESM, but bundled CommonJS dependencies (pngjs) call",
  "// require() for Node built-ins. Define a real require() so those calls",
  "// resolve instead of throwing at startup.",
  'import { createRequire as __codexCreateRequire } from "node:module";',
  "const require = __codexCreateRequire(import.meta.url);",
].join("\n");

await build({
  entryPoints: ["./src/server.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  charset: "utf8",
  outfile: "./dist/server.js",
  banner: { js: banner },
});

console.log("built dist/server.js");
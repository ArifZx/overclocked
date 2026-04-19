import { defineConfig } from "vite-plus";
import { replacePlugin } from "rolldown/plugins";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      phaser: path.resolve(__dirname, "node_modules/phaser/src/phaser-esm.js"),
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
  build: {
    minify: true,
    rolldownOptions: {
      treeshake: true,
      plugins: [
        replacePlugin({
          "typeof CANVAS_RENDERER": JSON.stringify(true),
          "typeof WEBGL_RENDERER": JSON.stringify(true),
          "typeof WEBGL_DEBUG": JSON.stringify(false),
          "typeof EXPERIMENTAL": JSON.stringify(false),
          "typeof PLUGIN_3D": JSON.stringify(false),
          "typeof PLUGIN_CAMERA3D": JSON.stringify(false),
          "typeof PLUGIN_FBINSTANT": JSON.stringify(false),
          "typeof FEATURE_SOUND": JSON.stringify(true),
          "export const Physics = require('./physics')":
            "export const Physics = { Arcade: {}, Matter: {} }",
        }),
      ],
    },
  },
});

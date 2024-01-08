import { defineConfig } from "vite";
import dsv from "@rollup/plugin-dsv";

export default defineConfig({
  plugins: [],
  assetsInclude: ["**/*.png", "**/*.jpe?g", "**/*.svg"],
});

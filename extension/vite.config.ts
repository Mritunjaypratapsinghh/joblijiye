import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/popup.html"),
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  plugins: [
    {
      name: "copy-files",
      closeBundle() {
        // Copy manifest
        copyFileSync("public/manifest.json", "dist/manifest.json");
        // Copy content CSS
        copyFileSync("src/content.css", "dist/content.css");
        // Rename popup html
        if (existsSync("dist/src/popup/popup.html")) {
          copyFileSync("dist/src/popup/popup.html", "dist/popup.html");
        }
      },
    },
  ],
});

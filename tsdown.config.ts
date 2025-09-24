import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["./src/index.ts", "./src/app.ts", "./src/models/childProfile.ts"],
	sourcemap: true,
	outDir: "dist",
});

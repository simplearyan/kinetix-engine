import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
    plugins: [
        dts({
            insertTypesEntry: true,
        }),
    ],
    build: {
        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: resolve(__dirname, "src/index.ts"),
            name: "KinetixCore",
            // the proper extensions will be added
            fileName: "index",
        },
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: ["mediabunny", "webm-muxer"],
            output: {
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                    mediabunny: "MediaBunny",
                    "webm-muxer": "WebMMuxer",
                },
            },
        },
    },
});

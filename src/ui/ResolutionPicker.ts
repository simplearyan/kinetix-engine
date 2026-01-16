import { Engine } from "../core/Engine";

export class ResolutionPicker {
    container: HTMLElement;
    engine: Engine;

    constructor(engine: Engine, container: HTMLElement) {
        this.engine = engine;
        this.container = container;
        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Canvas resolution
            </h2>
            <div class="space-y-4">
                <div>
                    <label class="text-xs text-gray-500 block mb-1">Preset</label>
                    <select id="kp-canvas-preset" class="w-full bg-gray-800 text-white text-xs rounded p-2 border border-gray-700 outline-none focus:border-blue-500 transition-colors">
                        <option value="1920x1080" selected>YouTube (1920x1080)</option>
                        <option value="1280x720">HD (1280x720)</option>
                        <option value="3840x2160">4K (3840x2160)</option>
                        <option value="1080x1920">Shorts/TikTok (1080x1920)</option>
                        <option value="1080x1080">Square (1080x1080)</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs text-gray-500 block mb-1">Width</label>
                        <input type="number" id="kp-canvas-width" value="1920" class="w-full bg-gray-800 text-white text-xs rounded p-2 border border-gray-700 font-mono outline-none focus:border-blue-500 transition-colors" />
                    </div>
                    <div>
                        <label class="text-xs text-gray-500 block mb-1">Height</label>
                        <input type="number" id="kp-canvas-height" value="1080" class="w-full bg-gray-800 text-white text-xs rounded p-2 border border-gray-700 font-mono outline-none focus:border-blue-500 transition-colors" />
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const presetSelect = this.container.querySelector("#kp-canvas-preset") as HTMLSelectElement;
        const widthInput = this.container.querySelector("#kp-canvas-width") as HTMLInputElement;
        const heightInput = this.container.querySelector("#kp-canvas-height") as HTMLInputElement;

        const setResolution = (w: number, h: number) => {
            widthInput.value = w.toString();
            heightInput.value = h.toString();
            this.engine.resize(w, h);
        };

        presetSelect.addEventListener("change", () => {
            const val = presetSelect.value;
            if (val === "custom") return;
            const [w, h] = val.split("x").map(Number);
            setResolution(w, h);
        });

        const onCustomChange = () => {
            presetSelect.value = "custom";
            const w = parseInt(widthInput.value) || 1920;
            const h = parseInt(heightInput.value) || 1080;
            this.engine.resize(w, h);
        };

        widthInput.addEventListener("change", onCustomChange);
        heightInput.addEventListener("change", onCustomChange);

        // Initial sync
        setResolution(1920, 1080);
    }
}

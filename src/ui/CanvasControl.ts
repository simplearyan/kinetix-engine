import { Engine } from "../core/Core";

export class CanvasControl {
    container: HTMLElement;
    engine: Engine;

    // Internal State
    private activeRatio: string = "16:9";
    private exportHeight: number = 1080;
    private resizeMode: 'fit' | 'cover' | 'stretch' | 'center' = 'fit';

    constructor(engine: Engine, container: HTMLElement) {
        this.engine = engine;
        this.container = container;
        this.render();
        this.bindEvents();
        this.setupSyncListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="space-y-6">
                <!-- Aspect Ratio Section -->
                <div>
                    <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Aspect Ratio</h2>
                    <div class="grid grid-cols-4 gap-2" id="kp-ratio-grid">
                        <button data-ratio="16:9" class="p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-transparent transition-all">16:9</button>
                        <button data-ratio="9:16" class="p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-transparent transition-all">9:16</button>
                        <button data-ratio="1:1" class="p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-transparent transition-all">1:1</button>
                        <button data-ratio="4:3" class="p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-transparent transition-all">4:3</button>
                        <button data-ratio="3:4" class="p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-transparent transition-all">3:4</button>
                        <button data-ratio="4:5" class="p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-transparent transition-all">4:5</button>
                        <button data-ratio="21:9" class="p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-transparent transition-all">21:9</button>
                        <button data-ratio="custom" class="p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-transparent transition-all">Custom</button>
                    </div>
                </div>

                <!-- Resize Mode -->
                <div>
                     <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Resize Mode</h2>
                     <select id="kp-resize-mode" class="w-full bg-[#1e1e1e] text-white text-sm rounded p-2 border border-gray-700 outline-none focus:border-blue-500 transition-colors">
                        <option value="fit" selected>Fit (Contain)</option>
                        <option value="cover">Cover (Fill)</option>
                        <option value="stretch">Stretch</option>
                        <option value="center">Center</option>
                     </select>
                </div>

                <!-- Dimensions Input (Collapsible/Visible) -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] text-gray-500 block mb-1 uppercase">Width</label>
                        <input type="number" id="kp-canvas-width" value="1920" class="w-full bg-[#1e1e1e] text-white text-sm rounded p-2 border border-gray-700 font-mono outline-none focus:border-blue-500 transition-colors" />
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-500 block mb-1 uppercase">Height</label>
                        <input type="number" id="kp-canvas-height" value="1080" class="w-full bg-[#1e1e1e] text-white text-sm rounded p-2 border border-gray-700 font-mono outline-none focus:border-blue-500 transition-colors" />
                    </div>
                </div>

                <!-- Export Resolution Sync Section -->
                <div>
                    <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Export Target</h2>
                    <div class="flex gap-2" id="kp-export-res-grid">
                        <button data-res="720" class="flex-1 p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-transparent transition-all">720p</button>
                        <button data-res="1080" class="flex-1 p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-transparent transition-all">1080p</button>
                        <button data-res="2160" class="flex-1 p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-transparent transition-all">4K</button>
                    </div>
                </div>

                <!-- Duration Section -->
                <div>
                    <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Duration</h2>
                    <div class="relative">
                        <input type="number" id="kp-canvas-duration" value="30" class="w-full bg-[#1e1e1e] text-white text-sm rounded p-2 border border-gray-700 font-mono outline-none focus:border-blue-500 transition-colors pl-3" />
                        <span class="absolute right-3 top-2 text-xs text-gray-500">seconds</span>
                    </div>
                </div>

                <!-- Background Section -->
                <div>
                    <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Background</h2>
                    <div class="flex items-center gap-3">
                         <div class="relative w-10 h-10 rounded-lg overflow-hidden ring-2 ring-gray-700 hover:ring-gray-500 transition-all">
                            <input type="color" id="kp-canvas-bgcolor" value="#292929" class="absolute -top-2 -left-2 w-16 h-16 cursor-pointer border-none p-0" />
                         </div>
                         <div class="flex flex-col">
                             <span class="text-xs text-gray-400">Color Hex</span>
                             <span id="kp-bgcolor-value" class="text-sm font-mono text-white">#292929</span>
                         </div>
                    </div>
                </div>
            </div>
        `;

        this.updateUI();
    }

    private updateUI() {
        // Update Aspect Ratio Buttons
        const ratioBtns = this.container.querySelectorAll("#kp-ratio-grid button");
        ratioBtns.forEach(btn => {
            const r = (btn as HTMLElement).dataset.ratio;
            if (r === this.activeRatio) {
                btn.className = "p-2 rounded bg-blue-600 text-white font-semibold text-xs border border-blue-400 shadow-sm transition-all";
            } else {
                btn.className = "p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-400 border border-gray-700 transition-all";
            }
        });

        // Update Export Resolution Buttons
        const resBtns = this.container.querySelectorAll("#kp-export-res-grid button");
        resBtns.forEach(btn => {
            const h = parseInt((btn as HTMLElement).dataset.res || "0");
            if (h === this.exportHeight) {
                btn.className = "flex-1 p-2 rounded bg-indigo-600 text-white font-semibold text-xs border border-indigo-400 shadow-sm transition-all";
            } else {
                btn.className = "flex-1 p-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-400 border border-gray-700 transition-all";
            }
        });
    }

    bindEvents() {
        const widthInput = this.container.querySelector("#kp-canvas-width") as HTMLInputElement;
        const heightInput = this.container.querySelector("#kp-canvas-height") as HTMLInputElement;
        const resizeModeSelect = this.container.querySelector("#kp-resize-mode") as HTMLSelectElement;
        const durationInput = this.container.querySelector("#kp-canvas-duration") as HTMLInputElement;
        const bgColorInput = this.container.querySelector("#kp-canvas-bgcolor") as HTMLInputElement;
        const bgColorText = this.container.querySelector("#kp-bgcolor-value") as HTMLElement;

        // Resize Mode
        if (resizeModeSelect) {
            resizeModeSelect.addEventListener("change", (e) => {
                this.resizeMode = (e.target as HTMLSelectElement).value as any;
                // Optionally trigger a resize with current dims to re-apply logic?
                // But logic depends on prev dims. Re-applying to same dims does nothing.
                // User must change dims to see effect, OR we force a "refresh"?
                // For now, just update state.
            });
        }

        // Aspect Ratio Grid
        const ratioBtns = this.container.querySelectorAll("#kp-ratio-grid button");
        ratioBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const ratio = (btn as HTMLElement).dataset.ratio || "custom";
                this.activeRatio = ratio;

                if (ratio !== "custom") {
                    const [wRatio, hRatio] = ratio.split(":").map(Number);
                    const base = 1080; // Standard base
                    let w, h;

                    if (wRatio >= hRatio) {
                        // Landscape
                        h = base;
                        w = Math.round(h * (wRatio / hRatio));
                    } else {
                        // Portrait/Vertical
                        w = base;
                        h = Math.round(w * (hRatio / wRatio));
                    }

                    // Update Inputs
                    widthInput.value = w.toString();
                    heightInput.value = h.toString();

                    // Update Engine
                    this.engine.resize(w, h, this.resizeMode);
                }

                this.updateUI();
            });
        });

        // Dimensions Inputs (Manual)
        const onDimChange = () => {
            this.activeRatio = "custom";
            const w = parseInt(widthInput.value) || 100;
            const h = parseInt(heightInput.value) || 100;
            this.engine.resize(w, h, this.resizeMode);
            this.updateUI();
        };
        widthInput.addEventListener("change", onDimChange);
        heightInput.addEventListener("change", onDimChange);

        // Export Resolution Grid
        const resBtns = this.container.querySelectorAll("#kp-export-res-grid button");
        resBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const h = parseInt((btn as HTMLElement).dataset.res || "1080");
                this.exportHeight = h;
                this.updateUI();

                // Dispatch Sync Event
                window.dispatchEvent(new CustomEvent("kinetix:export-settings-change", {
                    detail: { height: h }
                }));
            });
        });

        // Duration
        durationInput.addEventListener("change", () => {
            const ms = (parseFloat(durationInput.value) || 10) * 1000;
            this.engine.totalDuration = ms;
            if (this.engine.onDurationChange) this.engine.onDurationChange(ms);
        });

        // Background
        const updateBackground = (color: string) => {
            bgColorText.innerText = color;
            this.engine.scene.backgroundColor = color;
            this.engine.canvas.style.backgroundColor = color;
            if (this.engine.scene.onUpdate) this.engine.scene.onUpdate();
        };
        bgColorInput.addEventListener("input", (e) => updateBackground((e.target as HTMLInputElement).value));

        // Initial Defaults
        this.engine.resize(1920, 1080, 'fit');
    }

    // Sync Listener: If ExportControl changes the resolution, update this UI
    setupSyncListeners() {
        window.addEventListener("kinetix:export-settings-change", (e: any) => {
            if (e.detail && e.detail.height) {
                if (this.exportHeight !== e.detail.height) {
                    this.exportHeight = e.detail.height;
                    this.updateUI();
                }
            }
        });
    }
}

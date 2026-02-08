import { Engine } from "../core/Core";

export class ExportControl {
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
                Export
            </h2>
            <p class="text-xs text-gray-500 mb-4">
                Export your scene as a video file.
            </p>

            <div class="space-y-4 mb-6">
                <!-- Resolution -->
                <div>
                    <label class="text-xs text-gray-400 block mb-1">Resolution</label>
                    <select id="kp-export-resolution" class="w-full bg-gray-800 text-white text-xs rounded p-2 border border-gray-700 outline-none focus:border-indigo-500 transition-colors">
                        <option value="720">720p</option>
                        <option value="1080" selected>1080p</option>
                        <option value="2160">4K</option>
                    </select>
                </div>

                <!-- Format -->
                <div>
                    <label class="text-xs text-gray-400 block mb-1">Format</label>
                    <select id="kp-export-format" class="w-full bg-gray-800 text-white text-xs rounded p-2 border border-gray-700 outline-none focus:border-indigo-500 transition-colors">
                        <option value="mp4" selected>MP4 (H.264)</option>
                        <option value="webm">WebM (VP9)</option>
                        <option value="mov">MOV (QuickTime)</option>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <!-- FPS -->
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">Frame Rate</label>
                        <select id="kp-export-fps" class="w-full bg-gray-800 text-white text-xs rounded p-2 border border-gray-700 outline-none focus:border-indigo-500 transition-colors">
                            <option value="24">24 FPS</option>
                            <option value="30" selected>30 FPS</option>
                            <option value="60">60 FPS</option>
                        </select>
                    </div>

                    <!-- Mode -->
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">Render Mode</label>
                        <select id="kp-export-mode" class="w-full bg-gray-800 text-white text-xs rounded p-2 border border-gray-700 outline-none focus:border-indigo-500 transition-colors">
                            <option value="offline" selected>High Quality (Slow)</option>
                            <option value="realtime">Realtime (Fast)</option>
                        </select>
                    </div>
                </div>

                <!-- Duration -->
                <div>
                    <label class="text-xs text-gray-400 block mb-1">Duration (seconds)</label>
                    <input type="number" id="kp-export-duration" class="w-full bg-gray-800 text-white text-xs rounded p-2 border border-gray-700 outline-none focus:border-indigo-500 transition-colors" placeholder="Max" />
                </div>
                
                <div id="kp-export-error" class="hidden text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20"></div>
            </div>
            
            <button id="kp-btn-export" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-lg font-semibold transition flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/20">
                <span>Export Video</span>
            </button>
            
            <!-- Progress -->
            <div id="kp-export-progress-container" class="hidden mt-4">
                <div class="flex justify-between text-xs text-gray-400 mb-1">
                    <span id="kp-export-status">Rendering...</span>
                    <span id="kp-export-percent">0%</span>
                </div>
                <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div id="kp-export-bar" class="h-full bg-indigo-500 w-0 transition-all duration-300"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const btn = this.container.querySelector("#kp-btn-export") as HTMLButtonElement;
        const progressContainer = this.container.querySelector("#kp-export-progress-container") as HTMLDivElement;
        const progressBar = this.container.querySelector("#kp-export-bar") as HTMLDivElement;
        const percentLabel = this.container.querySelector("#kp-export-percent") as HTMLElement;
        const statusLabel = this.container.querySelector("#kp-export-status") as HTMLElement;
        const errorMsg = this.container.querySelector("#kp-export-error") as HTMLDivElement;

        // Inputs
        const resSelect = this.container.querySelector("#kp-export-resolution") as HTMLSelectElement;
        const formatSelect = this.container.querySelector("#kp-export-format") as HTMLSelectElement;
        const fpsSelect = this.container.querySelector("#kp-export-fps") as HTMLSelectElement;
        const modeSelect = this.container.querySelector("#kp-export-mode") as HTMLSelectElement;
        const durInput = this.container.querySelector("#kp-export-duration") as HTMLInputElement;

        // Default duration to engine total duration (in seconds)
        durInput.value = (this.engine.totalDuration / 1000).toString();

        // --- Sync Logic ---
        // 1. Listen for external changes (from CanvasControl)
        window.addEventListener("kinetix:export-settings-change", (e: any) => {
            if (e.detail && e.detail.height) {
                resSelect.value = e.detail.height.toString();
            }
        });

        // 2. Dispatch changes when user selects here
        resSelect.addEventListener("change", () => {
            const h = parseInt(resSelect.value);
            window.dispatchEvent(new CustomEvent("kinetix:export-settings-change", {
                detail: { height: h }
            }));
        });

        btn.addEventListener("click", async () => {
            errorMsg.classList.add("hidden");

            const height = parseInt(resSelect.value);
            const durationSec = parseFloat(durInput.value);
            const durationMs = durationSec * 1000;
            const format = formatSelect.value as 'mp4' | 'webm' | 'mov';
            const fps = parseInt(fpsSelect.value);
            const mode = modeSelect.value as 'offline' | 'realtime';

            // Validation
            if (isNaN(durationMs) || durationMs <= 0) {
                errorMsg.innerText = "Invalid duration.";
                errorMsg.classList.remove("hidden");
                return;
            }

            if (durationMs > this.engine.totalDuration) {
                errorMsg.innerText = `Duration cannot exceed canvas duration (${this.engine.totalDuration / 1000}s).`;
                errorMsg.classList.remove("hidden");
                return;
            }

            const currentAspect = this.engine.scene.width / this.engine.scene.height;
            const width = Math.round(height * currentAspect);

            // UI State: Rendering
            btn.innerHTML = "<span>Processing...</span>";
            btn.disabled = true;
            btn.classList.add("opacity-75", "cursor-not-allowed");
            progressContainer.classList.remove("hidden");
            statusLabel.innerText = mode === 'offline' ? "Rendering Frame by Frame..." : "Capturing Stream...";

            try {
                const blob = await this.engine.exportVideo(
                    durationMs,
                    fps,
                    mode,
                    (percent) => {
                        const p = Math.round(percent);
                        progressBar.style.width = p + "%";
                        percentLabel.innerText = p + "%";

                        if (p >= 100) {
                            statusLabel.innerText = "Encoding...";
                        }
                    },
                    undefined,
                    "mediabunny", // Always use new worker for consistency
                    format,
                    undefined,
                    { width, height }
                );

                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `kinetix-export-${width}x${height}.${format}`;
                a.click();
            } catch (e) {
                errorMsg.innerText = "Export failed: " + e;
                errorMsg.classList.remove("hidden");
                console.error(e);
            } finally {
                btn.innerHTML = "<span>Export Video</span>";
                btn.disabled = false;
                btn.classList.remove("opacity-75", "cursor-not-allowed");

                setTimeout(() => {
                    progressContainer.classList.add("hidden");
                    progressBar.style.width = "0%";
                    percentLabel.innerText = "0%";
                }, 2000);
            }
        });
    }
}


import { Engine } from "../../src/core/Core";
import { RichTextObject } from "../../src/objects/RichTextObject";
import { ChartObject } from "../../src/objects/ChartObject";
import { InspectorPanel } from "../../src/ui/InspectorPanel";

// @ts-ignore
const WebFont = window.WebFont;

// Logger
const debugLogs = document.getElementById("debug-logs");
const debugConsole = document.getElementById("debug-console");
function log(msg: string) {
    console.log(`[App] ${msg}`);
    if (debugLogs) {
        const entry = document.createElement("div");
        entry.textContent = `> ${msg}`;
        debugLogs.appendChild(entry);
        debugLogs.scrollTop = debugLogs.scrollHeight;
    }
}

log("Initializing Titles Editor...");

const canvas = document.getElementById(
    "editor-canvas",
) as HTMLCanvasElement;
if (!canvas) {
    log("CRITICAL: Canvas element not found!");
    throw new Error("Canvas not found");
}
const engine = new Engine(canvas);

// Default 9:16
engine.resize(1080, 1920);
log("Engine resized to 9:16");

// UI Sync
engine.onSelectionChange = (id) => {
    log(`Selection Changed: ${id}`);
    if (id) {
        document
            .getElementById("no-selection-msg")
            ?.classList.add("hidden");
    } else {
        document
            .getElementById("no-selection-msg")
            ?.classList.remove("hidden");
        const inspectorContainer = document.getElementById(
            "inspector-container",
        );
        if (inspectorContainer) inspectorContainer.innerHTML = "";
    }
};

// Time Update for Timeline
const timeDisplay = document.getElementById("time-display");
const playhead = document.getElementById("playhead");

const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60)
        .toString()
        .padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
};

engine.onTimeUpdate = (time) => {
    if (timeDisplay) {
        timeDisplay.innerText = `${formatTime(time)} / ${formatTime(engine.totalDuration)}`;
    }
    if (playhead) {
        const pct = (time / engine.totalDuration) * 100;
        playhead.style.width = `${pct}%`;
    }
};
engine.onTimeUpdate(0);

// Timeline Drag Logic
const timelineContainer = playhead?.parentElement;
if (timelineContainer && playhead) {
    let isDragging = false;
    let wasPlaying = false;

    const updateTime = (e: PointerEvent) => {
        const rect = timelineContainer.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const pct = x / rect.width;
        const time = pct * engine.totalDuration;

        engine.seek(time);
        // Manually update UI for responsiveness during drag
        playhead.style.width = `${pct * 100}%`;
        if (timeDisplay)
            timeDisplay.innerText = `${formatTime(time)} / ${formatTime(engine.totalDuration)}`;
    };

    timelineContainer.addEventListener("pointerdown", (e) => {
        isDragging = true;
        wasPlaying = engine.isPlaying;
        engine.pause();
        timelineContainer.setPointerCapture(e.pointerId);
        updateTime(e);
        timelineContainer.style.cursor = "grabbing";
    });

    timelineContainer.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        updateTime(e);
    });

    timelineContainer.addEventListener("pointerup", (e) => {
        if (!isDragging) return;
        isDragging = false;
        timelineContainer.releasePointerCapture(e.pointerId);
        timelineContainer.style.cursor = "pointer";
        if (wasPlaying) engine.play();
    });
}

const inspectorContainer = document.getElementById("inspector-container");
if (!inspectorContainer) {
    log("CRITICAL: Inspector container not found!");
} else {
    const inspector = new InspectorPanel(
        engine,
        inspectorContainer as HTMLElement,
        {
            // App Theme Integration
            containerClass:
                "p-4 space-y-4 overflow-y-auto h-full scrollbar-thin",
            headerClass:
                "font-bold text-gray-200 text-sm mb-4 pb-2 border-b border-app-border",
            labelClass:
                "text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1 block",
            inputClass:
                "w-full bg-app-bg text-gray-200 text-xs rounded-lg p-2 border border-app-border focus:border-primary outline-none transition-colors",
            selectClass:
                "w-full bg-app-bg text-gray-200 text-xs rounded-lg p-2 border border-app-border focus:border-primary outline-none appearance-none",
            checkboxClass:
                "w-4 h-4 rounded border-app-border bg-app-bg text-primary focus:ring-primary rounded cursor-pointer",
            fieldWrapperClass: "mb-4",
        },
    );
    log("Inspector initialized");
    (window as any).inspector = inspector;
}

// Initial Object
const title = new RichTextObject("title_1", "CREATE\nTITLES");
title.fontSize = 120;
title.fontFamily = "Oswald";
title.backgroundColor = "#000000";
title.color = "#ffffff";
title.textAlign = "center";
title.width = 800;
title.x = (1080 - 800) / 2;
title.y = 800;
engine.scene.add(title);
engine.render();
// Font Loading (Optimistic)
const fontSelect = document.getElementById(
    "google-font-select",
) as HTMLSelectElement;
if (fontSelect) {
    fontSelect.addEventListener("change", (e) => {
        const fontName = (e.target as HTMLSelectElement).value;
        if (!fontName) return;
        log(`Loading Font: ${fontName}`);

        // 1. Optimistic Update
        const selected = engine.interaction.selectedObjectId
            ? engine.scene.get(engine.interaction.selectedObjectId)
            : null;
        if (selected && selected instanceof RichTextObject) {
            selected.fontFamily = fontName;
            (selected as any)._layout = null;
            (window as any).inspector?.refresh();
            engine.render();
            log(`Optimistically set font to ${fontName}`);
        }

        // 2. Load Font
        if (WebFont) {
            WebFont.load({
                google: {
                    families: [fontName],
                    text: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?",
                },
                active: () => {
                    log(`Font Loaded: ${fontName}`);
                    if (selected && selected instanceof RichTextObject) {
                        (selected as any)._layout = null;
                        engine.render();
                    }
                },
            });
        }
    });
}

// Debug Toggle
document
    .getElementById("btn-debug-toggle")
    ?.addEventListener("click", () => {
        debugConsole?.classList.toggle("hidden");
        log("Debug Console Toggled");
    });

// Play/Pause
const btnPlay = document.getElementById("btn-play");
btnPlay?.addEventListener("click", () => {
    if (engine.isPlaying) {
        engine.pause();
        btnPlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`; // Play
    } else {
        engine.play();
        btnPlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`; // Pause
    }
});

// Loop Toggle
const btnLoop = document.getElementById("btn-loop-toggle");
btnLoop?.addEventListener("click", () => {
    engine.isLooping = !engine.isLooping;
    btnLoop.classList.toggle("text-primary-light");
    btnLoop.classList.toggle("text-gray-500");
    log(`Looping: ${engine.isLooping}`);
});

// --- Export Logic ---
const btnExport = document.getElementById("btn-export");
const exportModal = document.getElementById("export-modal");
const btnExportClose = document.getElementById("btn-export-close");
const btnStartExport = document.getElementById("btn-start-export");
const formatBtns = document.querySelectorAll(".format-btn");
const formatInput = document.getElementById(
    "export-format",
) as HTMLInputElement;
const fpsSelect = document.getElementById(
    "export-fps",
) as HTMLSelectElement;
const progressContainer = document.getElementById(
    "export-progress-container",
);
const progressBar = document.getElementById("export-progress-bar");
const progressLabel = document.getElementById("export-percent");
const statusLabel = document.getElementById("export-status");

// Open Modal
btnExport?.addEventListener("click", () => {
    exportModal?.classList.remove("hidden");
    // Reset UI
    if (progressContainer) progressContainer.classList.add("hidden");
    if (btnStartExport) {
        btnStartExport.removeAttribute("disabled");
        btnStartExport.innerHTML = "<span>Start Export</span>";
        btnStartExport.classList.remove("opacity-50", "cursor-not-allowed");
    }
});

// Close Modal
btnExportClose?.addEventListener("click", () => {
    exportModal?.classList.add("hidden");
});

// Format Selection
formatBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        // Remove active from all
        formatBtns.forEach((b) => {
            b.classList.remove(
                "active",
                "bg-blue-600",
                "text-white",
                "border-blue-500",
            );
            b.classList.add(
                "bg-gray-800",
                "text-gray-400",
                "border-gray-700",
            );
        });
        // Add active to click
        btn.classList.add(
            "active",
            "bg-blue-600",
            "text-white",
            "border-blue-500",
        );
        btn.classList.remove(
            "bg-gray-800",
            "text-gray-400",
            "border-gray-700",
        );

        if (formatInput)
            formatInput.value = btn.getAttribute("data-value") || "mp4";
    });
});

// Start Export
btnStartExport?.addEventListener("click", async () => {
    if (!engine) return;

    const format = (formatInput?.value || "mp4") as "mp4" | "webm";
    const fps = parseInt(fpsSelect?.value || "60");
    const duration = engine.totalDuration;

    // UI State
    btnStartExport.setAttribute("disabled", "true");
    btnStartExport.innerHTML = `<span>Processing...</span>`;
    btnStartExport.classList.add("opacity-50", "cursor-not-allowed");
    progressContainer?.classList.remove("hidden");

    try {
        const blob = await engine.exportVideo(
            duration,
            fps,
            "offline", // Always use offline for best quality
            (pct) => {
                if (progressBar) progressBar.style.width = `${pct}%`;
                if (progressLabel) progressLabel.innerText = `${pct}%`;
                if (statusLabel)
                    statusLabel.innerText =
                        pct < 100 ? "Rendering..." : "Encoding...";
            },
            undefined, // signal
            "mediabunny", // Use Worker
            format,
            (msg) => console.log(msg), // onLog
            { width: 1080, height: 1920 }, // Default for now, or fetch from aspect ratio logic if complex
        );

        // Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kinetix-title.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Close after short delay
        setTimeout(() => {
            exportModal?.classList.add("hidden");
        }, 1000);
    } catch (e) {
        console.error("Export failed:", e);
        alert("Export failed. See console.");
    } finally {
        btnStartExport.removeAttribute("disabled");
        btnStartExport.innerHTML = "<span>Start Export</span>";
        btnStartExport.classList.remove("opacity-50", "cursor-not-allowed");
    }
});

// Aspect Ratio
const aspectSelect = document.getElementById(
    "setting-aspect-ratio",
) as HTMLSelectElement;
const canvasContainer = document.getElementById(
    "canvas-container",
) as HTMLElement;
const resolutionDisplay = document.getElementById(
    "setting-resolution-display",
);

if (aspectSelect) {
    aspectSelect.addEventListener("change", (e) => {
        const ratio = (e.target as HTMLSelectElement).value;
        log(`Aspect Ratio changed to ${ratio}`);
        let width = 1080;
        let height = 1920;

        switch (ratio) {
            case "9:16":
                width = 1080;
                height = 1920;
                break;
            case "16:9":
                width = 1920;
                height = 1080;
                break;
            case "4:5":
                width = 1080;
                height = 1350;
                break;
            case "1:1":
                width = 1080;
                height = 1080;
                break;
        }
        canvasContainer.style.aspectRatio = ratio.replace(":", "/");
        engine.resize(width, height);
        if (resolutionDisplay)
            resolutionDisplay.innerText = `${width} x ${height}`;
    });
}

// Settings: BG Color
const bgColorInput = document.getElementById(
    "setting-bg-color",
) as HTMLInputElement;
if (bgColorInput) {
    bgColorInput.addEventListener("input", (e) => {
        const color = (e.target as HTMLInputElement).value;
        canvasContainer.style.backgroundColor = color;
        log("Canvas Background updated");
    });
}

// Settings: Duration
const durationInput = document.getElementById(
    "setting-duration",
) as HTMLInputElement;
if (durationInput) {
    durationInput.addEventListener("change", (e) => {
        const seconds = parseFloat((e.target as HTMLInputElement).value);
        if (!isNaN(seconds) && seconds > 0) {
            engine.setTotalDuration(seconds * 1000);
            log(`Total Duration set to ${seconds}s`);
            engine.onTimeUpdate?.(engine.currentTime);
        }
    });
}

// Preset Logic
document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
        const preset = (e.currentTarget as HTMLElement).dataset.preset;
        log(`Applying Preset: ${preset}`);
        const selected = engine.interaction.selectedObjectId
            ? engine.scene.get(engine.interaction.selectedObjectId)
            : null;
        if (selected && selected instanceof RichTextObject) {
            if (preset === "highlight") {
                selected.color = "#000000";
                selected.backgroundColor = "#FACC15";
                selected.animation = {
                    type: "slideUp",
                    duration: 800,
                    delay: 0,
                };
                (selected as any)._layout = null;
            } else if (preset === "typewriter") {
                selected.color = "#ffffff";
                selected.backgroundColor = "";
                selected.animation = {
                    type: "typewriter",
                    duration: 1500,
                    delay: 0,
                };
                (selected as any)._layout = null;
            } else if (preset === "fadeUp") {
                selected.animation = {
                    type: "fadeIn",
                    duration: 1000,
                    delay: 0,
                };
            }
            (window as any).inspector?.refresh();
        } else {
            log("No RichTextObject selected");
        }
    });
});

// Tab Switching
const tabButtons = document.querySelectorAll("#inspector-tabs button");
const tabContents = document.querySelectorAll(".inspector-tab-content");
tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const target = (btn as HTMLElement).dataset.tab;
        if (!target) return;
        tabButtons.forEach((b) => {
            b.classList.remove(
                "text-primary-light",
                "border-b-2",
                "border-primary",
                "bg-app-surface",
            );
            b.classList.add("text-gray-400");
        });
        btn.classList.remove("text-gray-400");
        btn.classList.add(
            "text-primary-light",
            "border-b-2",
            "border-primary",
            "bg-app-surface",
        );
        tabContents.forEach((content) => {
            content.classList.add("hidden");
            if (content.id === `tab-${target}`)
                content.classList.remove("hidden");
        });
    });
});

// Add Object Logic
document.getElementById("add-title")?.addEventListener("click", () => {
    const obj = new RichTextObject(`text_${Date.now()}`, "NEW TITLE");
    obj.fontSize = 80;
    obj.x = 100;
    obj.y = 500;
    engine.scene.add(obj);
    engine.interaction.selectObject(obj.id);
});
document.getElementById("add-subtitle")?.addEventListener("click", () => {
    const obj = new RichTextObject(
        `text_${Date.now()}`,
        "Subtitle text goes here",
    );
    obj.fontSize = 40;
    obj.fontWeight = "normal";
    obj.x = 100;
    obj.y = 800;
    engine.scene.add(obj);
    engine.interaction.selectObject(obj.id);
});
document.getElementById("add-chart")?.addEventListener("click", () => {
    const obj = new ChartObject(`chart_${Date.now()}`);
    obj.width = 800;
    obj.height = 600;
    obj.x = (engine.canvas.width - 800) / 2;
    obj.y = engine.canvas.height / 2;
    obj.color = "#6366f1";
    obj.textColor = "#ffffff";
    obj.axisColor = "#475569";
    engine.scene.add(obj);
    engine.interaction.selectObject(obj.id);
});


import {
    Engine,
    PlayerOverlay,
    VideoObject,
    CanvasControl,
    ExportControl,
    InspectorPanel,
    RichTextObject,
    ChartObject,
} from "../../src/index";
import { KinetixObject } from "../../src/objects/Object";

// --- Custom Implementation for Demo ---
class RectObject extends KinetixObject {
    color: string;
    constructor(id: string, color: string) {
        super(id, "Rect");
        this.color = color;
        this.width = 200;
        this.height = 200;
    }
    draw(ctx: CanvasRenderingContext2D, time: number) {
        ctx.fillStyle = this.color;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.translate(cx, cy);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);

        ctx.globalAlpha = this.opacity;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    clone() {
        return new RectObject("clone_" + this.id, this.color);
    }
    getSchema(): import("../../src/types/Interfaces").PropertySchema[] {
        return [
            { key: "color", label: "Color", type: "color" },
            ...super.getSchema(),
        ];
    }
}

// --- Initialization ---
const canvas = document.getElementById(
    "engine-canvas",
) as HTMLCanvasElement;
const canvasContainer =
    document.querySelector("#engine-canvas")?.parentElement;

// Initialize Engine
const engine = new Engine(canvas);

// Expose to window for debug
(window as any).engine = engine;

const codePreview = document.getElementById("code-preview");

// UI Components
new PlayerOverlay(
    engine,
    document.getElementById("canvas-container") as HTMLElement,
);
new CanvasControl(
    engine,
    document.getElementById("settings-container") as HTMLElement,
);

new ExportControl(
    engine,
    document.getElementById("export-container") as HTMLElement,
);
new InspectorPanel(
    engine,
    document.getElementById("inspector-container") as HTMLElement,
);

document
    .getElementById("btn-add-rect")
    ?.addEventListener("click", () => {
        console.log("Adding Rect...");
        try {
            const id = "rect_" + Date.now();
            const rect = new RectObject(id, "#3b82f6");
            // Center it roughly
            rect.x = engine.scene.width / 2 - 100;
            rect.y = engine.scene.height / 2 - 100;

            engine.scene.add(rect);
            updateCodePreview();
            addToList(id, "Rectangle");
            engine.interaction.selectObject(id);
        } catch (e) {
            console.error(e);
            alert("Error adding rect: " + e);
        }
    });

document
    .getElementById("btn-add-text")
    ?.addEventListener("click", () => {
        console.log("Adding Text...");
        try {
            const id = "text_" + Date.now();
            // Use Real RichTextObject
            const text = new RichTextObject(id, "Hello World");
            text.x = engine.scene.width / 2 - 150;
            text.y = engine.scene.height / 2;
            text.fontSize = 60;

            engine.scene.add(text);
            updateCodePreview();
            addToList(id, "Rich Text");
            engine.interaction.selectObject(id);
        } catch (e) {
            console.error(e);
            alert("Error adding text: " + e);
        }
    });

document
    .getElementById("btn-add-chart")
    ?.addEventListener("click", () => {
        console.log("Adding Chart...");
        try {
            const id = "chart_" + Date.now();
            const chart = new ChartObject(id, "bar");

            // Center
            chart.x = engine.scene.width / 2 - 200;
            chart.y = engine.scene.height / 2 - 150;

            engine.scene.add(chart);
            updateCodePreview();
            addToList(id, "Chart");
            engine.interaction.selectObject(id);
        } catch (e) {
            console.error(e);
            alert("Error adding chart: " + e);
        }
    });

document
    .getElementById("btn-add-video")
    ?.addEventListener("click", () => {
        document.getElementById("video-upload")?.click();
    });

document
    .getElementById("video-upload")
    ?.addEventListener("change", (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        console.log("Video selected:", file.name);

        try {
            const id = "vid_" + Date.now();
            const videoObj = new VideoObject(id, url);

            // Center
            videoObj.x = 0;
            videoObj.y = 0;
            videoObj.width = engine.scene.width;
            videoObj.height = engine.scene.height;

            engine.scene.add(videoObj);
            updateCodePreview();
            addToList(id, "Video");
            engine.interaction.selectObject(id);
        } catch (e) {
            console.error(e);
            alert("Error adding video: " + e);
        }
    });

// --- Save / Load ---
document.getElementById("btn-save")?.addEventListener("click", () => {
    console.log("Saving Project...");
    try {
        const json = engine.project.save();
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "project.json";
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Save failed:", e);
        alert("Save failed: " + e);
    }
});

document.getElementById("btn-load")?.addEventListener("click", () => {
    console.log("Load clicked");
    document.getElementById("file-upload")?.click();
});

document
    .getElementById("file-upload")
    ?.addEventListener("change", (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        console.log("File selected", file.name);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const json = ev.target?.result as string;
            if (json) {
                try {
                    engine.project.load(json);
                    updateCodePreview();
                    // Re-populate list
                    const list = document.getElementById("object-list");
                    if (list) list.innerHTML = "";
                    engine.scene.objects.forEach((obj) => {
                        addToList(obj.id, obj.constructor.name);
                    });
                    console.log("Project loaded");
                } catch (e) {
                    console.error("Load failed:", e);
                    alert("Load failed or invalid JSON");
                }
            }
        };
        reader.readAsText(file);
    });

function updateCodePreview() {
    if (!codePreview) return;
    const lines = [
        `const engine = new Engine(canvas);`,
        `engine.resize(${engine.scene.width}, ${engine.scene.height});`,
    ];
    engine.scene.objects.forEach((obj) => {
        lines.push(
            `engine.scene.add(new ${obj.name}("${obj.id}")); // x:${obj.x.toFixed(0)}, y:${obj.y.toFixed(0)}`,
        );
    });
    codePreview.innerText = lines.join("\n");
}

function addToList(id: string, label: string) {
    const list = document.getElementById("object-list");
    if (!list) return;
    const el = document.createElement("div");
    el.className =
        "flex justify-between items-center bg-black/20 p-2 rounded text-xs text-gray-300";
    el.innerHTML = `<span>${label}</span> <span class="text-gray-600 font-mono">${id.slice(-4)}</span>`;
    list.appendChild(el);
}

// Start
updateCodePreview();

// --- Drag & Drop ---
const dragOverlay = document.getElementById("drag-overlay");

if (canvasContainer) {
    canvasContainer.addEventListener("dragenter", (e) => {
        e.preventDefault();
        dragOverlay?.classList.remove("hidden");
    });

    canvasContainer.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    canvasContainer.addEventListener("dragleave", (e) => {
        e.preventDefault();
        // Simple check to ensure we left the container
        if (
            e.relatedTarget &&
            canvasContainer.contains(e.relatedTarget as Node)
        )
            return;
        dragOverlay?.classList.add("hidden");
    });

    canvasContainer.addEventListener("drop", (e) => {
        e.preventDefault();
        dragOverlay?.classList.add("hidden");

        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (file.type.startsWith("video/")) {
            const url = URL.createObjectURL(file);
            const id = "vid_" + Date.now();
            const videoObj = new VideoObject(id, url);

            // Center
            videoObj.x = 0;
            videoObj.y = 0;
            videoObj.width = engine.scene.width;
            videoObj.height = engine.scene.height;

            engine.scene.add(videoObj);
            updateCodePreview();
            addToList(id, "Video");
        } else {
            alert("Please drop a video file.");
        }
    });
}

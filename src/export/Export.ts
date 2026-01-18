import { Engine } from "../core/Core";

export class Exporter {
    static async exportImage(engine: Engine, format: "png" | "svg"): Promise<void> {
        // Force render
        engine.renderImmediate(true);

        if (format === "png") {
            const dataUrl = engine.canvas.toDataURL("image/png");
            download(dataUrl, "kinetix-export.png");
        } else if (format === "svg") {
            // SVG export is harder with Canvas. 
            // We would need to serialize the Scene Graph to SVG elements.
            // For now, let's fallback to PNG or implement a basic SVGRenderer.
            // Given the complexity, let's notify the user about PNG only for Canvas, 
            // OR use a library like 'canvas2svg' mock context.
            // But for this demo, let's just do PNG for now and maybe simple SVG for Shapes.
            alert("SVG export requires a DOM-based renderer or vector serializer. Using PNG fallback.");
            const dataUrl = engine.canvas.toDataURL("image/png");
            download(dataUrl, "kinetix-fallback.png");
        }
    }

    static async exportVideo(
        engine: Engine,
        options: { filename: string; format: "webm" | "mp4"; duration: number },
        onProgress: (p: number) => void
    ): Promise<void> {
        engine.pause();
        engine.seek(0);

        // Determine Mime Type
        let mimeType = "video/webm;codecs=vp9";
        if (options.format === "mp4") {
            // Try MP4 if supported, else fallback
            if (MediaRecorder.isTypeSupported("video/mp4")) {
                mimeType = "video/mp4";
            } else {
                console.warn("MP4 not supported, falling back to WebM");
                options.format = "webm";
            }
        }

        const stream = engine.canvas.captureStream(60);
        const recorder = new MediaRecorder(stream, { mimeType });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            download(url, `${options.filename}.${options.format}`);
            onProgress(100);
        };

        recorder.start();

        // Duration to capture
        const durationToCapture = options.duration > 0 ? options.duration : (engine.totalDuration / 1000);

        // Play through
        const fps = 60;
        const totalFrames = durationToCapture * fps;
        const dt = 1000 / fps;

        for (let i = 0; i <= totalFrames; i++) {
            const t = i * dt;
            engine.seek(t); // Seek expects ms

            // Wait for draw
            await new Promise(r => setTimeout(r, 16));
            onProgress(Math.round((i / totalFrames) * 100));
        }

        recorder.stop();
        engine.seek(0);
    }
}

function download(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

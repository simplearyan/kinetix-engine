import {
    Output,
    BufferTarget,
    Mp4OutputFormat,
    MovOutputFormat,
    WebMOutputFormat,
    VideoSampleSource,
    VideoSample
} from 'mediabunny';

let output: Output | null = null;
let target: BufferTarget | null = null;
let source: VideoSampleSource | null = null;

let pendingFrames = 0;

// Throttle progress updates to avoid flooding main thread
let lastProgressUpdate = 0;
const sendProgress = (force = false) => {
    const now = Date.now();
    // Update at most every 50ms or if forced
    if (force || now - lastProgressUpdate > 50) {
        self.postMessage({
            type: 'PROGRESS',
            data: {
                queueSize: pendingFrames
            }
        });
        lastProgressUpdate = now;
    }
};

// Task Queue for sequential processing
const taskQueue: any[] = [];
let isProcessing = false;

const processQueue = async () => {
    if (isProcessing || taskQueue.length === 0) return;
    isProcessing = true;

    try {
        while (taskQueue.length > 0) {
            const data = taskQueue.shift();

            // Actual Encoding Logic
            const { bitmap, timestamp, duration } = data;

            try {
                if (!source) throw new Error("Source not initialized");

                const frame = new VideoFrame(bitmap, {
                    timestamp: Math.round(timestamp),
                    duration: duration ? Math.round(duration) : undefined
                });

                const sample = new VideoSample(frame);
                try {
                    await source.add(sample);
                } catch (e: any) {
                    console.error("Frame Encode Error:", e);
                    self.postMessage({ type: 'LOG', message: `Frame Encode Error: ${e.message} @ ${timestamp}` });
                    // Don't throw to stop queue? Maybe better to stop.
                    // For now, let's log and continue or throw?
                    // If we throw, loop stops.
                    throw e;
                } finally {
                    sample.close();
                    frame.close();
                    bitmap.close();
                }

                // Signal Completion for Semaphore
                self.postMessage({ type: 'FRAME_DONE' });

            } catch (err: any) {
                self.postMessage({ type: 'ERROR', error: err.message });
                // If critical error, maybe clear queue?
                taskQueue.length = 0;
            }

            // Stats
            pendingFrames--;
            sendProgress(true);
        }
    } finally {
        isProcessing = false;
    }
};

self.onmessage = async (e) => {
    const { type, data } = e.data;

    try {
        if (type === 'CONFIG') {
            const config = data;
            console.log(`[MediaBunny Worker] Received Config: ${config.width}x${config.height} @ ${config.fps}fps, Format: ${config.format}`);

            target = new BufferTarget();

            let format;
            if (config.format === 'mov') format = new MovOutputFormat();
            else if (config.format === 'webm') format = new WebMOutputFormat();
            else format = new Mp4OutputFormat();

            output = new Output({
                target,
                format
            });

            // Select codec based on format
            const codec = config.format === 'webm' ? 'vp9' : 'avc';

            // @ts-ignore - Types might be strict about width/height but runtime supports it
            source = new VideoSampleSource({
                width: config.width,
                height: config.height,
                frameRate: config.fps,
                codec: codec,
                bitrate: config.bitrate || 6_000_000
            });

            await output.addVideoTrack(source);
            await output.start();

            self.postMessage({ type: 'READY' });
        }
        else if (type === 'ENCODE_FRAME') {
            pendingFrames++;
            sendProgress();

            // Push to queue instead of processing immediately
            taskQueue.push(data);
            processQueue();
        }
        else if (type === 'FINALIZE') {
            // Wait for queue to drain before finalizing
            const drainQueue = async () => {
                while (taskQueue.length > 0 || isProcessing) {
                    await new Promise(r => setTimeout(r, 50));
                }
            };
            await drainQueue();

            try {
                self.postMessage({ type: 'LOG', message: "Finalize: Closing Source..." });
                if (source) {
                    // @ts-ignore
                    if (source.close) {
                        await source.close();
                        self.postMessage({ type: 'LOG', message: "Finalize: Source Closed." });
                    }
                }

                self.postMessage({ type: 'LOG', message: "Finalize: Output Finalizing..." });
                if (output) {
                    await output.finalize();
                    self.postMessage({ type: 'LOG', message: "Finalize: Output Finalized." });
                }

                // Wait for buffer
                let attempts = 0;
                self.postMessage({ type: 'LOG', message: "Finalize: Polling Target Buffer..." });

                while (!target?.buffer && attempts < 100) { // Increased to 10s
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }

                if (target && target.buffer) {
                    self.postMessage({ type: 'LOG', message: `Finalize: Buffer Ready (${target.buffer.byteLength} bytes). Sending COMPLETE.` });
                    self.postMessage({ type: 'COMPLETE', data: target.buffer }, [target.buffer]);
                } else {
                    throw new Error("Export failed: Buffer empty after finalize.");
                }
            } catch (err: any) {
                self.postMessage({ type: 'ERROR', error: `Finalize Error: ${err.message}` });
            }
        }
    } catch (err: any) {
        console.error(err);
        self.postMessage({ type: 'ERROR', error: err.message });
    }
};

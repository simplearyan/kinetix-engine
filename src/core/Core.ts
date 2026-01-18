import { Scene } from "../scene/Scene";
import { InteractionManager } from "./InteractionManager";
import { LayoutManager } from "./LayoutManager";
import { ProjectManager } from "./ProjectManager";
import type { EngineEvents } from "../types/Interfaces";

export class Engine {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    scene: Scene;

    // Managers (Plugins)
    interaction: InteractionManager;
    layout: LayoutManager;
    project: ProjectManager;

    // Time
    currentTime: number = 0;
    totalDuration: number = 30000;
    isPlaying: boolean = false;
    isLooping: boolean = true;
    playbackRate: number = 1;

    // Loop State
    private _rafId: number = 0;
    private _lastFrameTime: number = 0;

    // Helper to clamp time
    private _clampTime(time: number): number {
        return Math.max(0, Math.min(time, this.totalDuration));
    }

    // Centralized time setter (internal use)
    private _setTime(time: number) {
        this.currentTime = this._clampTime(time);
    }

    // Event hooks
    // Event hooks (Legacy Properties - Kept for backward compat, but strictly typed)
    onTimeUpdate?: EngineEvents['timeUpdate'];
    onPlayStateChange?: EngineEvents['playStateChange'];
    onSelectionChange?: EngineEvents['selectionChange'];
    onObjectChange?: EngineEvents['objectChange'];
    onResize?: EngineEvents['resize'];
    onDurationChange?: EngineEvents['durationChange'];

    // New Event System
    private _listeners: { [K in keyof EngineEvents]?: EngineEvents[K][] } = {};

    on<K extends keyof EngineEvents>(event: K, cb: EngineEvents[K]) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event]!.push(cb);
        return () => this.off(event, cb);
    }

    off<K extends keyof EngineEvents>(event: K, cb: EngineEvents[K]) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event]!.filter(l => l !== cb);
    }

    public emit<K extends keyof EngineEvents>(event: K, ...args: Parameters<EngineEvents[K]>) {
        // 1. Call Listeners
        if (this._listeners[event]) {
            this._listeners[event]!.forEach(cb => (cb as any)(...args));
        }

        // 2. Call Legacy Property (Explicit casting to avoid tuple errors)
        if (event === 'timeUpdate') this.onTimeUpdate?.(args[0] as number);
        if (event === 'playStateChange') this.onPlayStateChange?.(args[0] as boolean);
        if (event === 'selectionChange') this.onSelectionChange?.(args[0] as string | null);
        if (event === 'objectChange') this.onObjectChange?.();
        if (event === 'resize') this.onResize?.(args[0] as number, args[1] as number);
        if (event === 'durationChange') this.onDurationChange?.(args[0] as number);
    }

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get 2D context");
        this.ctx = ctx;
        this.scene = new Scene();
        this.scene.onUpdate = () => {
            this.render(); // Always re-render on visual change
            this.emit('objectChange'); // Notify listeners (UI)
        };

        // Initialize Managers
        this.interaction = new InteractionManager(this);
        this.layout = new LayoutManager(this);
        this.project = new ProjectManager(this);

        this.render();
    }

    // Delegate to LayoutManager
    resize(width: number, height: number) {
        this.layout.resize(width, height);
        this.emit('resize', width, height);
    }

    setTotalDuration(duration: number) {
        this.totalDuration = Math.max(1000, duration); // Minimum 1 second
        if (this.currentTime > this.totalDuration) {
            this._setTime(this.totalDuration);
            // _setTime handles timeUpdate, but we need durationChange
        }
        this.emit('durationChange', this.totalDuration);
    }

    // Delegate interaction state to Manager if needed, or expose it
    get selectedObjectId() {
        return this.interaction.selectedObjectId;
    }

    selectObject(id: string | null) {
        this.interaction.selectObject(id);
        this.render(); // Redraw selection box
        this.emit('selectionChange', id);
    }

    play() {
        if (this.isPlaying) return;

        if (this.currentTime >= this.totalDuration) {
            this._setTime(0);
        }

        this.isPlaying = true;
        this._lastFrameTime = performance.now();
        this._rafId = requestAnimationFrame(this._loop);
        this.emit('playStateChange', true);
    }

    pause() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        cancelAnimationFrame(this._rafId);
        this.emit('playStateChange', false);
    }

    seek(time: number) {
        this._setTime(time);
        this.render();
        // Time update handled in _setTime? No, _setTime is internal.
        // Let's add emit to _setTime or call it here.
        // _setTime is used in loop where we emit.
        // Let's call emit here explicitly.
        this.emit('timeUpdate', this.currentTime);
    }

    private _loop = (now: number) => {
        if (!this.isPlaying) return;

        const dt = now - this._lastFrameTime;
        this._lastFrameTime = now;

        let nextTime = this.currentTime + (dt * this.playbackRate);

        if (nextTime >= this.totalDuration) {
            if (this.isLooping) {
                nextTime = 0;
            } else {
                nextTime = this.totalDuration;
                this.pause(); // Stop
            }
        }


        this._setTime(nextTime);
        this.render();
        this.emit('timeUpdate', this.currentTime);

        this._rafId = requestAnimationFrame(this._loop);
    }

    render() {
        this.scene.render(this.ctx, this.currentTime);

        // Draw Selection Overlay
        if (this.selectedObjectId && !this.isPlaying) {
            const obj = this.scene.get(this.selectedObjectId);
            if (obj) {
                this.ctx.save();
                this.ctx.strokeStyle = "#3b82f6";
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
                this.ctx.restore();
            }
        }
    }



    async exportVideo(
        duration: number,
        fps: number = 30,
        mode: 'realtime' | 'offline' = 'offline',
        onProgress: (percent: number) => void,
        signal?: AbortSignal,
        engine: 'legacy' | 'mediabunny' = 'legacy',
        format: 'webm' | 'mp4' | 'mov' = 'webm',
        onLog?: (msg: string) => void,
        options?: { width?: number; height?: number } // Resolution support
    ): Promise<Blob> {
        return new Promise(async (resolve, reject) => {
            // Save state
            const wasLooping = this.isLooping;
            const originalWidth = this.canvas.width;
            const originalHeight = this.canvas.height;

            // Resize if needed
            if (options?.width && options?.height) {
                console.log(`[Core] Resizing for export: ${options.width}x${options.height}`);
                this.resize(options.width, options.height);
            }

            // Force even dimensions for encoder stability
            const evenWidth = this.canvas.width % 2 === 0 ? this.canvas.width : this.canvas.width - 1;
            const evenHeight = this.canvas.height % 2 === 0 ? this.canvas.height : this.canvas.height - 1;

            this.isLooping = false;

            // Restorer helper
            const restore = () => {
                this.isLooping = wasLooping;
                if (options?.width && options?.height) {
                    this.resize(originalWidth, originalHeight);
                }
            };



            if (mode === 'realtime') {
                try {
                    const stream = this.canvas.captureStream(fps);

                    if (engine === 'mediabunny') {
                        // Realtime MP4/MOV/WebM via MediaBunny Worker
                        console.log("Starting Realtime MediaBunny Stream...");

                        // Initialize Worker
                        const worker = new Worker(new URL('../export/workers/mediabunny.worker.ts', import.meta.url), { type: 'module' });

                        worker.postMessage({
                            type: 'CONFIG',
                            data: {
                                width: evenWidth,
                                height: evenHeight,
                                fps,
                                bitrate: 5_000_000,
                                duration,
                                format
                            }
                        });

                        await new Promise<void>((resolveW) => {
                            const initHandler = (e: MessageEvent) => {
                                if (e.data.type === 'READY') {
                                    worker.removeEventListener('message', initHandler);
                                    resolveW();
                                }
                            };
                            worker.addEventListener('message', initHandler);
                        });

                        // Pipe frames using MediaStreamTrackProcessor
                        const track = stream.getVideoTracks()[0];
                        // @ts-ignore
                        const processor = new MediaStreamTrackProcessor({ track });
                        const reader = processor.readable.getReader();

                        // Start Playback
                        this._setTime(0);
                        this.play();

                        let frameCount = 0;
                        // const expectedFrames = (duration / 1000) * fps;

                        const readLoop = async () => {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                if (value) {
                                    worker.postMessage({
                                        type: 'ENCODE_FRAME',
                                        data: {
                                            bitmap: value, // VideoFrame is transferrable
                                            timestamp: value.timestamp, // Already in microseconds
                                            duration: value.duration
                                        }
                                    }, [value]);

                                    frameCount++;
                                }
                            }
                        };

                        readLoop();

                        // Monitor End
                        const checkInterval = setInterval(async () => {
                            if (signal?.aborted) {
                                clearInterval(checkInterval);
                                this.pause();
                                worker.terminate();
                                restore();
                                reject(new Error("Export cancelled"));
                                return;
                            }

                            const progress = (this.currentTime / duration) * 100;
                            onProgress(Math.min(progress, 99));

                            if (!this.isPlaying && this.currentTime >= duration) {
                                clearInterval(checkInterval);
                                onProgress(100);

                                // Stop stream to end processor
                                track.stop();

                                // Finalize Worker
                                worker.postMessage({ type: 'FINALIZE' });

                                const completionPromise = new Promise<Blob>((resolveC) => {
                                    worker.onmessage = (e) => {
                                        if (e.data.type === 'COMPLETE') {
                                            const blob = new Blob([e.data.data], { type: format === 'mp4' ? 'video/mp4' : 'video/quicktime' });
                                            resolveC(blob);
                                            worker.terminate();
                                        } else if (e.data.type === 'ERROR') {
                                            // Handle error
                                            reject(new Error(e.data.error));
                                        }
                                    };
                                });

                                try {
                                    const result = await completionPromise;
                                    restore();
                                    resolve(result);
                                } catch (e) {
                                    reject(e);
                                }
                            }
                        }, 100);

                    } else {
                        // Standard Realtime WebM via MediaRecorder
                        // Use default codec for maximum compatibility
                        // VP8/VP9 specific strings can fail on some systems/drivers
                        const mimeType = "video/webm";
                        console.log("Realtime Export MIME:", mimeType);

                        const recorder = new MediaRecorder(stream, {
                            mimeType,
                            videoBitsPerSecond: 5000000 // 5 Mbps
                        });

                        const chunks: Blob[] = [];
                        recorder.ondataavailable = (e) => {
                            if (e.data.size > 0) chunks.push(e.data);
                        };

                        recorder.onerror = (e) => {
                            console.error("MediaRecorder Error:", e);
                            console.error("MediaRecorder Error:", e);
                            restore();
                            reject(new Error("MediaRecorder Error: " + e.error.message));
                        };

                        const stopPromise = new Promise<Blob>((resolveStop, rejectStop) => {
                            recorder.onstop = () => {
                                const blob = new Blob(chunks, { type: mimeType });
                                console.log("Export Finished. Chunks:", chunks.length, "Total Size:", blob.size);

                                if (blob.size === 0) {
                                    rejectStop(new Error("Export failed: Resulting video is empty (0 bytes)."));
                                } else {
                                    resolveStop(blob);
                                }
                            };
                        });

                        recorder.start(); // Standard recording (no timeslice)

                        // Realtime: Just play
                        this._setTime(0);
                        this.play();

                        const checkInterval = setInterval(async () => {
                            if (signal?.aborted) {
                                clearInterval(checkInterval);
                                this.pause();
                                recorder.stop();
                                this.pause();
                                recorder.stop();
                                restore();
                                reject(new Error("Export cancelled"));
                                return;
                            }

                            const progress = (this.currentTime / duration) * 100;
                            onProgress(Math.min(progress, 99));

                            // Check if stopped or reached end
                            if (!this.isPlaying && this.currentTime >= duration) {
                                clearInterval(checkInterval);
                                recorder.stop();
                                onProgress(100);

                                try {
                                    const blob = await stopPromise;
                                    restore();
                                    resolve(blob);
                                } catch (e) {
                                    restore();
                                    reject(e);
                                }
                            }
                        }, 100);
                    }
                } catch (e) {
                    restore();
                    reject(e);
                }

            } else {
                // Offline: Worker-based Frame-by-Frame
                // const startTime = performance.now();
                onLog?.(`[Core] Starting Offline Export...`);

                let cleanup = () => { restore(); };

                try {
                    this.pause();
                    const totalFrames = Math.ceil((duration / 1000) * fps); // Fix: duration is in ms
                    onLog?.(`[Core] Params: ${duration}ms, ${fps}fps, ${totalFrames} frames`);

                    const dt = 1000 / fps; // in ms
                    const frameDurationUs = 1000000 / fps;

                    // Initialize Worker
                    // Unified pipeline: Always use MediaBunny for offline export
                    const worker = new Worker(new URL('../export/workers/mediabunny.worker.ts', import.meta.url), { type: 'module' });

                    cleanup = () => {
                        worker.terminate();
                        restore();
                    };

                    worker.postMessage({
                        type: 'CONFIG',
                        data: {
                            width: evenWidth,
                            height: evenHeight,
                            fps,
                            bitrate: 5_000_000,
                            duration, // in ms
                            format // 'webm' | 'mp4' | 'mov'
                        }
                    });

                    // Wait for worker ready
                    await new Promise<void>((resolveW, rejectW) => {
                        const initHandler = (e: MessageEvent) => {
                            if (e.data.type === 'READY') {
                                onLog?.("[Worker] Ready");
                                worker.removeEventListener('message', initHandler);
                                resolveW();
                            } else if (e.data.type === 'ERROR') {
                                worker.removeEventListener('message', initHandler);
                                rejectW(new Error(e.data.error));
                            }
                        };
                        worker.addEventListener('message', initHandler);
                    });

                    let queueSize = 0;
                    let hasError = false;
                    let workerError: string | null = null;

                    // Semaphore for Backpressure
                    const MAX_IN_FLIGHT = 3;
                    let credits = MAX_IN_FLIGHT;

                    const progressHandler = (e: MessageEvent) => {
                        if (e.data.type === 'PROGRESS') {
                            queueSize = e.data.data.queueSize;
                        } else if (e.data.type === 'FRAME_DONE') {
                            credits++;
                            // onLog?.(`[Core] Credit returned: ${credits}`);
                        } else if (e.data.type === 'LOG' && onLog) {
                            onLog(`[Worker] ${e.data.message}`);
                        } else if (e.data.type === 'ERROR') {
                            console.error("Worker Error during export:", e.data.error);
                            onLog?.(`[Worker Error] ${e.data.error}`);
                            hasError = true;
                            workerError = e.data.error;
                        }
                    };
                    worker.addEventListener('message', progressHandler);

                    const BATCH_SIZE = 2; // Process fewer frames before yielding

                    for (let i = 0; i <= totalFrames; i++) {
                        if (signal?.aborted) {
                            cleanup();
                            return reject(new Error("Export cancelled"));
                        }

                        if (hasError) {
                            cleanup();
                            return reject(new Error(`Export Failed: ${workerError || "Unknown Worker Error"}`));
                        }

                        // Debug Performance
                        // const t0 = performance.now();

                        // Backpressure: Semaphore Wait
                        let waitStart = performance.now();
                        while (credits <= 0) {
                            if (hasError) break;

                            if (performance.now() - waitStart > 15000) { // 15s timeout
                                onLog?.(`[Core] Backpressure Timeout. Credits: ${credits}, Queue: ${queueSize}`);
                                cleanup();
                                return reject(new Error("Export Timeout: Worker stalled (No credits returned)."));
                            }
                            await new Promise(r => setTimeout(r, 10));
                        }
                        if (hasError) {
                            cleanup();
                            return reject(new Error(`Export Failed: ${workerError}`));
                        }

                        // Consume Credit
                        credits--;

                        // const t1 = performance.now();

                        const time = i * dt;

                        // Wait for any async objects (like Video) to be ready
                        await this.scene.prepareForRender(time);

                        this.seek(time); // Sets currentTime and calls render() synchronously

                        // Create Bitmap (Efficient snapshot)
                        // No need to wait for repaint/setTimeout(0) as render is synchronous
                        const bitmap = await createImageBitmap(this.canvas, {
                            resizeWidth: evenWidth,
                            resizeHeight: evenHeight
                        });
                        // const t3 = performance.now();

                        // Transfer to worker
                        worker.postMessage({
                            type: 'ENCODE_FRAME',
                            data: {
                                bitmap,
                                timestamp: i * frameDurationUs, // Microseconds
                                keyFrame: i % fps === 0,
                                duration: frameDurationUs
                            }
                        }, [bitmap]);

                        // Update progress periodically
                        if (i % 5 === 0) onProgress((i / totalFrames) * 100);

                        // Yield to UI loop frequently
                        if (i % BATCH_SIZE === 0) {
                            await new Promise(r => setTimeout(r, 2)); // Small yield
                        }
                    }

                    onLog?.("[Core] Render loop finished. Finalizing worker...");

                    const blobPromise = new Promise<Blob>((resolveB, rejectB) => {
                        const finishHandler = (e: MessageEvent) => {
                            if (e.data.type === 'COMPLETE') {
                                const blob = new Blob([e.data.data], { type: format === 'mp4' ? 'video/mp4' : 'video/webm' });
                                worker.removeEventListener('message', finishHandler);
                                worker.terminate();
                                resolveB(blob);
                            } else if (e.data.type === 'ERROR') {
                                worker.removeEventListener('message', finishHandler);
                                rejectB(new Error(e.data.error));
                                worker.terminate();
                            }
                        };
                        worker.addEventListener('message', finishHandler);
                    });

                    worker.postMessage({ type: 'FINALIZE' });

                    const blob = await blobPromise;

                    if (signal?.aborted) {
                        return reject(new Error("Export cancelled"));
                    }

                    onLog?.(`[Core] Export Finished. Blob size: ${blob.size}`);
                    restore();
                    resolve(blob);

                    // Restore state
                    this._setTime(0);
                    this.render();

                } catch (e: any) {
                    cleanup();
                    reject(e);
                }
            }
        });
    }

    dispose() {
        this.pause();
        this.interaction.dispose();
    }
}

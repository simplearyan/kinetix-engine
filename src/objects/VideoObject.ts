import { KinetixObject } from "./Object";

export class VideoObject extends KinetixObject {
    videoElement: HTMLVideoElement;
    src: string;
    isLoaded: boolean = false; // Legacy flag, try to deprecate later
    private _loadPromise: Promise<void> | null = null;

    constructor(id: string, src: string) {
        super(id, "Video");
        this.src = src;

        // Create invisible video element
        this.videoElement = document.createElement("video");
        this.videoElement.src = src;
        this.videoElement.crossOrigin = "anonymous";
        this.videoElement.muted = true; // Auto-play policies often require mute
        this.videoElement.playsInline = true;
        this.videoElement.style.display = "none";
        document.body.appendChild(this.videoElement);

        this.videoElement.addEventListener("loadedmetadata", () => {
            this.isLoaded = true;
            this.width = this.videoElement.videoWidth;
            this.height = this.videoElement.videoHeight;
        });

        // Error handling
        // Error handling
        this.videoElement.addEventListener("error", (e) => {
            console.error("Video Error:", this.videoElement.error);
            this.status = 'error';
        });

        // Initialize Loading
        this.status = 'loading';
        this.load();
    }

    async load(): Promise<void> {
        if (this._loadPromise) return this._loadPromise;

        this._loadPromise = new Promise((resolve, reject) => {
            if (this.videoElement.readyState >= 1) { // HAVE_METADATA
                this.status = 'ready';
                this.isLoaded = true;
                resolve();
                return;
            }

            const loadHandler = () => {
                this.status = 'ready';
                this.isLoaded = true;
                this.width = this.videoElement.videoWidth;
                this.height = this.videoElement.videoHeight;
                resolve();
            };

            const errorHandler = () => {
                this.status = 'error';
                // Don't reject, just resolve so Promise.all doesn't fail entire scene load
                resolve();
            };

            this.videoElement.addEventListener('loadedmetadata', loadHandler, { once: true });
            this.videoElement.addEventListener('error', errorHandler, { once: true });
        });

        return this._loadPromise;
    }

    // Critical for Offline Export: Wait for video to seek
    async prepareForRender(time: number): Promise<void> {
        if (!this.isLoaded) return;

        const targetTime = time / 1000;
        // Check if close enough (within 1/60th of a second approx)
        if (Math.abs(this.videoElement.currentTime - targetTime) < 0.02) {
            return;
        }

        this.videoElement.currentTime = targetTime;

        // Wait for seeked event
        await new Promise<void>((resolve) => {
            // If already ready state 4 (HAVE_ENOUGH_DATA) after seek, maybe fast path?
            // But 'seeked' is most reliable.
            const handler = () => {
                this.videoElement.removeEventListener('seeked', handler);
                resolve();
            };
            this.videoElement.addEventListener('seeked', handler, { once: true });

            // Backup timeout in case it hangs
            setTimeout(() => {
                this.videoElement.removeEventListener('seeked', handler);
                resolve();
            }, 1000);
        });
    }

    draw(ctx: CanvasRenderingContext2D, time: number): void {
        if (this.status === 'error') {
            // Draw Placeholder
            ctx.save();
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#ef4444'; // Red-500
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);

            // Draw X
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.moveTo(this.x + this.width, this.y);
            ctx.lineTo(this.x, this.y + this.height);
            ctx.stroke();
            ctx.restore();
            return;
        }

        if (this.status !== 'ready' && !this.isLoaded) return;

        const targetTime = time / 1000;

        // Optimization: Only force seek if drift is large
        // This relies on the fact that if we aren't seeking, the previous frame is still valid
        // or the video is playing naturally. 
        // Since we don't control .play() state here, we rely on seek behavior.
        // However, forcing seek every frame (16ms) is heavy.
        // We only update if > 50ms drift to allow some smoothness or if we assume playback.

        // Note: For pure scrubbing, we WANT to update instantly.
        // For playback, we might want to let it slide.

        // Current compromise: Seek always but with check
        if (Math.abs(this.videoElement.currentTime - targetTime) > 0.05) {
            try {
                this.videoElement.currentTime = targetTime;
            } catch (e) {
                // Ignore
            }
        }

        ctx.save();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.translate(cx, cy);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);

        ctx.globalAlpha = this.opacity;
        ctx.drawImage(this.videoElement, this.x, this.y, this.width, this.height);

        ctx.restore();
    }

    clone(): KinetixObject {
        return new VideoObject("clone_" + this.id, this.src);
    }

    // Cleanup
    onRemove() {
        this.videoElement.remove();
    }

    toJSON() {
        const base = super.toJSON();
        base.type = "VideoObject";
        base.props = {
            ...base.props,
            src: this.src
        };
        return base;
    }
}

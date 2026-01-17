import { KinetixObject } from "./Object";

export class VideoObject extends KinetixObject {
    videoElement: HTMLVideoElement;
    src: string;
    isLoaded: boolean = false;

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
        this.videoElement.addEventListener("error", (e) => {
            console.error("Video Error:", this.videoElement.error);
        });
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
        if (!this.isLoaded) return;

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

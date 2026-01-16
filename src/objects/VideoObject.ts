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
        this.videoElement.style.display = "none";
        document.body.appendChild(this.videoElement);

        this.videoElement.addEventListener("loadedmetadata", () => {
            this.isLoaded = true;
            this.width = this.videoElement.videoWidth;
            this.height = this.videoElement.videoHeight;
        });
    }

    draw(ctx: CanvasRenderingContext2D, time: number): void {
        if (!this.isLoaded) return;

        // Sync Video to Engine Time
        // Note: HTML Video uses seconds, Engine uses ms
        // We only update if significant diff to prevent stutter? 
        // Or blindly set? Blind setting is safer for exact frame sync in preview.
        // However, setting currentTime constantly can be heavy.

        // Better:
        // If engine is playing, we play the video.
        // If engine is paused, we pause the video.
        // We sync if drift is large.

        // For simple frame-by-frame preview (which Kinetix is), setting currentTime is the most robust way
        // to ensure that dragging the timeline works 1:1.

        const targetTime = time / 1000;

        // Simple Sync for Preview:
        // Ideally we check if 'playing' vs 'seeking'.
        // But Kinetix `draw` is called every frame.

        // If the difference is small (e.g. playing regularly), don't force seek continuously
        // as it might stutter audio.
        // BUT for 'preview' accuracy, forced seek is best. Let's try forced seek first.

        try {
            this.videoElement.currentTime = targetTime;
        } catch (e) {
            // Video might not be ready
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
}

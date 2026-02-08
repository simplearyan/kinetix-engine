import { Engine } from "../core/Core";

export class PlayerOverlay {
    container: HTMLElement;
    engine: Engine;

    // Elements
    btnToggle: HTMLElement;
    iconPlay: HTMLElement;
    iconPause: HTMLElement;
    labelCurrent: HTMLElement;
    labelTotal: HTMLElement;
    scroller: HTMLInputElement;
    progressBar: HTMLElement;
    head: HTMLElement;

    constructor(engine: Engine, container: HTMLElement) {
        this.engine = engine;
        this.container = container;

        // Render
        this.render();

        // Get References
        this.btnToggle = this.container.querySelector(".k-btn-toggle") as HTMLElement;
        this.iconPlay = this.container.querySelector(".k-icon-play") as HTMLElement;
        this.iconPause = this.container.querySelector(".k-icon-pause") as HTMLElement;
        this.labelCurrent = this.container.querySelector(".k-time-current") as HTMLElement;
        this.labelTotal = this.container.querySelector(".k-time-total") as HTMLElement;
        this.scroller = this.container.querySelector(".k-timeline-scroller") as HTMLInputElement;
        this.progressBar = this.container.querySelector(".k-timeline-progress") as HTMLElement;
        this.head = this.container.querySelector(".k-timeline-head") as HTMLElement;

        // Bind
        this.bindEvents();
        this.syncState();
    }

    private render() {
        // We inject styles dynamically or assume Tailwind? 
        // For a standalone library, inline styles or specific classes are safer.
        // For this demo, we'll replicate the Tailwind classes but scoped slightly if possible.
        // Actually, let's keep using Tailwind classes for now since the consumer (engine.astro) uses it.
        // In a real pure lib, we'd inject a <style> tag.

        // Create a wrapper for the overlay to avoid wiping existing children (Canvas)
        const overlay = document.createElement("div");
        overlay.innerHTML = `
            <div class="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur rounded-lg p-3 flex items-center gap-4 border border-white/10 z-20">
                <!-- Play/Pause -->
                <button class="k-btn-toggle w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:bg-gray-200 transition">
                    <svg class="k-icon-play w-4 h-4 ml-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />
                    </svg>
                    <svg class="k-icon-pause w-4 h-4 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />
                    </svg>
                </button>

                <!-- Time Display -->
                <div class="text-xs font-mono text-gray-300 min-w-[80px] text-center">
                    <span class="k-time-current">00:00</span> / <span class="k-time-total">00:00</span>
                </div>

                <!-- Progress Bar -->
                <div class="flex-1 relative h-6 flex items-center group">
                    <!-- Track Background -->
                    <div class="absolute inset-x-0 h-1 bg-gray-700 rounded-full group-hover:h-1.5 transition-[height] duration-200"></div>
                    
                    <input
                        type="range"
                        min="0"
                        max="1000"
                        value="0"
                        step="10"
                        class="k-timeline-scroller absolute inset-x-0 w-full h-full opacity-0 z-10 cursor-pointer"
                    />
                    
                    <!-- Visible Progress -->
                    <div 
                        class="k-timeline-progress absolute left-0 h-1 bg-emerald-500 rounded-full group-hover:h-1.5 transition-[height] duration-200 pointer-events-none"
                        style="width: 0%"
                    ></div>
                    <!-- Scrubber Head -->
                    <div 
                        class="k-timeline-head absolute h-3 w-3 bg-white rounded-full shadow border border-gray-300 pointer-events-none ml-[-6px]"
                        style="left: 0%"
                    ></div>
                </div>
            </div>
        `;

        this.container.appendChild(overlay);
    }

    private bindEvents() {
        // Play/Pause
        this.btnToggle.onclick = () => {
            if (this.engine.isPlaying) this.engine.pause();
            else this.engine.play();
        };

        // Scroller
        this.scroller.oninput = (e: Event) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            this.engine.seek(val);
            this.updateVisuals(val);
        };

        // Engine Events
        // We override or hook into engine callbacks. 
        // Note: In a real app we might want strict event listeners array, 
        // but for now we'll hook into onTimeUpdate ensuring we don't clobber others if possible?
        // The Engine has simple function props `onTimeUpdate`.
        // We should probably chain them if they exist, or InteractionManager handles this.
        // For this MVP, we will chain it manually.
        const originalOnTimeUpdate = this.engine.onTimeUpdate;
        this.engine.onTimeUpdate = (time) => {
            originalOnTimeUpdate?.(time);
            this.updateVisuals(time);
        };

        const originalOnPlayStateChange = this.engine.onPlayStateChange;
        this.engine.onPlayStateChange = (isPlaying) => {
            originalOnPlayStateChange?.(isPlaying);
            this.updatePlayState(isPlaying);
        };

        const originalOnDurationChange = this.engine.onDurationChange;
        this.engine.onDurationChange = (duration) => {
            originalOnDurationChange?.(duration);
            this.syncState();
        };
    }

    private formatTime(ms: number) {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    private updateVisuals(time: number) {
        // Time Label
        this.labelCurrent.innerText = this.formatTime(time);

        // Progress
        const percent = (time / this.engine.totalDuration) * 100;

        // Update scroller if not active (to prevent fighting)
        if (document.activeElement !== this.scroller) {
            this.scroller.value = time.toString();
        }

        this.progressBar.style.width = `${percent}%`;
        this.head.style.left = `${percent}%`;
    }

    private updatePlayState(isPlaying: boolean) {
        if (isPlaying) {
            this.iconPlay.classList.add("hidden");
            this.iconPause.classList.remove("hidden");
        } else {
            this.iconPlay.classList.remove("hidden");
            this.iconPause.classList.add("hidden");
        }
    }

    private syncState() {
        // Max
        this.scroller.max = this.engine.totalDuration.toString();
        this.labelTotal.innerText = this.formatTime(this.engine.totalDuration);

        // Current
        this.updateVisuals(this.engine.currentTime);
        this.updatePlayState(this.engine.isPlaying);
    }
}

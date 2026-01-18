import { atom, type WritableAtom } from 'nanostores';

export class EngineStore {
    // Core State
    currentTime: WritableAtom<number>;
    totalDuration: WritableAtom<number>;
    isPlaying: WritableAtom<boolean>;

    // Selection
    selectedObjectId: WritableAtom<string | null>;

    // Canvas Config
    width: WritableAtom<number>;
    height: WritableAtom<number>;

    // Resolution Preset (Optional, could be derived)
    resolution: WritableAtom<{ width: number, height: number, label: string } | null>;

    constructor() {
        this.currentTime = atom(0);
        this.totalDuration = atom(10000); // 10s default
        this.isPlaying = atom(false);
        this.selectedObjectId = atom(null);
        this.width = atom(1920);
        this.height = atom(1080);
        this.resolution = atom(null);
    }

    // Helper to reset all state (e.g. on new project)
    reset() {
        this.currentTime.set(0);
        this.isPlaying.set(false);
        this.selectedObjectId.set(null);
    }
}

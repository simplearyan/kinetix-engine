import type { KinetixObjectProps } from "../types/Interfaces";

export abstract class KinetixObject implements KinetixObjectProps {
    id: string;
    name: string;
    visible: boolean = true;

    // Transform
    x: number = 0;
    y: number = 0;
    width: number = 100;
    height: number = 100;
    rotation: number = 0;
    scaleX: number = 1;
    scaleY: number = 1;
    opacity: number = 1;

    // Selection/Interaction
    locked: boolean = false;

    // Optional Config properties from Styleable
    fontSize?: number;
    padding?: number;
    lineNumberMargin?: number;
    barHeight?: number;
    gap?: number;
    radius?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;

    // Animation
    animation: {
        type: "none" | "fadeIn" | "slideUp" | "scaleIn" | "typewriter" | "grow";
        duration: number; // ms
        delay: number; // ms
    } = { type: "none", duration: 1000, delay: 0 };

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

    abstract draw(ctx: CanvasRenderingContext2D, time: number): void;

    // Optional lifecycle hooks
    onAdd(_scene: any) { }
    onRemove(_scene: any) { }

    // Async hook for pre-render logic (e.g. waiting for video seek)
    // Used primarily during offline export
    async prepareForRender(time: number): Promise<void> {
        return;
    }

    // Helper to check hit (default AABB)
    isHit(x: number, y: number): boolean {
        return x >= this.x && x <= this.x + this.width &&
            y >= this.y && y <= this.y + this.height;
    }

    // Clone method for duplication
    abstract clone(): KinetixObject;
}

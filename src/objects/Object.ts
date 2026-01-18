import type { KinetixObjectProps } from "../types/Interfaces";
import type { Scene } from "../scene/Scene";

export abstract class KinetixObject implements KinetixObjectProps {
    id: string;
    name: string;
    visible: boolean = true;

    // Status
    status: 'loading' | 'ready' | 'error' = 'ready';

    // Transform
    x: number = 0;
    y: number = 0;
    width: number = 100;
    height: number = 100;
    rotation: number = 0;
    scaleX: number = 1;
    scaleY: number = 1;
    opacity: number = 1;

    // Hierarchy
    parent: KinetixObject | null = null;

    getGlobalX(): number {
        return this.x + (this.parent?.getGlobalX() || 0);
    }

    getGlobalY(): number {
        return this.y + (this.parent?.getGlobalY() || 0);
    }

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

    // Layout (Center-Pin Scaling is now default, no per-object config needed)

    // Animation
    animation: {
        type: "none" | "fadeIn" | "slideUp" | "scaleIn" | "typewriter" | "grow";
        duration: number; // ms
        delay: number; // ms
        easing?: string;
    } = { type: "none", duration: 1000, delay: 0, easing: 'linear' };

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

    abstract draw(ctx: CanvasRenderingContext2D, time: number): void;

    // Optional lifecycle hooks
    onAdd(_scene: Scene) { }
    onRemove(_scene: Scene) { }

    // Asset Loading Hook
    async load(): Promise<void> {
        return Promise.resolve();
    }

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

    toJSON(): import("../types/Interfaces").SerializedObject {
        return {
            type: this.constructor.name, // Fallback if no specific type field
            id: this.id,
            name: this.name,
            props: {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height,
                rotation: this.rotation,
                scaleX: this.scaleX,
                scaleY: this.scaleY,
                opacity: this.opacity,
                visible: this.visible,
                locked: this.locked,
                // Styles
                fontSize: this.fontSize,
                color: this.color,
                backgroundColor: this.backgroundColor,
                padding: this.padding,
                // Animation
                animation: this.animation
            }
        };
    }

    getSchema(): import("../types/Interfaces").PropertySchema[] {
        return [
            // Transform
            { key: 'x', label: 'X', type: 'number' },
            { key: 'y', label: 'Y', type: 'number' },
            { key: 'width', label: 'Width', type: 'number' },
            { key: 'height', label: 'Height', type: 'number' },
            { key: 'rotation', label: 'Rotation', type: 'number' },
            { key: 'opacity', label: 'Opacity', type: 'number', min: 0, max: 1, step: 0.1 },

            // Animation
            {
                key: 'animation.type',
                label: 'Animation',
                type: 'select',
                options: ['none', 'fadeIn', 'slideUp', 'scaleIn', 'typewriter', 'grow']
            },
            { key: 'animation.duration', label: 'Duration (ms)', type: 'number', step: 100 },
            { key: 'animation.delay', label: 'Delay (ms)', type: 'number', step: 100 }
        ];
    }
}

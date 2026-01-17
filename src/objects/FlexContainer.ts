import { KinetixObject } from "./Object";

export type FlexDirection = 'row' | 'column';
export type FlexAlign = 'start' | 'center' | 'end';

export class FlexContainer extends KinetixObject {
    children: KinetixObject[] = [];

    // Layout Props
    direction: FlexDirection = 'row';
    gap: number = 0;
    alignItems: FlexAlign = 'start';
    padding: number = 0;

    constructor(id: string) {
        super(id, "FlexContainer");
        // Default size (will be auto-updated by content)
        this.width = 100;
        this.height = 100;
    }

    add(child: KinetixObject) {
        child.parent = this;
        this.children.push(child);
    }

    draw(ctx: CanvasRenderingContext2D, time: number) {
        this._updateLayout();

        ctx.save();
        ctx.translate(this.x, this.y);

        // Optional: Debug Background
        // ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
        // ctx.strokeRect(0, 0, this.width, this.height);

        for (const child of this.children) {
            child.draw(ctx, time);
        }

        ctx.restore();
    }

    private _updateLayout() {
        let cursor = this.padding;
        let maxCrossSize = 0;

        for (const child of this.children) {
            // 1. Position Child
            if (this.direction === 'row') {
                child.x = cursor;

                // Alignment (Cross Axis)
                if (this.alignItems === 'start') {
                    child.y = this.padding;
                } else if (this.alignItems === 'center') {
                    // Need to know container height or max height? 
                    // For auto-sizing container, we position relative to established max height or just 0 for now?
                    // 'center' is hard without a second pass or fixed height.
                    // Let's implement 'center' relative to current max height? No.
                    // Let's stick to 'start' default logic for now, or just fixed Y = padding.
                    child.y = this.padding;
                }

                cursor += child.width + this.gap;
                maxCrossSize = Math.max(maxCrossSize, child.height);
            } else {
                // Column
                child.y = cursor;
                child.x = this.padding;
                cursor += child.height + this.gap;
                maxCrossSize = Math.max(maxCrossSize, child.width);
            }
        }

        // 2. Expand Container
        // Remove trailing gap
        if (this.children.length > 0) cursor -= this.gap;

        if (this.direction === 'row') {
            this.width = cursor + this.padding;
            this.height = maxCrossSize + (this.padding * 2);
        } else {
            this.height = cursor + this.padding;
            this.width = maxCrossSize + (this.padding * 2);
        }

        // 3. Second Pass for Center Alignment (now that we know dimensions)
        if (this.alignItems === 'center') {
            for (const child of this.children) {
                if (this.direction === 'row') {
                    // Center Vertically
                    child.y = (this.height - child.height) / 2;
                } else {
                    // Center Horizontally
                    child.x = (this.width - child.width) / 2;
                }
            }
        }
    }

    clone(): FlexContainer {
        const clone = new FlexContainer(`flex-${Date.now()}`);
        clone.direction = this.direction;
        clone.gap = this.gap;
        clone.padding = this.padding;
        clone.alignItems = this.alignItems;
        // Deep clone children?
        this.children.forEach(child => {
            clone.add(child.clone());
        });
        return clone;
    }
}

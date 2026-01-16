import type { KinetixObject } from "../objects/Object";

export type GuideType = 'none' | 'center' | 'thirds' | 'golden';

export class Scene {
    objects: KinetixObject[] = [];
    backgroundColor: string = "#292929"; // Default dark gray
    width: number = 1920;
    height: number = 1080;
    guideType: GuideType = 'none';

    // Interaction State
    mouseX: number = 0;
    mouseY: number = 0;

    onUpdate?: () => void;

    add(obj: KinetixObject) {
        this.objects.push(obj);
        obj.onAdd(this);
        this.onUpdate?.();
    }

    remove(id: string) {
        const index = this.objects.findIndex(o => o.id === id);
        if (index !== -1) {
            this.objects[index].onRemove(this);
            this.objects.splice(index, 1);
            this.onUpdate?.();
        }
    }

    get(id: string) {
        return this.objects.find(o => o.id === id);
    }

    moveUp(id: string) {
        const index = this.objects.findIndex(o => o.id === id);
        if (index !== -1 && index < this.objects.length - 1) {
            [this.objects[index], this.objects[index + 1]] = [this.objects[index + 1], this.objects[index]];
            this.onUpdate?.();
        }
    }

    moveDown(id: string) {
        const index = this.objects.findIndex(o => o.id === id);
        if (index > 0) {
            [this.objects[index], this.objects[index - 1]] = [this.objects[index - 1], this.objects[index]];
            this.onUpdate?.();
        }
    }

    render(ctx: CanvasRenderingContext2D, time: number) {
        // Clear
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, this.width, this.height);

        // Render Objects
        for (const obj of this.objects) {
            if (!obj.visible) continue;

            ctx.save();
            // Apply global object transform? 
            // Usually objects handle their own drawing relative to x,y
            // But we could apply scene camera transforms here later

            ctx.globalAlpha = obj.opacity;
            obj.draw(ctx, time);

            ctx.restore();
        }

        // Render Guides
        if (this.guideType !== 'none') {
            this._drawGuides(ctx);
        }
    }

    private _drawGuides(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.strokeStyle = "rgba(0, 255, 255, 0.5)"; // Cyan with opacity
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // Dashed lines

        const w = this.width;
        const h = this.height;

        ctx.beginPath();

        if (this.guideType === 'center') {
            // Horizontal Center
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            // Vertical Center
            ctx.moveTo(w / 2, 0);
            ctx.lineTo(w / 2, h);
        } else if (this.guideType === 'thirds') {
            // Vertical lines
            ctx.moveTo(w / 3, 0);
            ctx.lineTo(w / 3, h);
            ctx.moveTo(2 * w / 3, 0);
            ctx.lineTo(2 * w / 3, h);
            // Horizontal lines
            ctx.moveTo(0, h / 3);
            ctx.lineTo(w, h / 3);
            ctx.moveTo(0, 2 * h / 3);
            ctx.lineTo(w, 2 * h / 3);
        } else if (this.guideType === 'golden') {
            const phi = 0.61803398875;
            const invPhi = 1 - phi;

            // Vertical lines
            ctx.moveTo(w * invPhi, 0);
            ctx.lineTo(w * invPhi, h);
            ctx.moveTo(w * phi, 0);
            ctx.lineTo(w * phi, h);

            // Horizontal lines
            ctx.moveTo(0, h * invPhi);
            ctx.lineTo(w, h * invPhi);
            ctx.moveTo(0, h * phi);
            ctx.lineTo(w, h * phi);
        }

        ctx.stroke();
        ctx.restore();
    }
}

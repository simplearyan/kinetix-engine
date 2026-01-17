import type { Engine } from "./Core";
import type { Styleable } from "../types/Interfaces";

export class LayoutManager {
    engine: Engine;

    constructor(engine: Engine) {
        this.engine = engine;
    }

    resize(width: number, height: number) {
        const scene = this.engine.scene;
        const canvas = this.engine.canvas;
        const prevW = scene.width;
        const prevH = scene.height;

        if (prevW === 0 || prevH === 0) {
            canvas.width = width;
            canvas.height = height;
            scene.width = width;
            scene.height = height;
            this.engine.render();
            this.engine.onResize?.(width, height);
            return;
        }

        const scaleX = width / prevW;
        const scaleY = height / prevH;
        // Used only to calculate sizeScale if we wanted non-uniform scaling,
        // but for now we rely on strict proportional fit.

        canvas.width = width;
        canvas.height = height;
        scene.width = width;
        scene.height = height;

        // Center-Pin Scaling Strategy
        // 1. Calculate Scale Factor based on "Fit" logic (safe default)
        // If we want "Cover" for backgrounds, we'd need a specific flag, but for now strict proportional fit is best.
        // We use the min scale to ensure object fits within new bounds without distortion.
        const scaleFactor = Math.min(width / prevW, height / prevH);

        // Scale all objects
        scene.objects.forEach(obj => {
            // 2. Capture Relative Center (0.5, 0.5 = Center)
            const centerX = obj.x + obj.width / 2;
            const centerY = obj.y + obj.height / 2;
            const percentX = centerX / prevW;
            const percentY = centerY / prevH;

            // 3. Scale Dimensions & Props
            obj.width *= scaleFactor;
            obj.height *= scaleFactor;

            const styleObj = obj as Styleable;
            if (styleObj.fontSize) styleObj.fontSize *= scaleFactor;
            if (styleObj.padding) styleObj.padding *= scaleFactor;
            if (styleObj.lineNumberMargin) styleObj.lineNumberMargin *= scaleFactor;
            if (styleObj.barHeight) styleObj.barHeight *= scaleFactor;
            if (styleObj.gap) styleObj.gap *= scaleFactor;
            if (styleObj.radius) styleObj.radius *= scaleFactor;
            if (styleObj.strokeWidth) styleObj.strokeWidth *= scaleFactor;

            // 4. Reposition based on new Canvas Center
            // New Center = Percentage * New Dimensions
            const newCenterX = percentX * width;
            const newCenterY = percentY * height;

            // 5. Set new Top-Left
            obj.x = newCenterX - obj.width / 2;
            obj.y = newCenterY - obj.height / 2;
        });

        this.engine.render();
        this.engine.onResize?.(width, height);
    }
}

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

        if (scene.width === 0 || scene.height === 0) {
            canvas.width = width;
            canvas.height = height;
            scene.width = width;
            scene.height = height;
            this.engine.render();
            this.engine.onResize?.(width, height);
            return;
        }

        const scaleX = width / scene.width;
        const scaleY = height / scene.height;
        const sizeScale = Math.min(scaleX, scaleY);

        canvas.width = width;
        canvas.height = height;
        scene.width = width;
        scene.height = height;

        // Scale all objects
        scene.objects.forEach(obj => {
            // Position: Relative to canvas size (Percentage based)
            obj.x *= scaleX;
            obj.y *= scaleY;

            // Size: Uniform scaling to maintain aspect
            obj.width *= sizeScale;
            obj.height *= sizeScale;


            // Props - Safe casting using Styleable interface
            // We iterate known numeric style properties to scale them
            const styleObj = obj as Styleable;

            if (styleObj.fontSize) styleObj.fontSize *= sizeScale;
            if (styleObj.padding) styleObj.padding *= sizeScale;
            if (styleObj.lineNumberMargin) styleObj.lineNumberMargin *= sizeScale;
            if (styleObj.barHeight) styleObj.barHeight *= sizeScale;
            if (styleObj.gap) styleObj.gap *= sizeScale;
            if (styleObj.radius) styleObj.radius *= sizeScale;
            if (styleObj.strokeWidth) styleObj.strokeWidth *= sizeScale;
        });

        this.engine.render();
        this.engine.onResize?.(width, height);
    }
}

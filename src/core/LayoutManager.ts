import type { Engine } from "./Core";
import type { Styleable } from "../types/Interfaces";

export class LayoutManager {
    engine: Engine;

    constructor(engine: Engine) {
        this.engine = engine;
    }

    resize(width: number, height: number, mode: 'fit' | 'cover' | 'stretch' | 'center' = 'fit') {
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

        canvas.width = width;
        canvas.height = height;
        scene.width = width;
        scene.height = height;

        let scaleX = 1;
        let scaleY = 1;

        switch (mode) {
            case 'fit':
                const scaleFit = Math.min(width / prevW, height / prevH);
                scaleX = scaleFit;
                scaleY = scaleFit;
                break;
            case 'cover':
                const scaleCover = Math.max(width / prevW, height / prevH);
                scaleX = scaleCover;
                scaleY = scaleCover;
                break;
            case 'stretch':
                scaleX = width / prevW;
                scaleY = height / prevH;
                break;
            case 'center':
                scaleX = 1;
                scaleY = 1;
                break;
        }

        // Scale all objects
        scene.objects.forEach(obj => {
            // 2. Capture Relative Center (0.5, 0.5 = Center)
            const centerX = obj.x + obj.width / 2;
            const centerY = obj.y + obj.height / 2;
            const percentX = centerX / prevW;
            const percentY = centerY / prevH;

            // 3. Scale Dimensions & Props
            obj.width *= scaleX;
            obj.height *= scaleY;

            const styleObj = obj as Styleable;
            // For font/padding, use average scale if non-uniform, or just Y for vertical text fit
            const avgScale = (scaleX + scaleY) / 2;

            if (styleObj.fontSize) styleObj.fontSize *= avgScale;
            if (styleObj.padding) styleObj.padding *= avgScale;
            if (styleObj.lineNumberMargin) styleObj.lineNumberMargin *= avgScale;
            if (styleObj.barHeight) styleObj.barHeight *= avgScale;
            if (styleObj.gap) styleObj.gap *= avgScale;
            if (styleObj.radius) styleObj.radius *= avgScale;
            if (styleObj.strokeWidth) styleObj.strokeWidth *= avgScale;

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


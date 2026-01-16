import type { Engine } from "./Core";

export class InteractionManager {
    engine: Engine;
    canvas: HTMLCanvasElement;

    // State
    selectedObjectId: string | null = null;
    private _isDragging = false;
    private _dragStartX = 0;
    private _dragStartY = 0;
    private _initialObjState: { x: number, y: number } | null = null;

    // Pooled objects to reduce GC
    private _mousePos = { x: 0, y: 0 };

    constructor(engine: Engine) {
        this.engine = engine;
        this.canvas = engine.canvas;
        this.setup();
    }

    setup() {
        // Mouse Events
        this.canvas.addEventListener("mousedown", (e) => this._onMouseDown(e));
        window.addEventListener("mousemove", (e) => this._onMouseMove(e));
        window.addEventListener("mouseup", () => this._onMouseUp());

        // Touch Events
        this.canvas.addEventListener("touchstart", (e) => this._onTouchStart(e), { passive: false });
        window.addEventListener("touchmove", (e) => this._onTouchMove(e), { passive: false });
        window.addEventListener("touchend", () => this._onTouchEnd());
    }

    dispose() {
        // Remove listeners if needed (though usually engine lives as long as page)
    }

    selectObject(id: string | null) {
        this.selectedObjectId = id;
        this.engine.render(); // Redraw selection box
        this.engine.onSelectionChange?.(id);
    }

    private _updateMousePos(clientX: number, clientY: number) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this._mousePos.x = (clientX - rect.left) * scaleX;
        this._mousePos.y = (clientY - rect.top) * scaleY;
        return this._mousePos;
    }

    private _onMouseDown(e: MouseEvent) {
        const { x, y } = this._updateMousePos(e.clientX, e.clientY);
        this._handleStart(x, y);
    }

    private _onMouseMove(e: MouseEvent) {
        const { x, y } = this._updateMousePos(e.clientX, e.clientY);
        this.engine.scene.mouseX = x;
        this.engine.scene.mouseY = y;

        if (this._isDragging && this.selectedObjectId) {
            this._handleMove(x, y);
        }
    }

    private _onMouseUp() {
        this._handleEnd();
    }

    private _onTouchStart(e: TouchEvent) {
        e.preventDefault();
        const touch = e.touches[0] || e.changedTouches[0];
        const { x, y } = this._updateMousePos(touch.clientX, touch.clientY);
        this._handleStart(x, y);
    }

    private _onTouchMove(e: TouchEvent) {
        if (this._isDragging && this.selectedObjectId) {
            e.preventDefault();
            const touch = e.touches[0] || e.changedTouches[0];
            const { x, y } = this._updateMousePos(touch.clientX, touch.clientY);
            this._handleMove(x, y);
        }
    }

    private _onTouchEnd() {
        this._handleEnd();
    }

    private _handleStart(x: number, y: number) {
        // Hit Test (Top-most first)
        let hitId = null;
        const objects = this.engine.scene.objects;
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            if (!obj.visible || obj.locked) continue;
            if (obj.isHit(x, y)) {
                hitId = obj.id;
                break;
            }
        }

        this.selectObject(hitId);

        if (hitId) {
            this._isDragging = true;
            this._dragStartX = x;
            this._dragStartY = y;
            const obj = this.engine.scene.get(hitId);
            if (obj) this._initialObjState = { x: obj.x, y: obj.y };
        }
    }

    private _handleMove(x: number, y: number) {
        const obj = this.engine.scene.get(this.selectedObjectId!);
        if (obj && this._initialObjState) {
            const dx = x - this._dragStartX;
            const dy = y - this._dragStartY;
            obj.x = this._initialObjState.x + dx;
            obj.y = this._initialObjState.y + dy;
            this.engine.render();
            this.engine.onObjectChange?.();
        }
    }

    private _handleEnd() {
        this._isDragging = false;
        this._initialObjState = null;
    }
}

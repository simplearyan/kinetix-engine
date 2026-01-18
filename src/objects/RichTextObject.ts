import { KinetixObject } from "./Object";
import { parseMarkdown, layoutText, TextLayout } from "../utils/TextEngine";

export type TextAnimationMock = "none" | "typewriter" | "fadeIn" | "wordSlide";

export class RichTextObject extends KinetixObject {
    private _text: string = "Hello **World**";
    private _parsedSpans: any[] | null = null;
    private _layout: TextLayout | null = null;

    // Styling
    fontFamily: string = "Inter";
    fontSize: number = 40;
    color: string = "#ffffff";
    backgroundColor: string = ""; // No background by default
    fontWeight: 'normal' | 'bold' = 'normal';
    textAlign: 'left' | 'center' | 'right' = 'left';
    maxWidth: number = 800;
    lineHeight: number = 1.2;

    // Animation Override
    // inherits enterAnimation from BaseObject
    exitAnimation: { type: TextAnimationMock | "fadeOut", duration: number, delay: number, easing?: string } = {
        type: "none",
        duration: 0,
        delay: 0
    };

    constructor(id: string, text: string) {
        super(id, "RichText");
        this.text = text; // Trigger setter
    }

    get text() { return this._text; }
    set text(val: string) {
        if (val !== this._text) {
            this._text = val;
            this._parsedSpans = null; // Invalidate
            this._layout = null;
        }
    }

    private _update(ctx: CanvasRenderingContext2D) {
        // 1. Parse
        if (!this._parsedSpans) {
            this._parsedSpans = parseMarkdown(this._text, this.color);
        }

        // 2. Layout
        if (!this._layout) {
            this._layout = layoutText(
                ctx,
                this._parsedSpans!,
                this.maxWidth,
                this.fontSize,
                this.fontFamily,
                this.lineHeight
            );
            // Update Object Dimensions to match content
            this.width = this._layout.width;
            this.height = this._layout.height;
        }
    }

    draw(ctx: CanvasRenderingContext2D, time: number) {
        this._update(ctx);
        if (!this._layout) return;

        ctx.save();
        ctx.translate(this.getGlobalX(), this.getGlobalY());
        ctx.globalAlpha = this.opacity;

        // Draw Glyphs
        const glyphs = this._layout.glyphs;
        const totalGlyphs = glyphs.length;

        // Animation State
        const anim = this.animation;
        let visibleCount = totalGlyphs;
        let globalAlpha = 1;

        // Calculations
        if (anim.type === "typewriter") {
            const start = anim.delay || 0;
            const duration = anim.duration || 1000;
            const progress = Math.min(1, Math.max(0, (time - start) / duration));
            visibleCount = Math.floor(totalGlyphs * progress);
        } else if (anim.type === "fadeIn") {
            const start = anim.delay || 0;
            const duration = anim.duration || 1000;
            const progress = Math.min(1, Math.max(0, (time - start) / duration));
            globalAlpha = progress;
        }

        // Exit Animation
        if (this.exitAnimation.type !== "none") {
            // NOTE: Ideally 'time' should be relative to object start, but also context aware. 
            // For now assuming 'time' is global timeline. 
            // We need to know WHEN to exit. Usually this is handled by the parent Scene or Timeline.
            // But since our engine is simple, let's assume exit happens after ENTER animation + some hold?
            // Actually, usually exit is explicit. Let's ignore it for this MVP render loop unless we imply a "Total Duration".
        }

        ctx.globalAlpha *= globalAlpha;

        // Draw Background (Rect behind text)
        if (this.backgroundColor) {
            ctx.fillStyle = this.backgroundColor;
            // Simple bounding box: 0, 0, width, height
            // We might want padding?
            const padding = 10;
            ctx.fillRect(-padding, -padding, this.width + (padding * 2), this.height + (padding * 2));
        }

        glyphs.forEach((glyph, i) => {
            if (i >= visibleCount) return;

            // Per-Char Animation transforms could go here
            // e.g., Wave effect: glyph.y + Math.sin(time...)

            // Apply Layout Alignment (Center/Right)
            // Need row width for this. 
            // Simplified: Assume Left for now.
            // For Center, we'd need to know the width of the specific ROW this glyph is on.
            // layoutText returns `row` index. We could pre-calc row widths.

            const emojiFallback = ', "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.font = `${glyph.style.fontStyle} ${glyph.style.fontWeight === 'bold' ? 'bold' : ''} ${this.fontSize}px ${this.fontFamily}${emojiFallback}`;
            ctx.fillStyle = glyph.style.fill;
            ctx.fillText(glyph.char, glyph.x, glyph.y + this.fontSize); // FillText is baseline
        });

        ctx.restore();
    }

    clone(): RichTextObject {
        const clone = new RichTextObject(`richtext-${Date.now()}`, this.text);
        clone.x = this.x;
        clone.y = this.y;
        clone.fontSize = this.fontSize;
        clone.fontFamily = this.fontFamily;
        clone.color = this.color;
        clone.backgroundColor = this.backgroundColor;
        clone.maxWidth = this.maxWidth;
        clone.textAlign = this.textAlign;
        clone.animation = JSON.parse(JSON.stringify(this.animation));
        clone.exitAnimation = JSON.parse(JSON.stringify(this.exitAnimation));
        return clone;
    }

    toJSON() {
        const base = super.toJSON();
        base.type = "RichTextObject";
        base.props = {
            ...base.props,
            text: this.text,
            textAlign: this.textAlign,
            maxWidth: this.maxWidth,
            lineHeight: this.lineHeight,
            fontFamily: this.fontFamily,
            fontWeight: this.fontWeight,
            backgroundColor: this.backgroundColor,
            exitAnimation: this.exitAnimation
        };
        return base;
    }

    getSchema(): import("../types/Interfaces").PropertySchema[] {
        return [
            { key: 'text', label: 'Content', type: 'textarea' },
            { key: 'fontSize', label: 'Font Size', type: 'number' },
            { key: 'color', label: 'Color', type: 'color' },
            { key: 'backgroundColor', label: 'Background', type: 'color' },
            { key: 'fontFamily', label: 'Font', type: 'text' },
            { key: 'textAlign', label: 'Align', type: 'select', options: ['left', 'center', 'right'] },
            { key: 'maxWidth', label: 'Max Width', type: 'number' },
            ...super.getSchema()
        ];
    }
}

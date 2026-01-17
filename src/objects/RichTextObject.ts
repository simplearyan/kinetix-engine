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
    fontWeight: 'normal' | 'bold' = 'normal';
    textAlign: 'left' | 'center' | 'right' = 'left';
    maxWidth: number = 800;
    lineHeight: number = 1.2;

    // Animation Override
    // inherits enterAnimation from BaseObject

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

        ctx.globalAlpha *= globalAlpha;

        glyphs.forEach((glyph, i) => {
            if (i >= visibleCount) return;

            // Per-Char Animation transforms could go here
            // e.g., Wave effect: glyph.y + Math.sin(time...)

            // Apply Layout Alignment (Center/Right)
            // Need row width for this. 
            // Simplified: Assume Left for now.
            // For Center, we'd need to know the width of the specific ROW this glyph is on.
            // layoutText returns `row` index. We could pre-calc row widths.

            ctx.font = `${glyph.style.fontStyle} ${glyph.style.fontWeight === 'bold' ? 'bold' : ''} ${this.fontSize}px ${this.fontFamily}`;
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
        clone.maxWidth = this.maxWidth;
        return clone;
    }
}

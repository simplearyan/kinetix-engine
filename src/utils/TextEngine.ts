
// interfaces
export interface StyledSpan {
    text: string;
    style: {
        fontWeight: 'bold' | 'normal' | '800';
        fontStyle: 'italic' | 'normal';
        fill: string;
    }
}

export interface Glyph {
    char: string;
    x: number;
    y: number; // Baseline relative to line top
    width: number;
    height: number;
    style: StyledSpan['style'];
    row: number;
}

export interface TextLayout {
    glyphs: Glyph[];
    width: number;
    height: number;
    lines: number;
}

/**
 * Parses simple markdown-like syntax:
 * **Bold**
 * __Italic__
 * [color=#ff0000]Red[/color]
 */
export function parseMarkdown(text: string, defaultColor: string): StyledSpan[] {
    const spans: StyledSpan[] = [];

    // Simple stack-based or regex approach? 
    // Regex split is easier for MVP. 
    // Regex to match tags: (\*\*.*?\*\*)|(__.*?__)|(\[color=.*?\])

    // Let's do a robust split
    // 1. Split by tags
    const regex = /(\*\*.*?\*\*)|(__.*?__)|(\[color=.*?\](.*?)\[\/color\])/g;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Push preceding plain text
        if (match.index > lastIndex) {
            spans.push({
                text: text.substring(lastIndex, match.index),
                style: { fontWeight: 'normal', fontStyle: 'normal', fill: defaultColor }
            });
        }

        const fullMatch = match[0];

        if (fullMatch.startsWith('**')) {
            // Bold
            const content = fullMatch.substring(2, fullMatch.length - 2);
            spans.push({
                text: content,
                style: { fontWeight: 'bold', fontStyle: 'normal', fill: defaultColor }
            });
        } else if (fullMatch.startsWith('__')) {
            // Italic
            const content = fullMatch.substring(2, fullMatch.length - 2);
            spans.push({
                text: content,
                style: { fontWeight: 'normal', fontStyle: 'italic', fill: defaultColor }
            });
        } else if (fullMatch.startsWith('[color=')) {
            // Color: [color=#f00]Text[/color]
            // match[3] is full tag, match[4] is content? 
            // Regex groups:
            // 0: Full
            // 1: Bold group
            // 2: Italic group
            // 3: Color group ([color=...]...[/color])
            // 4: Color content inside

            // Extract color value
            const colorMatch = fullMatch.match(/\[color=(.*?)\]/);
            const color = colorMatch ? colorMatch[1] : defaultColor;

            // Extract content: after ] and before [/color]
            const content = match[4]; // Group 4 from outer regex

            spans.push({
                text: content,
                style: { fontWeight: 'normal', fontStyle: 'normal', fill: color }
            });
        }

        lastIndex = regex.lastIndex;
    }

    // Push remaining
    if (lastIndex < text.length) {
        spans.push({
            text: text.substring(lastIndex),
            style: { fontWeight: 'normal', fontStyle: 'normal', fill: defaultColor }
        });
    }

    return spans;
}

export function layoutText(
    ctx: CanvasRenderingContext2D,
    spans: StyledSpan[],
    maxWidth: number,
    baseFontSize: number,
    baseFontFamily: string,
    lineHeightMulti: number = 1.2
): TextLayout {
    const glyphs: Glyph[] = [];

    let currentX = 0;
    let currentY = 0; // Top of line
    let currentRow = 0;
    let maxLineHeight = 0;
    let maxWidthFound = 0;

    // We process word by word to handle wrapping
    // But we store Glyph by Glyph for animation

    for (const span of spans) {
        // Set Font for measurement
        const weight = span.style.fontWeight === 'bold' ? 'bold' : 'normal';
        const style = span.style.fontStyle === 'italic' ? 'italic' : 'normal';
        ctx.font = `${style} ${weight} ${baseFontSize}px ${baseFontFamily}`;

        // Measure approx height
        // Canvas doesn't give precise cap-height universally, assume fontSize based
        const charHeight = baseFontSize;
        const lineHeight = baseFontSize * lineHeightMulti;

        // Split into words to wrap
        // Preserve spaces?
        const words = span.text.split(/(\s+)/);

        for (const word of words) {
            const width = ctx.measureText(word).width;

            // Check wrap
            // Exception: If single word > maxWidth, we must put it, or split char by char.
            // MVP: simple word wrap. 
            // If currentX > 0 (not start of line) AND word fits?

            if (currentX + width > maxWidth && currentX > 0) {
                // New Line
                currentX = 0;
                currentY += (maxLineHeight || lineHeight); // Use previous line's max height
                currentRow++;
                maxLineHeight = 0; // Reset for new line
            }

            // Update Line Height tracking (in case of mixed fonts later)
            maxLineHeight = Math.max(maxLineHeight, lineHeight);

            // Generate Glyphs
            // Use Array.from to correctly handle surrogate pairs (emojis)
            const chars = Array.from(word);
            for (const char of chars) {
                const charWidth = ctx.measureText(char).width;

                glyphs.push({
                    char,
                    x: currentX,
                    y: currentY,
                    width: charWidth,
                    height: charHeight,
                    style: span.style,
                    row: currentRow
                });

                currentX += charWidth;
            }
        }
    }

    // Final dimensions
    const totalHeight = currentY + (maxLineHeight || (baseFontSize * lineHeightMulti));

    // Calculate true max width found
    glyphs.forEach(g => {
        if (g.x + g.width > maxWidthFound) maxWidthFound = g.x + g.width;
    });

    return {
        glyphs,
        width: maxWidthFound,
        height: totalHeight,
        lines: currentRow + 1
    };
}

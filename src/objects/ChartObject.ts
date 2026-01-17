import { KinetixObject } from "./Object";
import { PropertySchema } from "../types/Interfaces";

export type ChartType = "bar" | "line" | "area" | "scatter" | "pie" | "donut";

export class ChartObject extends KinetixObject {
    chartType: ChartType = "bar";
    data: number[] = [10, 25, 40, 30, 60];
    labels: string[] = ["A", "B", "C", "D", "E"];

    // Customization
    color: string = "#3b82f6"; // Base color
    useMultiColor: boolean = false;
    colorPalette: string[] = ["#3B82F6", "#EC4899", "#10B981", "#F59E0B", "#8B5CF6"];
    customColors: string[] = []; // Individual overrides

    fontFamily: string = "Inter";
    fontSize: number = 12;
    axisColor: string = "#666666";
    showGrid: boolean = true;
    textColor: string = "#ffffff"; // Added for better visibility

    // New Properties
    labelPosition: "axis" | "top" | "center" = "axis";
    innerRadius: number = 0.6; // For donut (0-1 relative to radius)
    lineWidth: number = 3;

    constructor(id: string, type: ChartType = "bar") {
        super(id, "Chart");
        this.chartType = type;
        this.width = 400;
        this.height = 300;

        // Default animation
        this.animation = {
            type: "grow",
            duration: 1000,
            delay: 0,
            easing: "linear"
        };
    }

    draw(ctx: CanvasRenderingContext2D, time: number): void {
        const { type, duration, delay } = this.animation;

        let globalProgress = 1;
        if (type !== 'none') {
            const t = time - delay;
            if (t <= 0) globalProgress = 0;
            else if (t >= duration) globalProgress = 1;
            else globalProgress = t / duration;

            // Easing (Simple EaseOutCubic)
            globalProgress = 1 - Math.pow(1 - globalProgress, 3);
        }

        ctx.save();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate((this.rotation || 0) * Math.PI / 180);
        // Scale handled by object transform usually, but draw logic uses width/height
        // If we want scale animation:
        if (type === 'scaleIn') {
            ctx.scale(globalProgress, globalProgress);
        }

        ctx.translate(-cx, -cy);
        ctx.globalAlpha = this.opacity;

        const padding = { top: 20, right: 20, bottom: 40, left: 40 };
        const chartWidth = this.width - padding.left - padding.right;
        const chartHeight = this.height - padding.top - padding.bottom;
        const startX = this.x + padding.left;
        const startY = this.y + padding.top;
        const maxVal = Math.max(...this.data) * 1.1 || 10;

        // --- AXES & GRID (Cartesian only) ---
        if (["bar", "line", "area", "scatter"].includes(this.chartType)) {
            // Draw Axess
            ctx.beginPath();
            ctx.strokeStyle = this.axisColor;
            ctx.lineWidth = 1;
            ctx.moveTo(startX, startY + chartHeight);
            ctx.lineTo(startX + chartWidth, startY + chartHeight); // X Axis
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX, startY + chartHeight); // Y Axis
            ctx.stroke();

            // Draw Grid
            if (this.showGrid) {
                ctx.beginPath();
                ctx.strokeStyle = this.axisColor;
                ctx.lineWidth = 0.5;
                ctx.globalAlpha = 0.2 * this.opacity;
                for (let i = 0; i <= 4; i++) {
                    const y = startY + chartHeight - (chartHeight * i) / 4;
                    ctx.moveTo(startX, y);
                    ctx.lineTo(startX + chartWidth, y);
                }
                ctx.stroke();
                ctx.globalAlpha = this.opacity;
            }

            // Draw Y Axis Labels
            ctx.fillStyle = this.textColor; // Update to use visible text color
            ctx.font = `${this.fontSize}px ${this.fontFamily}`;
            ctx.textAlign = "right";
            for (let i = 0; i <= 4; i++) {
                const val = Math.round((maxVal * i) / 4);
                const y = startY + chartHeight - (chartHeight * i) / 4;
                ctx.fillText(val.toString(), startX - 5, y + this.fontSize / 3);
            }
        }

        // --- BAR CHART ---
        if (this.chartType === "bar") {
            const step = chartWidth / this.data.length;
            const barWidth = step * 0.7;
            const gap = step * 0.15;

            this.data.forEach((val, i) => {
                // Staggered Animation
                let progress = globalProgress;
                if (type === 'grow') {
                    // Stagger logic inside draw is rigid. 
                    // Better to rely on global progress for simplicity in v1
                    // Or re-implement stagger if desired.
                    // Let's stick to global `grow` affects height.
                }

                const targetH = (val / maxVal) * chartHeight;
                const h = targetH * progress;

                const bx = startX + i * step + gap;
                const by = startY + chartHeight - h;

                // Color Logic
                let barColor = this.color;
                if (this.useMultiColor) {
                    barColor = this.colorPalette[i % this.colorPalette.length];
                }

                ctx.fillStyle = barColor;
                ctx.fillRect(bx, by, barWidth, h);

                // Labels
                if (this.labels[i] && this.labelPosition !== "center") {
                    ctx.fillStyle = this.textColor;
                    ctx.textAlign = "center";
                    if (this.labelPosition === "axis") {
                        ctx.fillText(this.labels[i], bx + barWidth / 2, startY + chartHeight + this.fontSize + 5);
                    } else if (this.labelPosition === "top") {
                        // Only show if bar is high enough?
                        ctx.fillText(val.toString(), bx + barWidth / 2, by - 5);
                    }
                }
            });
        }

        // --- LINE CHART (Simplified Port) ---
        if (this.chartType === "line") {
            const step = chartWidth / (this.data.length - 1 || 1);
            const points = this.data.map((val, i) => ({
                x: startX + i * step,
                y: startY + chartHeight - (val / maxVal) * chartHeight
            }));

            if (points.length > 1) {
                ctx.beginPath();
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.lineWidth;
                ctx.lineJoin = "round";
                ctx.lineCap = "round";

                // Draw clip based on progress
                const maxW = chartWidth * globalProgress;

                ctx.save();
                ctx.rect(startX, startY, maxW, chartHeight);
                ctx.clip(); // Clip everything to progress width

                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.stroke();
                ctx.restore();

                // Points
                if (this.labels.length > 0) {
                    ctx.fillStyle = this.textColor;
                    ctx.textAlign = "center";
                    points.forEach((p, i) => {
                        if (this.labels[i] && (p.x - startX) <= maxW) {
                            ctx.fillText(this.labels[i], p.x, startY + chartHeight + this.fontSize + 5);
                        }
                    });
                }
            }
        }

        // Donut/Pie would go here... (omitted for brevity in this step, can add if requested)

        ctx.restore();
    }

    clone(): KinetixObject {
        const clone = new ChartObject("clone_" + this.id, this.chartType);
        Object.assign(clone, this.toJSON());
        return clone;
    }

    toJSON() {
        const base = super.toJSON();
        base.type = "ChartObject";
        base.props = {
            ...base.props,
            chartType: this.chartType,
            data: this.data,
            labels: this.labels,
            color: this.color,
            useMultiColor: this.useMultiColor,
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            showGrid: this.showGrid,
            textColor: this.textColor
        };
        return base;
    }

    getSchema(): PropertySchema[] {
        return [
            { key: 'chartType', label: 'Type', type: 'select', options: ['bar', 'line'] }, // limit options for now
            { key: 'data', label: 'Data (CSV)', type: 'text' }, // We need to intercept this in UI
            { key: 'labels', label: 'Labels (CSV)', type: 'text' },
            { key: 'color', label: 'Color', type: 'color' },
            { key: 'textColor', label: 'Text Color', type: 'color' },
            { key: 'useMultiColor', label: 'Multi Color', type: 'boolean' },
            { key: 'showGrid', label: 'Show Grid', type: 'boolean' },
            { key: 'fontSize', label: 'Font Size', type: 'number' },
            ...super.getSchema()
        ];
    }
}

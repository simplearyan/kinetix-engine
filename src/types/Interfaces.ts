export interface Transformable {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
}

export interface Styleable {
    opacity: number;
    visible: boolean;
    // Optional style props used by various object types
    fontSize?: number;
    padding?: number;
    lineNumberMargin?: number;
    barHeight?: number;
    gap?: number;
    radius?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
}

// Combine for generic usage
export interface KinetixObjectProps extends Transformable, Styleable {
    id: string;
    name: string;
    locked: boolean;
}

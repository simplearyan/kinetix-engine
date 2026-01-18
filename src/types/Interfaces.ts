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

export interface SerializedObject {
    type: string;
    id: string;
    name: string;
    props: any;
    children?: SerializedObject[];
}

export interface ISerializable {
    toJSON(): SerializedObject;
}

export interface PropertySchema<T = any> {
    key: (keyof T & string) | (string & {}); // Preserves autocomplete while allowing paths like 'animation.type'
    label: string;
    type: 'text' | 'number' | 'color' | 'boolean' | 'select' | 'textarea';
    min?: number;
    max?: number;
    step?: number;
    options?: { label: string; value: any }[] | string[];
}

export interface EngineEvents {
    'timeUpdate': (time: number) => void;
    'playStateChange': (isPlaying: boolean) => void;
    'selectionChange': (id: string | null) => void;
    'objectChange': () => void;
    'resize': (width: number, height: number) => void;
    'durationChange': (duration: number) => void;
    // Fallback for custom events
    [key: string]: any;
}

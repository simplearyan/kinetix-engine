import type { Engine } from "./Core";
import type { SerializedObject } from "../types/Interfaces";
import { RichTextObject } from "../objects/RichTextObject";
import { VideoObject } from "../objects/VideoObject";
import { FlexContainer } from "../objects/FlexContainer";
import { KinetixObject } from "../objects/Object";

export interface SerializedProject {
    version: number;
    width: number;
    height: number;
    duration: number;
    backgroundColor: string;
    objects: SerializedObject[];
}

export class ProjectManager {
    constructor(private engine: Engine) { }

    save(): string {
        const project: SerializedProject = {
            version: 1,
            width: this.engine.scene.width,
            height: this.engine.scene.height,
            duration: this.engine.totalDuration,
            backgroundColor: this.engine.scene.backgroundColor,
            // Filter out children that are already serialized by their parents
            // Top level objects only
            objects: this.engine.scene.objects
                .filter(o => o.parent === null)
                .map(o => o.toJSON())
        };
        return JSON.stringify(project, null, 2);
    }

    load(jsonString: string) {
        try {
            const project: SerializedProject = JSON.parse(jsonString);

            // Restore Settings
            // Use resize to ensure canvas updates
            if (this.engine.scene.width !== project.width || this.engine.scene.height !== project.height) {
                this.engine.resize(project.width, project.height);
            }

            this.engine.totalDuration = project.duration;
            this.engine.scene.backgroundColor = project.backgroundColor;

            // Update UI if listeners exist
            if (this.engine.onDurationChange) this.engine.onDurationChange(project.duration);

            // Restore Objects
            this.engine.scene.objects = []; // Clear current scene

            project.objects.forEach((serialized: SerializedObject) => {
                const obj = this.createObject(serialized);
                if (obj) this.engine.scene.add(obj);
            });

            this.engine.render();
            console.log("Project loaded successfully");
        } catch (e) {
            console.error("Failed to load project", e);
        }
    }

    createObject(data: SerializedObject): KinetixObject | null {
        let obj: KinetixObject | null = null;

        // Factory Switch
        // Ideally this should be a registry we can register new types to
        switch (data.type) {
            case 'RichTextObject':
                // Constructor expects (id, text)
                // We grab text from props
                obj = new RichTextObject(data.id, data.props.text || "Text");
                break;
            case 'VideoObject':
                obj = new VideoObject(data.id, data.props.src || "");
                break;
            case 'FlexContainer':
                obj = new FlexContainer(data.id);
                break;
            default:
                console.warn(`Unknown object type: ${data.type}`);
                return null;
        }

        // Apply Props
        // We iterate props and assign. 
        // Be careful with method/readonly collisions, but for data props it's fine.
        const props = data.props as any;
        Object.keys(props).forEach(key => {
            // specific handling if needed
            if (key === 'children') return; // Handled separately? No, children are in data.children

            // Check if property exists on object to avoid setting random stuff?
            // Or just force it.
            (obj as any)[key] = props[key];
        });

        // Handle Children (Recursive)
        if (data.children && obj instanceof FlexContainer) {
            data.children.forEach(childData => {
                const child = this.createObject(childData);
                if (child) obj.add(child);
            });
        }

        return obj;
    }
}

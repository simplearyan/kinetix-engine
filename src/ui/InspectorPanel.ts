import { Engine } from "../core/Engine";
import { KinetixObject } from "../objects/Object";
import { PropertySchema } from "../types/Interfaces";

export interface InspectorStyleConfig {
    containerClass?: string;
    headerClass?: string;
    fieldWrapperClass?: string;
    labelClass?: string;
    inputClass?: string;
    selectClass?: string;
    checkboxClass?: string;
}

const DEFAULT_STYLE: InspectorStyleConfig = {
    containerClass: "p-4 space-y-4 overflow-y-auto h-full scrollbar-thin",
    headerClass: "font-bold text-white text-sm mb-2 border-b border-gray-700 pb-2",
    fieldWrapperClass: "flex flex-col gap-1",
    labelClass: "text-[10px] text-gray-400 uppercase tracking-wide",
    inputClass: "bg-[#1e1e1e] text-white text-xs rounded p-1.5 border border-gray-700 outline-none focus:border-blue-500 font-mono",
    selectClass: "bg-[#1e1e1e] text-white text-xs rounded p-1.5 border border-gray-700 outline-none focus:border-blue-500",
    checkboxClass: "cursor-pointer",
};

export class InspectorPanel {
    container: HTMLElement;
    engine: Engine;
    config: InspectorStyleConfig;
    private _currentObj: KinetixObject | null = null;

    constructor(engine: Engine, container: HTMLElement, config: InspectorStyleConfig = {}) {
        this.engine = engine;
        this.container = container;
        this.config = { ...DEFAULT_STYLE, ...config };
        this.bindEvents();
        this.renderEmpty();
    }

    bindEvents() {
        const originalOnSelectionChange = this.engine.onSelectionChange;
        this.engine.onSelectionChange = (id) => {
            originalOnSelectionChange?.(id);
            if (id) {
                const obj = this.engine.scene.get(id);
                if (obj) {
                    this.renderObject(obj);
                    return;
                }
            }
            this.renderEmpty();
        };
    }

    renderEmpty() {
        this.container.innerHTML = `
            <div class="h-full flex items-center justify-center text-gray-500 text-xs text-center p-4">
                Select an object to edit properties
            </div>
        `;
        this._currentObj = null;
    }

    renderObject(obj: KinetixObject) {
        this._currentObj = obj;
        const schema = obj.getSchema();

        this.container.innerHTML = `
            <div class="${this.config.containerClass}">
                <h3 class="${this.config.headerClass}">
                    ${obj.name} <span class="text-xs opacity-50 font-normal">(${obj.constructor.name})</span>
                </h3>
                <div class="space-y-3" id="kp-inspector-fields">
                    <!-- Fields injected here -->
                </div>
            </div>
        `;

        const fieldsContainer = this.container.querySelector("#kp-inspector-fields") as HTMLElement;

        schema.forEach(item => {
            const field = this.createField(item, obj);
            fieldsContainer.appendChild(field);
        });
    }

    refresh() {
        if (this._currentObj) {
            this.renderObject(this._currentObj);
        }
    }

    createField(item: PropertySchema, obj: any): HTMLElement {
        const wrapper = document.createElement("div");
        wrapper.className = this.config.fieldWrapperClass || "";

        const label = document.createElement("label");
        label.className = this.config.labelClass || "";
        label.innerText = item.label;
        wrapper.appendChild(label);

        // Value resolution for nested keys like "animation.type"
        const getValue = () => {
            const parts = item.key.split('.');
            let val = obj;
            for (const p of parts) {
                val = val ? val[p] : undefined;
            }
            // Auto-convert arrays to CSV string
            if (Array.isArray(val)) return val.join(', ');
            return val;
        };

        const setValue = (val: any) => {
            const parts = item.key.split('.');
            let target = obj;
            for (let i = 0; i < parts.length - 1; i++) {
                target = target[parts[i]];
            }

            const lastKey = parts[parts.length - 1];
            const currentVal = target[lastKey];

            // Auto-convert CSV string to array
            if (Array.isArray(currentVal) && typeof val === 'string') {
                const arr = val.split(',').map(s => s.trim());
                if (currentVal.length > 0 && typeof currentVal[0] === 'number') {
                    val = arr.map(n => parseFloat(n) || 0);
                } else if (currentVal.length === 0 && arr.length > 0 && !isNaN(parseFloat(arr[0]))) {
                    val = arr.map(n => parseFloat(n));
                } else {
                    val = arr;
                }
            }

            target[lastKey] = val;
            this.engine.render();
        };

        const value = getValue();

        if (item.type === 'select') {
            const select = document.createElement("select");
            select.className = this.config.selectClass || "";

            (item.options || []).forEach((opt: any) => {
                const option = document.createElement("option");
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                const optVal = typeof opt === 'string' ? opt : opt.value;
                option.value = optVal;
                option.innerText = optLabel;
                if (optVal === value) option.selected = true;
                select.appendChild(option);
            });

            select.addEventListener("change", () => setValue(select.value));
            wrapper.appendChild(select);

        } else if (item.type === 'boolean') {
            const toggle = document.createElement("input");
            toggle.type = "checkbox";
            toggle.className = this.config.checkboxClass || "";
            toggle.checked = !!value;
            toggle.addEventListener("change", () => setValue(toggle.checked));
            wrapper.appendChild(toggle);

        } else if (item.type === 'textarea' || (item.type === 'text' && Array.isArray(value))) {
            const input = document.createElement("textarea");
            input.className = `${this.config.inputClass} min-h-[60px]`;
            input.value = value || "";
            input.addEventListener("input", () => setValue(input.value));
            wrapper.appendChild(input);

        } else if (item.type === 'color') {
            const container = document.createElement("div");
            container.className = "flex items-center gap-2";

            const input = document.createElement("input");
            input.type = "color";
            input.className = "w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent";
            input.value = value || "#ffffff";
            input.addEventListener("input", () => {
                setValue(input.value);
                textDisplay.value = input.value;
            });

            const textDisplay = document.createElement("input");
            textDisplay.type = "text";
            textDisplay.className = this.config.inputClass || "";
            textDisplay.value = value || "#ffffff";
            textDisplay.addEventListener("change", () => {
                setValue(textDisplay.value);
                input.value = textDisplay.value;
            });

            container.appendChild(input);
            container.appendChild(textDisplay);
            wrapper.appendChild(container);

        } else {
            // Text / Number
            const input = document.createElement("input");
            input.type = item.type;
            if (item.min !== undefined) input.min = String(item.min);
            if (item.max !== undefined) input.max = String(item.max);
            if (item.step !== undefined) input.step = String(item.step);

            input.className = this.config.inputClass || "";
            input.value = value?.toString() || "";

            input.addEventListener("input", () => {
                const v = item.type === 'number' ? parseFloat(input.value) : input.value;
                setValue(v);
            });
            wrapper.appendChild(input);
        }

        return wrapper;
    }
}

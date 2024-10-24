import { ModalFormData } from "@minecraft/server-ui";
import { Player, RawMessage } from "@minecraft/server";

const MULTIPLY_CONSTANT = 10000


export enum FieldType {
    Slider,
    FloatSlider,
    Toggle,
    Text
}

interface ConfigTypeCommon {
    getDefault();
    setObjValue(val: any): void;

    type: FieldType;
}

export class SliderConfig implements ConfigTypeCommon {
    min: number;
    max: number;
    step: number;
    defaultValue: number | (() => number);
    setValue: ((val: number) => void);
    type: FieldType;

    constructor(min: number, max: number, step: number, defaultValue: number | (() => number), setValue: ((val: number) => void)) {
        this.min = min;
        this.max = max;
        this.step = step;
        this.defaultValue = defaultValue;
        this.setValue = setValue;
        this.type = FieldType.Slider;
    }

    getDefault() {
        if (typeof this.defaultValue === "number") {
            return this.defaultValue as number;
        }
        return this.defaultValue();
    }
    setObjValue(val: any) {
        this.setValue(val as number);
    }
}

export class FloatSliderConfig implements ConfigTypeCommon {
    min: number;
    max: number;
    step: number;
    multiplyConstant: number;
    defaultValue: number | (() => number);
    setValue: (val: number) => void;
    type: FieldType;  // Added type member

    constructor(min: number, max: number, step: number, multiplyConstant: number, defaultValue: number | (() => number), setValue: (val: number) => void) {
        this.min = min;
        this.max = max;
        this.step = step * multiplyConstant;
        this.multiplyConstant = multiplyConstant;
        this.defaultValue = defaultValue;
        this.setValue = setValue ;
        this.type = FieldType.FloatSlider;  // Set type member
    }

    getDefault() {
        if (typeof this.defaultValue === "number") {
            return this.defaultValue * this.multiplyConstant;
        }
        return this.defaultValue() * this.multiplyConstant;
    }

    setObjValue(val: any): void {
        this.setValue(val as number / this.multiplyConstant);
    }
}

export class ToggleConfig implements ConfigTypeCommon {
    defaultValue: boolean | (() => boolean);
    setValue: (val: boolean) => void;
    type: FieldType;  // Added type member

    constructor(defaultValue: boolean | (() => boolean), setValue: (val: boolean) => void) {
        this.defaultValue = defaultValue;
        this.setValue = setValue;
        this.type = FieldType.Toggle;  // Set type member
    }

    getDefault() {
        if (typeof this.defaultValue === "boolean") {
            return this.defaultValue;
        }
        return this.defaultValue();
    }

    setObjValue(val: any): void {
        this.setValue(val as boolean);
    }
}

export class TextConfig implements ConfigTypeCommon {
    placeHolder: string | RawMessage | (() => string | RawMessage);
    defaultText: string | RawMessage | (() => string | RawMessage);
    setValue: (val: string) => void;
    type: FieldType;  // Added type member

    constructor(placeHolder: string | RawMessage | (() => string | RawMessage), defaultText: string | RawMessage | (() => string | RawMessage), setValue: (val: string) => void) {
        this.placeHolder = placeHolder;
        this.defaultText = defaultText;
        this.setValue = setValue;
        this.type = FieldType.Text;  // Set type member
    }

    getDefault() {
        if (typeof this.defaultText === "function") {
            return this.defaultText();
        }
        return this.defaultText;
    }

    getPlaceHolder() {
        if (typeof this.placeHolder === "function") {
            return this.placeHolder();
        }
        return this.placeHolder;
    }

    setObjValue(val: any): void {
        this.setValue(val as string);
    }
}

export type ConfigUnion = SliderConfig | FloatSliderConfig | ToggleConfig | TextConfig; 

class Config {
    private options: Map<string, ConfigUnion>


    constructor() {
        this.options = new Map();
    }

    addConfigOption(lable: string, config: ConfigUnion): Config {
        this.options.set(lable, config);
        return this;
    }


    async show(target: Player) {
        let form = new ModalFormData();
        for (const [name, type] of this.options) {
            switch (type.type) {
                case FieldType.Slider: {
                    this.addSlider(name, type as SliderConfig, form);
                    break;
                }
                case FieldType.FloatSlider: {
                    this.addFloatSlider(name, type as FloatSliderConfig, form);
                    break;
                }
                case FieldType.Toggle: {
                    this.addToggle(name, type as ToggleConfig, form);
                    break;
                }
                case FieldType.Text: {
                    this.addTextField(name, type as TextConfig, form);
                    break;
                }
            }
        }
        form.title("Config");
        let response = await form.show(target);
        if (response.formValues === undefined) {
            return;
        }
        this.dispatchUpdateCalls(response.formValues!);
    }

    private dispatchUpdateCalls(values: (boolean | number | string)[]) {
        let idx = 0;
        for (const [_, type] of this.options) {
            type.setObjValue(values[idx]);
            idx++;
        }
    }


    private addSlider(lable: string, sliderConfig: SliderConfig, form: ModalFormData) {
        form.slider(
            lable,
            sliderConfig.min,
            sliderConfig.max,
            sliderConfig.step,
            sliderConfig.getDefault()
        )
    }

    private addFloatSlider(lable: string, sliderConfig: FloatSliderConfig, form: ModalFormData) {
        form.slider(
            lable,
            sliderConfig.min * sliderConfig.multiplyConstant,
            sliderConfig.max * sliderConfig.multiplyConstant,
            sliderConfig.step,
            sliderConfig.getDefault()
        )
    }

    private addToggle(lable: string, toggleConfig: ToggleConfig, form: ModalFormData) {
        form.toggle(lable, toggleConfig.getDefault());
    }

    private addTextField(lable: string, textConfig: TextConfig, form: ModalFormData) {
        form.textField(lable, 
            textConfig.getPlaceHolder(),
            textConfig.getDefault()
        )
    }
}


export let terrainConfig = new Config();

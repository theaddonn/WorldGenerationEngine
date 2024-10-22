


class DebugRendering {
    private lineList: String[];
    private variableList: Map<string, any>;

    constructor() {this.lineList = []; this.variableList = new Map();}

    update(key: string, val: any): DebugRendering {
        this.variableList.set(`${key}:`, val);
        return this;
    }

    line(fullLine: string): DebugRendering {
        this.lineList.push(fullLine)
        return this;
    }


    build(): string {
        let returnStr = "";

        for (const str of this.lineList) {
            returnStr += `${str}\n`;
        }

        for (const [name, value] of this.variableList) {
            returnStr += `${name} ${value}\n`;
        }
        this.lineList.length = 0;
        this.variableList.clear();
        return returnStr;
    }
}


export let debug = new DebugRendering();
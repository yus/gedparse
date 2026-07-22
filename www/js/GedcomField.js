export class GedcomField {
    #tag;
    #value;
    #children;
    #parent;

    constructor(tag, value = '', parent = null) {
        this.#tag = tag;
        this.#value = value;
        this.#children = [];
        this.#parent = parent;
    }

    get tag() { return this.#tag; }
    get value() { return this.#value; }
    get children() { return this.#children; }
    get parent() { return this.#parent; }

    set value(newValue) { this.#value = newValue; }
    set parent(newParent) { this.#parent = newParent; }

    addChild(child) {
        if (!(child instanceof GedcomField)) {
            throw new Error('Child must be GedcomField instance');
        }
        child.parent = this;
        this.#children.push(child);
        return this;
    }

    findChildrenByTag(tag) {
        return this.#children.filter(child => child.tag === tag);
    }

    removeChildrenByTag(tag) {
        this.#children = this.#children.filter(child => child.tag !== tag);
        return this;
    }

    toObject() {
        return {
            tag: this.#tag,
            value: this.#value,
            children: this.#children.map(child => child.toObject())
        };
    }

    toString(indent = 0) {
        const spaces = '  '.repeat(indent);
        let result = `${spaces}${this.#tag}${this.#value ? ' ' + this.#value : ''}`;
        for (const child of this.#children) {
            result += '\n' + child.toString(indent + 1);
        }
        return result;
    }
}

// Global class
if (typeof window !== 'undefined') {
    window.GedcomField = GedcomField;
}

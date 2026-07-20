import { GedcomField } from './GedcomField.js';

export class GedcomRecord {
    #id;
    #type;
    #fields;
    #rawLine;

    constructor(id, type, fields = []) {
        this.#id = id;
        this.#type = type;
        this.#fields = fields;
        this.#rawLine = '';
    }

    get id() { return this.#id; }
    get type() { return this.#type; }
    get fields() { return this.#fields; }
    get rawLine() { return this.#rawLine; }

    set rawLine(line) { this.#rawLine = line; }

    addField(field) {
        if (!(field instanceof GedcomField)) {
            throw new Error('Field must be GedcomField instance');
        }
        this.#fields.push(field);
        return this;
    }

    findFieldsByTag(tag) {
        return this.#fields.filter(field => field.tag === tag);
    }

    findFirstFieldByTag(tag) {
        return this.#fields.find(field => field.tag === tag);
    }

    toObject() {
        return {
            id: this.#id,
            type: this.#type,
            fields: this.#fields.map(field => field.toObject())
        };
    }

    toString() {
        let result = `0 ${this.#id} ${this.#type}`;
        for (const field of this.#fields) {
            result += '\n' + field.toString(1);
        }
        return result;
    }
}

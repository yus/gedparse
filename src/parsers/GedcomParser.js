import { GedcomRecord } from '../models/GedcomRecord.js';
import { GedcomField } from '../models/GedcomField.js';

export class GedcomParser {
    #records;
    #lineNumber;

    constructor() {
        this.#records = [];
        this.#lineNumber = 0;
    }

    parse(content) {
        this.#records = [];
        this.#lineNumber = 0;
        
        const lines = content.split('\n');
        const recordStack = [];
        let currentRecord = null;
        let fieldStack = [];

        for (const line of lines) {
            this.#lineNumber++;
            const trimmed = line.trim();
            if (!trimmed) continue;

            const parsed = this.#parseLine(trimmed);
            if (!parsed) continue;

            const { level, tag, value } = parsed;

            if (level === 0) {
                // Новая запись
                const [id, type] = this.#parseRecordHeader(tag, value);
                currentRecord = new GedcomRecord(id, type);
                currentRecord.rawLine = trimmed;
                this.#records.push(currentRecord);
                
                // Сбрасываем стек полей
                recordStack.length = 0;
                fieldStack = [currentRecord.fields];
                recordStack.push(currentRecord.fields);
            } else {
                // Поле внутри записи
                if (!currentRecord) {
                    throw new Error(`Record not started at line ${this.#lineNumber}`);
                }

                // Поднимаемся на нужный уровень
                while (fieldStack.length > level) {
                    fieldStack.pop();
                }

                const parent = fieldStack[fieldStack.length - 1];
                const field = new GedcomField(tag, value);
                
                // Добавляем поле в родителя
                if (Array.isArray(parent)) {
                    parent.push(field);
                } else if (parent instanceof GedcomField) {
                    parent.addChild(field);
                }

                // Обновляем стек для следующего уровня
                if (fieldStack.length <= level) {
                    fieldStack.push(field);
                } else {
                    fieldStack[fieldStack.length - 1] = field;
                }
            }
        }

        return this.#records;
    }

    #parseLine(line) {
        const parts = line.split(' ');
        if (parts.length < 2) return null;

        const level = parseInt(parts[0]);
        if (isNaN(level)) return null;

        const tag = parts[1];
        const value = parts.slice(2).join(' ');

        return { level, tag, value };
    }

    #parseRecordHeader(tag, value) {
        if (tag.startsWith('@') && tag.endsWith('@')) {
            // ID найден, тип идет дальше
            return [tag, value];
        }
        // Нет ID, это просто тип записи
        return ['', tag];
    }

    get records() {
        return this.#records;
    }

    get lineCount() {
        return this.#lineNumber;
    }

    getStats() {
        const stats = {
            total: this.#records.length,
            byType: {}
        };

        for (const record of this.#records) {
            stats.byType[record.type] = (stats.byType[record.type] || 0) + 1;
        }

        return stats;
    }
}

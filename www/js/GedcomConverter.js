class GedcomConverter {
    #warnings;
    #conversionLog;

    constructor() {
        this.#warnings = [];
        this.#conversionLog = [];
    }

    convert551to700(records) {
        this.#warnings = [];
        this.#conversionLog = [];
        
        const converted = [];
        const newRecords = [];

        for (const record of records) {
            const newRecord = this.#convertRecord(record, newRecords);
            converted.push(newRecord);
        }

        converted.push(...newRecords);

        return {
            records: converted,
            warnings: this.#warnings,
            log: this.#conversionLog
        };
    }

    #convertRecord(record, newRecords) {
        const newRecord = new GedcomRecord(record.id, record.type);

        for (const field of record.fields) {
            const converted = this.#convertField(field, record.id, newRecords);
            if (converted) {
                newRecord.addField(converted);
            }
        }

        return newRecord;
    }

    #convertField(field, recordId, newRecords) {
        switch (field.tag) {
            case 'NAME':
                return this.#convertName(field, recordId);
            
            case 'AFN':
            case 'RFN':
            case 'RIN':
                return this.#convertIdField(field, recordId);
            
            case 'RELA':
                return this.#convertRela(field, recordId);
            
            case 'NOTE':
                return this.#convertNote(field, recordId);
            
            case 'OBJE':
                return this.#convertObje(field, recordId, newRecords);
            
            case 'SOUR':
                return this.#convertSour(field, recordId, newRecords);
            
            case 'AGE':
                return this.#convertAge(field, recordId);
            
            case 'SEX':
                return this.#convertSex(field, recordId);
            
            case 'DATE':
                return this.#convertDate(field, recordId);
            
            default:
                const newField = new GedcomField(field.tag, field.value);
                for (const child of field.children) {
                    const convertedChild = this.#convertField(child, recordId, newRecords);
                    if (convertedChild) {
                        newField.addChild(convertedChild);
                    }
                }
                return newField;
        }
    }

    #convertName(field, recordId) {
        const newField = new GedcomField('NAME', field.value);
        const transFields = [];

        for (const child of field.children) {
            if (child.tag === 'ROMN' || child.tag === 'FONE') {
                const lang = this.#getLanguageFromType(child);
                const trans = new GedcomField('TRAN', child.value);
                trans.addChild(new GedcomField('LANG', lang));
                transFields.push(trans);
                
                this.#log(`Конвертирован ${child.tag} в TRAN с LANG=${lang}`, recordId);
            } else {
                const newChild = new GedcomField(child.tag, child.value);
                for (const subChild of child.children) {
                    newChild.addChild(new GedcomField(subChild.tag, subChild.value));
                }
                newField.addChild(newChild);
            }
        }

        for (const trans of transFields) {
            newField.addChild(trans);
        }

        return newField;
    }

    #getLanguageFromType(field) {
        const typeChild = field.children.find(c => c.tag === 'TYPE');
        if (!typeChild) return 'und';

        const type = typeChild.value;
        const langMap = {
            'hangul': 'ko-hang',
            'kana': 'ja-hrkt',
            'pinyin': 'und-Latn-pinyin',
            'romaji': 'ja-Latn',
            'wadegiles': 'zh-Latn-wadegile'
        };

        return langMap[type] || 'und';
    }

    #convertIdField(field, recordId) {
        const typeMap = {
            'AFN': 'https://gedcom.io/terms/v7/AFN',
            'RFN': 'https://gedcom.io/terms/v7/RFN',
            'RIN': 'https://gedcom.io/terms/v7/RIN'
        };

        const exid = new GedcomField('EXID', field.value);
        exid.addChild(new GedcomField('TYPE', typeMap[field.tag]));

        this.#log(`${field.tag} → EXID с TYPE=${typeMap[field.tag]}`, recordId);
        return exid;
    }

    #convertRela(field, recordId) {
        const roleMap = {
            'Witness': 'WITN',
            'Spouse': 'SPOU',
            'Child': 'CHIL',
            'Father': 'FATH',
            'Mother': 'MOTH'
        };

        const roleValue = roleMap[field.value] || 'OTHER';
        const role = new GedcomField('ROLE', roleValue);

        if (roleValue === 'OTHER') {
            role.addChild(new GedcomField('PHRASE', field.value));
            this.#warnings.push({
                recordId,
                field: 'RELA',
                message: `RELA "${field.value}" не соответствует стандартным ролям`,
                suggestion: 'Использован ROLE OTHER с PHRASE',
                severity: 'medium'
            });
        }

        this.#log(`RELA → ROLE ${roleValue}`, recordId);
        return role;
    }

    #convertNote(field, recordId) {
        if (field.value.startsWith('@') && field.value.endsWith('@')) {
            const sNote = new GedcomField('SNOTE', field.value);
            this.#log(`NOTE (указатель) → SNOTE`, recordId);
            return sNote;
        }

        return new GedcomField('NOTE', field.value);
    }

    #convertObje(field, recordId, newRecords) {
        if (field.value.startsWith('@') && field.value.endsWith('@')) {
            const newField = new GedcomField('OBJE', field.value);
            for (const child of field.children) {
                newField.addChild(new GedcomField(child.tag, child.value));
            }
            return newField;
        }

        const newId = `@O${Date.now()}${Math.random().toString(36).substr(2, 4)}@`;
        const newRecord = new GedcomRecord(newId, 'OBJE');

        const fileFields = field.children.filter(c => c.tag === 'FILE');
        for (const fileField of fileFields) {
            const newFile = new GedcomField('FILE', `file:///${fileField.value}`);
            
            for (const sub of fileField.children) {
                if (sub.tag === 'FORM') {
                    const mime = this.#convertFormat(sub.value);
                    newFile.addChild(new GedcomField('FORM', mime));
                } else if (sub.tag === 'TITL') {
                    newFile.addChild(new GedcomField('TITL', sub.value));
                } else {
                    newFile.addChild(new GedcomField(sub.tag, sub.value));
                }
            }
            
            newRecord.addField(newFile);
        }

        newRecords.push(newRecord);
        this.#log(`Создана новая OBJE запись ${newId} для не-указателя`, recordId);

        return new GedcomField('OBJE', newId);
    }

    #convertFormat(format) {
        const formatMap = {
            'bmp': 'image/bmp',
            'gif': 'image/gif',
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg',
            'ole': 'application/ole',
            'pcx': 'image/vnd.zbrush.pcx',
            'tiff': 'image/tiff',
            'wav': 'audio/wav',
            'png': 'image/png'
        };

        return formatMap[format.toLowerCase()] || 'application/octet-stream';
    }

    #convertSour(field, recordId, newRecords) {
        if (field.value.startsWith('@') && field.value.endsWith('@')) {
            const newField = new GedcomField('SOUR', field.value);
            for (const child of field.children) {
                newField.addChild(new GedcomField(child.tag, child.value));
            }
            return newField;
        }

        const newId = `@S${Date.now()}${Math.random().toString(36).substr(2, 4)}@`;
        const newRecord = new GedcomRecord(newId, 'SOUR');

        const title = new GedcomField('TITL', field.value);
        
        for (const child of field.children) {
            if (child.tag === 'TEXT') {
                title.addChild(new GedcomField('TEXT', child.value));
            }
        }

        newRecord.addField(title);
        newRecords.push(newRecord);

        this.#log(`Создана новая SOUR запись ${newId} для не-указателя`, recordId);
        return new GedcomField('SOUR', newId);
    }

    #convertAge(field, recordId) {
        const ageMap = {
            'CHILD': '< 8y',
            'INFANT': '< 1y',
            'STILLBORN': '0y'
        };

        if (ageMap[field.value]) {
            const newAge = new GedcomField('AGE', ageMap[field.value]);
            newAge.addChild(new GedcomField('PHRASE', field.value));

            this.#warnings.push({
                recordId,
                field: 'AGE',
                message: `AGE "${field.value}" заменен на "${ageMap[field.value]}"`,
                suggestion: 'Используйте числовые значения возраста',
                severity: 'high'
            });

            this.#log(`AGE ${field.value} → ${ageMap[field.value]} с PHRASE`, recordId);
            return newAge;
        }

        return new GedcomField('AGE', field.value);
    }

    #convertSex(field, recordId) {
        const sex = field.value.toUpperCase();
        const validSex = ['M', 'F', 'X', 'U'];
        
        if (validSex.includes(sex)) {
            return new GedcomField('SEX', sex);
        }

        let newSex = 'U';
        if (sex.startsWith('M')) newSex = 'M';
        else if (sex.startsWith('F')) newSex = 'F';
        else if (sex.startsWith('X')) newSex = 'X';

        this.#warnings.push({
            recordId,
            field: 'SEX',
            message: `SEX "${field.value}" заменен на "${newSex}"`,
            suggestion: 'Используйте M, F, X или U',
            severity: 'high'
        });

        this.#log(`SEX ${field.value} → ${newSex}`, recordId);
        return new GedcomField('SEX', newSex);
    }

    #convertDate(field, recordId) {
        let value = field.value;

        // Обработка BET
        if (value.includes('BET') && value.includes('AND')) {
            const orderCheck = DateUtils.checkBetOrder(value);
            if (!orderCheck.valid && orderCheck.suggestion) {
                value = orderCheck.suggestion;
                this.#warnings.push({
                    recordId,
                    field: 'DATE',
                    message: 'Порядок дат в BET исправлен',
                    suggestion: `Использован ${value}`,
                    severity: 'high'
                });
                this.#log(`BET порядок исправлен: ${field.value} → ${value}`, recordId);
            }
        }

        // Обработка ROMAN календаря
        if (value.includes('@#ROMAN@')) {
            value = value.replace('@#ROMAN@', '_ROMAN');
            this.#warnings.push({
                recordId,
                field: 'DATE',
                message: 'Календарь ROMAN заменен на _ROMAN',
                suggestion: 'Используйте _ROMAN как расширение',
                severity: 'medium'
            });
            this.#log(`ROMAN → _ROMAN`, recordId);
        }

        // Обработка UNKNOWN календаря
        if (value.includes('@#UNKNOWN@')) {
            value = value.replace('@#UNKNOWN@', '_UNKNOWN');
            this.#warnings.push({
                recordId,
                field: 'DATE',
                message: 'Календарь UNKNOWN заменен на _UNKNOWN',
                suggestion: 'Используйте _UNKNOWN как расширение',
                severity: 'medium'
            });
            this.#log(`UNKNOWN → _UNKNOWN`, recordId);
        }

        // Обработка двойных дат
        if (DateUtils.isDualDate(value)) {
            const parsed = DateUtils.parseGedcomDate(value);
            if (parsed && parsed.type === 'dual') {
                const newDate = value.replace(/(\d{4})\/(\d)/, '$1$2');
                
                const dateField = new GedcomField('DATE', newDate);
                dateField.addChild(new GedcomField('PHRASE', value));
                
                this.#warnings.push({
                    recordId,
                    field: 'DATE',
                    message: `Двойная дата "${value}" преобразована`,
                    suggestion: 'Используйте DATE с PHRASE',
                    severity: 'medium'
                });
                
                this.#log(`Двойная дата: ${value} → DATE ${newDate} с PHRASE`, recordId);
                return dateField;
            }
        }

        return new GedcomField('DATE', value);
    }

    #log(message, recordId) {
        this.#conversionLog.push({
            recordId,
            message,
            timestamp: new Date().toISOString()
        });
    }

    get warnings() {
        return this.#warnings;
    }

    get conversionLog() {
        return this.#conversionLog;
    }
}

window.GedcomConverter = GedcomConverter;

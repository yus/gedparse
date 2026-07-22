class MigrationValidator {
    #warnings;

    constructor() {
        this.#warnings = [];
    }

    validate(records) {
        this.#warnings = [];

        for (const record of records) {
            this.#validateRecord(record);
        }

        return this.#warnings;
    }

    #validateRecord(record) {
        for (const field of record.fields) {
            this.#validateField(field, record.id);
            
            for (const child of field.children) {
                this.#validateField(child, record.id);
            }
        }
    }

    #validateField(field, recordId) {
        switch (field.tag) {
            case 'NAME':
                this.#validateName(field, recordId);
                break;
            case 'SEX':
                this.#validateSex(field, recordId);
                break;
            case 'DATE':
                this.#validateDate(field, recordId);
                break;
            case 'AGE':
                this.#validateAge(field, recordId);
                break;
            case 'RESN':
                this.#validateResn(field, recordId);
                break;
            case 'PEDI':
                this.#validatePedi(field, recordId);
                break;
            case 'FAMC':
                this.#validateStat(field, recordId);
                break;
        }

        const obsoleteTags = ['ROMN', 'FONE', 'AFN', 'RFN', 'RIN', 'RELA', 'SUBN'];
        if (obsoleteTags.includes(field.tag)) {
            this.#warnings.push({
                recordId,
                field: field.tag,
                value: field.value,
                message: `Устаревший тег ${field.tag} обнаружен`,
                suggestion: this.#getSuggestion(field.tag),
                severity: 'high'
            });
        }
    }

    #validateName(field, recordId) {
        const surnFields = field.children.filter(c => c.tag === 'SURN');
        for (const surn of surnFields) {
            if (surn.value.includes(',')) {
                this.#warnings.push({
                    recordId,
                    field: 'SURN',
                    value: surn.value,
                    message: 'SURN содержит запятые, что может означать множественные фамилии',
                    suggestion: 'Разделите на несколько SURN полей',
                    severity: 'medium'
                });
            }
        }

        const givnFields = field.children.filter(c => c.tag === 'GIVN');
        for (const givn of givnFields) {
            if (givn.value.includes(' ')) {
                this.#warnings.push({
                    recordId,
                    field: 'GIVN',
                    value: givn.value,
                    message: 'GIVN содержит пробелы, возможно множественные имена',
                    suggestion: 'Рассмотрите разделение на несколько GIVN полей',
                    severity: 'low'
                });
            }
        }
    }

    #validateSex(field, recordId) {
        const sex = field.value.toUpperCase();
        const validSex = ['M', 'F', 'X', 'U'];
    
        if (!validSex.includes(sex)) {
            this.#warnings.push({
                recordId,
                field: 'SEX',
                value: field.value,
                message: `Некорректное значение SEX: "${field.value}"`,
                suggestion: 'Используйте M, F, X или U',
                severity: 'high'
            });
        }
    }

    #validateDate(field, recordId) {
        const value = field.value;

        // Проверка календарей
        const calendar = DateUtils.getCalendar(value);
        if (calendar === 'roman') {
            this.#warnings.push({
                recordId,
                field: 'DATE',
                value: field.value,
                message: 'Календарь ROMAN не поддерживается в 7.0',
                suggestion: 'Замените на _ROMAN',
                severity: 'medium'
            });
        }

        if (calendar === 'unknown') {
            this.#warnings.push({
                recordId,
                field: 'DATE',
                value: field.value,
                message: 'Календарь UNKNOWN не поддерживается в 7.0',
                suggestion: 'Замените на _UNKNOWN',
                severity: 'medium'
            });
        }

        // Проверка двойных дат
        if (DateUtils.isDualDate(value)) {
            this.#warnings.push({
                recordId,
                field: 'DATE',
                value: field.value,
                message: 'Обнаружена двойная дата (формат YYYY/YY)',
                suggestion: 'Используйте DATE с PHRASE для хранения оригинального формата',
                severity: 'medium'
            });
        }

        // Проверка BET порядка
        if (value.includes('BET') && value.includes('AND')) {
            const orderCheck = DateUtils.checkBetOrder(value);
            if (!orderCheck.valid) {
                this.#warnings.push({
                    recordId,
                    field: 'DATE',
                    value: field.value,
                    message: orderCheck.message || 'Порядок дат в BET нарушен',
                    suggestion: orderCheck.suggestion || 'Поменяйте местами даты',
                    severity: 'high'
                });
            }
        }
    }

    #validateAge(field, recordId) {
        const ageWords = ['CHILD', 'INFANT', 'STILLBORN'];
        if (ageWords.includes(field.value)) {
            const suggestions = {
                'CHILD': '< 8y',
                'INFANT': '< 1y',
                'STILLBORN': '0y'
            };
            
            this.#warnings.push({
                recordId,
                field: 'AGE',
                value: field.value,
                message: `AGE "${field.value}" устарел в 7.0`,
                suggestion: `Используйте числовое значение (например, ${suggestions[field.value]}) с PHRASE`,
                severity: 'high'
            });
        }
    }

    #validateResn(field, recordId) {
        const validResn = ['CONFIDENTIAL', 'LOCKED', 'PRIVACY'];
        const value = field.value.toUpperCase();
        
        if (!validResn.includes(value)) {
            this.#warnings.push({
                recordId,
                field: 'RESN',
                value: field.value,
                message: 'RESN должен быть в верхнем регистре',
                suggestion: `Замените на ${value.toUpperCase()}`,
                severity: 'low'
            });
        }
    }

    #validatePedi(field, recordId) {
        const validPedi = ['BIRTH', 'ADOPTED', 'FOSTER', 'SEALED', 'UNKNOWN'];
        const value = field.value.toUpperCase();
        
        if (!validPedi.includes(value)) {
            this.#warnings.push({
                recordId,
                field: 'PEDI',
                value: field.value,
                message: 'PEDI должен быть в верхнем регистре',
                suggestion: `Замените на ${value.toUpperCase()}`,
                severity: 'low'
            });
        }
    }

    #validateStat(field, recordId) {
        const statChild = field.children.find(c => c.tag === 'STAT');
        if (statChild) {
            const value = statChild.value.toUpperCase();
            if (value === 'CHALLENGED' || value === 'DNS_CAN' || value === 'PRE_1970') {
                // OK - already uppercase
            } else if (value === 'dns/can' || value === 'pre-1970' || value === 'challenged') {
                this.#warnings.push({
                    recordId,
                    field: 'STAT',
                    value: statChild.value,
                    message: 'STAT должен быть в верхнем регистре',
                    suggestion: `Замените на ${value.toUpperCase().replace('/', '_').replace('-', '_')}`,
                    severity: 'low'
                });
            }
        }
    }

    #getSuggestion(tag) {
        const suggestions = {
            'ROMN': 'Замените на TRAN с LANG ja-Latn',
            'FONE': 'Замените на TRAN с LANG ja-hrkt',
            'AFN': 'Замените на EXID с TYPE https://gedcom.io/terms/v7/AFN',
            'RFN': 'Замените на EXID с TYPE https://gedcom.io/terms/v7/RFN',
            'RIN': 'Замените на EXID с TYPE https://gedcom.io/terms/v7/RIN',
            'RELA': 'Замените на ROLE с соответствующим значением',
            'SUBN': 'Удалите или замените на расширение'
        };
        return suggestions[tag] || 'Смотрите документацию по миграции';
    }

    generateReport() {
        if (this.#warnings.length === 0) {
            return '✅ Нет предупреждений. Файл готов к миграции.';
        }

        const bySeverity = {
            high: this.#warnings.filter(w => w.severity === 'high'),
            medium: this.#warnings.filter(w => w.severity === 'medium'),
            low: this.#warnings.filter(w => w.severity === 'low')
        };

        let report = '⚠️ ОТЧЕТ ПО МИГРАЦИИ\n';
        report += '═'.repeat(50) + '\n\n';

        for (const [severity, warnings] of Object.entries(bySeverity)) {
            if (warnings.length === 0) continue;
            
            const emoji = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
            report += `${emoji} ${severity.toUpperCase()} (${warnings.length})\n`;
            report += '─'.repeat(40) + '\n';
            
            for (const w of warnings) {
                report += `  📍 ${w.recordId || 'Unknown'}\n`;
                report += `     ${w.field}: "${w.value || ''}"\n`;
                report += `     💬 ${w.message}\n`;
                report += `     💡 ${w.suggestion}\n\n`;
            }
        }

        return report;
    }
}

window.MigrationValidator = MigrationValidator;

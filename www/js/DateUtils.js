class DateUtils {
    /**
     * Парсит дату из строки GEDCOM
     * @param {string} dateStr - строка даты
     * @returns {Object|null} - объект с parsed date или null
     */
    static parseGedcomDate(dateStr) {
        if (!dateStr) return null;

        // Убираем лишние пробелы
        dateStr = dateStr.trim();

        // Проверяем на специальные значения
        if (dateStr === 'BEF' || dateStr === 'AFN' || dateStr === 'ABT') {
            return { type: 'approx', value: dateStr };
        }

        // Проверяем на BET ... AND ...
        const betMatch = dateStr.match(/BET\s+(.+?)\s+AND\s+(.+)/);
        if (betMatch) {
            const [_, date1, date2] = betMatch;
            const d1 = this.parseGedcomDate(date1);
            const d2 = this.parseGedcomDate(date2);
            return {
                type: 'range',
                start: d1,
                end: d2,
                raw: dateStr
            };
        }

        // Проверяем на двойные даты (1648/9)
        if (/\d{4}\/\d/.test(dateStr)) {
            const match = dateStr.match(/(\d{4})\/(\d)/);
            if (match) {
                const [_, year, alt] = match;
                return {
                    type: 'dual',
                    year: parseInt(year),
                    alt: parseInt(alt),
                    raw: dateStr
                };
            }
        }

        // Обычная дата
        const dateParts = dateStr.split(' ');
        if (dateParts.length === 3) {
            // DAY MONTH YEAR
            const [day, month, year] = dateParts;
            return {
                type: 'exact',
                day: parseInt(day),
                month: month,
                year: parseInt(year),
                raw: dateStr
            };
        } else if (dateParts.length === 2) {
            // MONTH YEAR
            const [month, year] = dateParts;
            return {
                type: 'partial',
                month: month,
                year: parseInt(year),
                raw: dateStr
            };
        } else if (dateParts.length === 1) {
            // YEAR или SPECIAL
            if (/^\d{4}$/.test(dateStr)) {
                return {
                    type: 'year',
                    year: parseInt(dateStr),
                    raw: dateStr
                };
            }
            return {
                type: 'special',
                value: dateStr,
                raw: dateStr
            };
        }

        return null;
    }

    /**
     * Сравнивает две даты (для проверки порядка)
     * @param {string|Object} date1 - первая дата
     * @param {string|Object} date2 - вторая дата
     * @returns {number} - -1 если date1 < date2, 0 если равны, 1 если date1 > date2
     */
    static compareDates(date1, date2) {
        const d1 = typeof date1 === 'string' ? this.parseGedcomDate(date1) : date1;
        const d2 = typeof date2 === 'string' ? this.parseGedcomDate(date2) : date2;

        if (!d1 || !d2) return 0;

        // Получаем числовые значения для сравнения
        const val1 = this.#getNumericValue(d1);
        const val2 = this.#getNumericValue(d2);

        if (val1 === null || val2 === null) return 0;
        return val1 > val2 ? 1 : val1 < val2 ? -1 : 0;
    }

    /**
     * Проверяет, является ли строка валидной датой GEDCOM
     */
    static isValidGedcomDate(dateStr) {
        if (!dateStr) return false;
        const parsed = this.parseGedcomDate(dateStr);
        return parsed !== null;
    }

    /**
     * Конвертирует дату в ISO формат (для отображения)
     */
    static toISO(dateStr) {
        const parsed = this.parseGedcomDate(dateStr);
        if (!parsed) return dateStr;

        switch (parsed.type) {
            case 'exact':
                const monthNum = this.#getMonthNumber(parsed.month);
                return `${parsed.year}-${String(monthNum).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
            case 'partial':
                const mNum = this.#getMonthNumber(parsed.month);
                return `${parsed.year}-${String(mNum).padStart(2, '0')}`;
            case 'year':
                return `${parsed.year}`;
            default:
                return dateStr;
        }
    }

    /**
     * Проверяет порядок в BET конструкции
     */
    static checkBetOrder(dateStr) {
        const parsed = this.parseGedcomDate(dateStr);
        if (!parsed || parsed.type !== 'range') {
            return { valid: false, message: 'Не является BET диапазоном' };
        }

        const d1 = parsed.start;
        const d2 = parsed.end;

        if (!d1 || !d2) {
            return { valid: false, message: 'Не удалось распарсить даты в BET' };
        }

        const comparison = this.compareDates(d1, d2);
        
        if (comparison > 0) {
            return {
                valid: false,
                message: 'Порядок дат нарушен: первая дата позже второй',
                suggestion: `BET ${d2.raw || d2} AND ${d1.raw || d1}`
            };
        }

        return { valid: true };
    }

    /**
     * Проверяет, является ли дата двойной (формат YYYY/YY)
     */
    static isDualDate(dateStr) {
        return /\d{4}\/\d/.test(dateStr);
    }

    /**
     * Проверяет календарь (ROMAN, UNKNOWN и т.д.)
     */
    static getCalendar(dateStr) {
        if (!dateStr) return 'unknown';
        
        if (dateStr.includes('@#ROMAN@')) return 'roman';
        if (dateStr.includes('@#UNKNOWN@')) return 'unknown';
        if (dateStr.includes('@#JULIAN@')) return 'julian';
        if (dateStr.includes('@#GREGORIAN@')) return 'gregorian';
        if (dateStr.includes('@#HEBREW@')) return 'hebrew';
        if (dateStr.includes('@#ISLAMIC@')) return 'islamic';
        if (dateStr.includes('@#FRENCH_R@')) return 'french_republican';
        
        return 'default';
    }

    /**
     * Получает числовое значение даты для сравнения
     * @private
     */
    static #getNumericValue(dateObj) {
        if (!dateObj) return null;

        if (dateObj.type === 'exact' || dateObj.type === 'partial' || dateObj.type === 'year') {
            let year = dateObj.year || 0;
            let month = 0;
            let day = 0;

            if (dateObj.type === 'partial' || dateObj.type === 'exact') {
                month = this.#getMonthNumber(dateObj.month);
                if (dateObj.type === 'exact') {
                    day = dateObj.day || 0;
                }
            }

            // Преобразуем в число для сравнения: YYYYMMDD
            return year * 10000 + month * 100 + day;
        }

        // Для приблизительных дат используем текстовое сравнение
        if (dateObj.type === 'approx') {
            return dateObj.value.charCodeAt(0);
        }

        return null;
    }

    /**
     * Преобразует название месяца в номер
     * @private
     */
    static #getMonthNumber(monthName) {
        if (!monthName) return 0;
        
        const months = {
            'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4,
            'MAY': 5, 'JUN': 6, 'JUL': 7, 'AUG': 8,
            'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
        };
        
        return months[monthName.toUpperCase()] || 0;
    }

    /**
     * Форматирует дату для вывода
     */
    static formatDate(dateStr) {
        if (!dateStr) return '—';
        
        const parsed = this.parseGedcomDate(dateStr);
        if (!parsed) return dateStr;

        const iso = this.toISO(dateStr);
        if (iso !== dateStr) {
            return `${iso} (${dateStr})`;
        }
        
        return dateStr;
    }
}

window.DateUtils = DateUtils;

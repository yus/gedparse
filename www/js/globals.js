// Загружаем все классы
import { GedcomField } from 'GedcomField.js';
import { GedcomRecord } from 'GedcomRecord.js';
import { GedcomParser } from 'GedcomParser.js';
import { GedcomConverter } from 'GedcomConverter.js';
import { MigrationValidator } from 'MigrationValidator.js';
import { DateUtils } from 'DateUtils.js';
import { TableRenderer } from 'TableRenderer.js';
import { FilePicker } from 'capacitor/FilePicker.js';

// Делаем их глобальными
window.GedcomField = GedcomField;
window.GedcomRecord = GedcomRecord;
window.GedcomParser = GedcomParser;
window.GedcomConverter = GedcomConverter;
window.MigrationValidator = MigrationValidator;
window.DateUtils = DateUtils;
window.TableRenderer = TableRenderer;
window.FilePicker = FilePicker;

console.log('✅ Все классы загружены глобально');

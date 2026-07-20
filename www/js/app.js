import { GedcomParser } from '../../src/parsers/GedcomParser.js';
import { GedcomConverter } from '../../src/converters/GedcomConverter.js';
import { MigrationValidator } from '../../src/validators/MigrationValidator.js';
import { CapacitorFileSystem } from './capacitor/FileSystem.js';

const parser = new GedcomParser();
const converter = new GedcomConverter();
const validator = new MigrationValidator();

let currentRecords = [];
let convertedRecords = [];
let warnings = [];

// DOM элементы
const btnLoad = document.getElementById('btnLoad');
const btnValidate = document.getElementById('btnValidate');
const btnConvert = document.getElementById('btnConvert');
const btnExport = document.getElementById('btnExport');
const statusEl = document.getElementById('status');
const tableBody = document.getElementById('tableBody');
const statsEl = document.getElementById('stats');
const recordCountEl = document.getElementById('recordCount');
const warningCountEl = document.getElementById('warningCount');

// Загрузка файла
btnLoad.addEventListener('click', async () => {
    try {
        const content = await CapacitorFileSystem.pickAndReadFile();
        if (!content) return;
        
        currentRecords = parser.parse(content);
        convertedRecords = [];
        warnings = [];
        
        renderTable(currentRecords);
        updateStatus(`Загружено: ${currentRecords.length} записей`);
        updateStats(currentRecords.length, 0);
        
        btnValidate.disabled = false;
        btnConvert.disabled = false;
        btnExport.disabled = true;
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        updateStatus('❌ Ошибка загрузки файла');
    }
});

// Проверка
btnValidate.addEventListener('click', () => {
    if (currentRecords.length === 0) {
        updateStatus('⚠️ Сначала загрузите файл');
        return;
    }
    
    warnings = validator.validate(currentRecords);
    updateStats(currentRecords.length, warnings.length);
    
    if (warnings.length === 0) {
        updateStatus('✅ Ошибок не найдено!');
    } else {
        updateStatus(`⚠️ Найдено ${warnings.length} предупреждений`);
        showWarnings(warnings);
    }
});

// Конвертация
btnConvert.addEventListener('click', () => {
    if (currentRecords.length === 0) {
        updateStatus('⚠️ Сначала загрузите файл');
        return;
    }
    
    const result = converter.convert551to700(currentRecords);
    convertedRecords = result.records;
    warnings = result.warnings;
    
    renderTable(convertedRecords);
    updateStatus(`✅ Сконвертировано: ${convertedRecords.length} записей`);
    updateStats(convertedRecords.length, warnings.length);
    
    if (warnings.length > 0) {
        showWarnings(warnings);
    }
    
    btnExport.disabled = false;
});

// Экспорт
btnExport.addEventListener('click', () => {
    if (convertedRecords.length === 0) {
        updateStatus('⚠️ Нет данных для экспорта');
        return;
    }
    
    const content = generateGedcom(convertedRecords);
    CapacitorFileSystem.saveFile('converted_7_0.ged', content);
    updateStatus('✅ Файл экспортирован!');
});

// Рендер таблицы
function renderTable(records) {
    if (records.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="empty-state">Нет записей</td></tr>';
        return;
    }
    
    tableBody.innerHTML = records.slice(0, 100).map(record => `
        <tr>
            <td class="record-id">${record.id || '—'}</td>
            <td><span class="record-type">${record.type}</span></td>
            <td class="fields-preview">
                ${record.fields.slice(0, 5).map(f => `${f.tag}:${f.value}`).join(', ')}
                ${record.fields.length > 5 ? '…' : ''}
            </td>
        </tr>
    `).join('');
    
    if (records.length > 100) {
        tableBody.innerHTML += `
            <tr><td colspan="3" style="text-align:center;color:#999;padding:16px;">
                Показано 100 из ${records.length} записей
            </td></tr>
        `;
    }
}

function updateStatus(message) {
    statusEl.textContent = message;
}

function updateStats(count, warnings) {
    statsEl.style.display = 'block';
    recordCountEl.textContent = count;
    warningCountEl.textContent = warnings;
}

function showWarnings(warnings) {
    const message = warnings.slice(0, 20).map(w => 
        `⚠️ ${w.recordId}: ${w.field} -> ${w.message}\n💡 ${w.suggestion}`
    ).join('\n\n');
    
    alert(`Найдено ${warnings.length} предупреждений:\n\n${message}`);
}

function generateGedcom(records) {
    let content = '0 HEAD\n1 GEDC\n2 VERS 7.0\n1 CHAR UTF-8\n';
    
    records.forEach(record => {
        content += `0 ${record.id} ${record.type}\n`;
        record.fields.forEach(field => {
            content += generateField(field, 1);
        });
    });
    
    content += '0 TRLR\n';
    return content;
}

function generateField(field, level) {
    const indent = '  '.repeat(level);
    let result = `${indent}${field.tag} ${field.value}\n`;
    field.children.forEach(child => {
        result += generateField(child, level + 1);
    });
    return result;
}

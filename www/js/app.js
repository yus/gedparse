import { GedcomParser } from '../../src/parsers/GedcomParser.js';
import { GedcomConverter } from '../../src/converters/GedcomConverter.js';
import { MigrationValidator } from '../../src/validators/MigrationValidator.js';
import { FilePicker } from './capacitor/FilePicker.js';

const parser = new GedcomParser();
const converter = new GedcomConverter();
const validator = new MigrationValidator();

let currentRecords = [];
let convertedRecords = [];
let warnings = [];
let currentPath = '';
let fileList = [];

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

// Создаем контейнер для файлового менеджера
const fileManagerContainer = document.createElement('div');
fileManagerContainer.id = 'fileManager';
fileManagerContainer.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    display: none;
    max-height: 300px;
    overflow-y: auto;
`;
document.querySelector('.table-container').before(fileManagerContainer);

// Загрузка файла
btnLoad.addEventListener('click', async () => {
    try {
        await showFileManager();
    } catch (error) {
        console.error('Ошибка:', error);
        updateStatus('❌ Ошибка доступа к файловой системе');
    }
});

async function showFileManager() {
    fileManagerContainer.style.display = 'block';
    await renderFileList(currentPath);
}

async function renderFileList(path) {
    try {
        const result = await FilePicker.listGedFiles(path);
        currentPath = result.currentPath;
        fileList = result.files;
        
        let html = `<div style="margin-bottom:12px;font-weight:bold;">📁 ${currentPath || 'Корень'}</div>`;
        
        // Навигация вверх
        if (currentPath) {
            const parentPath = currentPath.split('/').slice(0, -1).join('/');
            html += `
                <div style="cursor:pointer;padding:8px;border-bottom:1px solid #eee;" onclick="window.navigateTo('${parentPath}')">
                    📂 .. (наверх)
                </div>
            `;
        }
        
        // Папки
        if (result.dirs && result.dirs.length > 0) {
            result.dirs.forEach(dir => {
                html += `
                    <div style="cursor:pointer;padding:8px;border-bottom:1px solid #eee;" onclick="window.navigateTo('${dir.path}')">
                        📂 ${dir.name}
                    </div>
                `;
            });
        }
        
        // GED файлы
        if (result.files && result.files.length > 0) {
            result.files.forEach(file => {
                html += `
                    <div style="cursor:pointer;padding:8px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;" 
                         onclick="window.loadFile('${file.path}')">
                        <span>📄 ${file.name}</span>
                        <span style="color:#4CAF50;font-size:12px;">загрузить →</span>
                    </div>
                `;
            });
        } else {
            html += `<div style="padding:16px;color:#999;text-align:center;">Нет .ged файлов в этой папке</div>`;
        }
        
        fileManagerContainer.innerHTML = html;
        updateStatus(`📂 Текущая папка: ${currentPath || 'Корень'} (${result.files.length} .ged файлов)`);
        
    } catch (error) {
        console.error('Ошибка:', error);
        fileManagerContainer.innerHTML = `
            <div style="padding:16px;color:#f44336;text-align:center;">
                ❌ Ошибка доступа к папке<br>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// Глобальные функции для onclick
window.navigateTo = async function(path) {
    await renderFileList(path);
};

window.loadFile = async function(filePath) {
    try {
        updateStatus(`📖 Загрузка ${filePath}...`);
        
        const content = await FilePicker.readFile(filePath);
        if (!content) {
            updateStatus('❌ Не удалось прочитать файл');
            return;
        }
        
        currentRecords = parser.parse(content);
        convertedRecords = [];
        warnings = [];
        
        renderTable(currentRecords);
        updateStatus(`✅ Загружено: ${currentRecords.length} записей из ${filePath}`);
        updateStats(currentRecords.length, 0);
        
        btnValidate.disabled = false;
        btnConvert.disabled = false;
        btnExport.disabled = true;
        
        // Закрываем файловый менеджер после загрузки
        fileManagerContainer.style.display = 'none';
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        updateStatus(`❌ Ошибка загрузки: ${error.message}`);
    }
};

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
btnExport.addEventListener('click', async () => {
    if (convertedRecords.length === 0) {
        updateStatus('⚠️ Нет данных для экспорта');
        return;
    }
    
    try {
        const filename = prompt('Введите имя файла для сохранения:', 'converted_7_0.ged');
        if (!filename) return;
        
        const content = generateGedcom(convertedRecords);
        await FilePicker.saveFile(filename, content);
        
        updateStatus(`✅ Файл сохранен как: ${filename}`);
        alert(`✅ Файл сохранен в папке Documents как: ${filename}`);
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        updateStatus(`❌ Ошибка экспорта: ${error.message}`);
    }
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

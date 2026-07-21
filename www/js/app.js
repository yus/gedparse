import { GedcomParser } from 'js/GedcomParser.js';
import { GedcomConverter } from 'js/GedcomConverter.js';
import { MigrationValidator } from 'js/MigrationValidator.js';
import { FilePicker } from 'js/capacitor/FilePicker.js';

console.log('=== GEDParse APP START ===');
console.log('📱 Capacitor:', typeof Capacitor !== 'undefined' ? '✅' : '❌');
console.log('📁 Filesystem:', typeof Filesystem !== 'undefined' ? '✅' : '❌');
console.log('📂 Directory:', Directory);
console.log('=============================');

// Инициализация
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
    max-height: 400px;
    overflow-y: auto;
`;
document.querySelector('.table-container').before(fileManagerContainer);

// ============================================
// ФАЙЛОВЫЙ МЕНЕДЖЕР
// ============================================

// Показать файловый менеджер
btnLoad.addEventListener('click', async () => {
    try {
        await showFileManager();
    } catch (error) {
        console.error('❌ Error:', error);
        updateStatus(`❌ Ошибка: ${error.message}`);
    }
});

async function showFileManager() {
    fileManagerContainer.style.display = 'block';
    fileManagerContainer.innerHTML = '<div style="text-align:center;padding:20px;">⏳ Загрузка...</div>';
    await refreshFileList();
}

async function refreshFileList() {
    try {
        const result = await FilePicker.listGedFiles();
        console.log('📂 Files:', result);
        
        let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <div style="font-weight:bold;">📁 ${result.currentDir}</div>
                <div style="font-size:12px;color:#999;">${result.totalFiles} .ged файлов</div>
            </div>
        `;
        
        // Кнопки создания примеров
        html += `
            <div style="display:flex;gap:8px;margin-bottom:12px;">
                <button onclick="window.createSample('5.5.1')" style="flex:1;padding:8px;background:#2196F3;color:white;border:none;border-radius:4px;font-size:12px;cursor:pointer;">
                    📝 Пример 5.5.1
                </button>
                <button onclick="window.createSample('7.0')" style="flex:1;padding:8px;background:#4CAF50;color:white;border:none;border-radius:4px;font-size:12px;cursor:pointer;">
                    📝 Пример 7.0
                </button>
            </div>
        `;
        
        // Папки
        if (result.directories && result.directories.length > 0) {
            html += `<div style="margin-bottom:8px;font-size:12px;color:#666;">📂 Папки:</div>`;
            result.directories.forEach(dir => {
                html += `
                    <div style="cursor:pointer;padding:8px;border-bottom:1px solid #eee;" 
                         onclick="window.openDirectory('${dir}')">
                        📂 ${dir}
                    </div>
                `;
            });
        }
        
        // Файлы
        if (result.files && result.files.length > 0) {
            html += `<div style="margin:8px 0;font-size:12px;color:#666;">📄 Файлы:</div>`;
            result.files.forEach(file => {
                const sizeKB = (file.size / 1024).toFixed(1);
                const isSample = file.name.includes('sample');
                const icon = isSample ? '🧪' : '📄';
                html += `
                    <div style="cursor:pointer;padding:8px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;" 
                         onclick="window.loadFile('${file.name}')">
                        <span>${icon} ${file.name}</span>
                        <span style="font-size:11px;color:#999;">${sizeKB} KB</span>
                    </div>
                `;
            });
        } else {
            html += `
                <div style="padding:20px;text-align:center;color:#999;">
                    Нет .ged файлов в папке ${result.currentDir}
                    <br><br>
                    <span style="font-size:12px;">Нажмите кнопки выше, чтобы создать примеры</span>
                </div>
            `;
        }
        
        fileManagerContainer.innerHTML = html;
        updateStatus(`📂 Папка: ${result.currentDir} (${result.totalFiles} .ged файлов)`);
        
    } catch (error) {
        console.error('❌ Error:', error);
        fileManagerContainer.innerHTML = `
            <div style="padding:16px;color:#f44336;text-align:center;">
                ❌ Ошибка доступа к папке<br>
                <small>${error.message}</small>
                <br><br>
                <button onclick="window.refreshFileList()" style="padding:8px 16px;background:#2196F3;color:white;border:none;border-radius:4px;cursor:pointer;">
                    🔄 Повторить
                </button>
            </div>
        `;
    }
}

// ============================================
// СОЗДАНИЕ ПРИМЕРОВ
// ============================================

async function createSampleFile(version) {
    try {
        let content = '';
        let filename = '';
        
        if (version === '5.5.1') {
            filename = 'sample_5_5_1.ged';
            content = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
2 GIVN John
2 SURN Doe
1 SEX M
1 BIRT
2 DATE 15 JAN 1980
1 DEAT
2 DATE 20 MAR 2020
0 @I2@ INDI
1 NAME Mary /Smith/
2 GIVN Mary
2 SURN Smith
1 SEX F
1 BIRT
2 DATE 10 JUN 1985
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 14 FEB 2010
0 TRLR`;
        } else if (version === '7.0') {
            filename = 'sample_7_0.ged';
            content = `0 HEAD
1 GEDC
2 VERS 7.0
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
2 GIVN John
2 SURN Doe
1 SEX M
1 BIRT
2 DATE 15 JAN 1980
1 DEAT
2 DATE 20 MAR 2020
0 @I2@ INDI
1 NAME Mary /Smith/
2 GIVN Mary
2 SURN Smith
1 SEX F
1 BIRT
2 DATE 10 JUN 1985
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 14 FEB 2010
0 TRLR`;
        }
        
        await FilePicker.saveFile(filename, content);
        updateStatus(`✅ Создан пример: ${filename}`);
        await refreshFileList();
        
    } catch (error) {
        console.error('❌ Error:', error);
        updateStatus(`❌ Ошибка создания примера: ${error.message}`);
    }
}

// ============================================
// ЗАГРУЗКА ФАЙЛА
// ============================================

window.loadFile = async function(filename) {
    try {
        updateStatus(`📖 Загрузка ${filename}...`);
        const content = await FilePicker.readFile(filename);
        
        currentRecords = parser.parse(content);
        convertedRecords = [];
        warnings = [];
        
        renderTable(currentRecords);
        updateStatus(`✅ Загружено: ${currentRecords.length} записей из ${filename}`);
        updateStats(currentRecords.length, 0);
        
        btnValidate.disabled = false;
        btnConvert.disabled = false;
        btnExport.disabled = true;
        
        // Закрываем файловый менеджер
        fileManagerContainer.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Error:', error);
        updateStatus(`❌ Ошибка: ${error.message}`);
    }
};

// ============================================
// ПРОВЕРКА
// ============================================

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

// ============================================
// КОНВЕРТАЦИЯ
// ============================================

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

// ============================================
// ЭКСПОРТ
// ============================================

btnExport.addEventListener('click', async () => {
    if (convertedRecords.length === 0) {
        updateStatus('⚠️ Нет данных для экспорта');
        return;
    }
    
    try {
        const filename = prompt('Введите имя файла:', 'converted_7_0.ged');
        if (!filename) return;
        
        const content = generateGedcom(convertedRecords);
        await FilePicker.saveFile(filename, content);
        
        updateStatus(`✅ Файл сохранен как: ${filename}`);
        alert(`✅ Файл сохранен в папке Gedparse как: ${filename}`);
        
        await refreshFileList();
        
    } catch (error) {
        console.error('❌ Error:', error);
        updateStatus(`❌ Ошибка: ${error.message}`);
    }
});

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

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

function updateStats(count, warningsCount) {
    statsEl.style.display = 'block';
    recordCountEl.textContent = count;
    warningCountEl.textContent = warningsCount;
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

// ============================================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ HTML
// ============================================

window.refreshFileList = refreshFileList;
window.createSample = createSampleFile;
window.loadFile = window.loadFile;
window.openDirectory = async function(dir) {
    try {
        // Здесь можно реализовать навигацию по папкам
        updateStatus(`📂 Переход в папку ${dir}...`);
        // Пока просто обновляем список
        await refreshFileList();
    } catch (error) {
        console.error('❌ Error:', error);
        updateStatus(`❌ Ошибка: ${error.message}`);
    }
};

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

console.log('🧬 GEDParse app initialized');
updateStatus('Ожидание загрузки...');

// ============================================
// ОТЛАДКА
// ============================================

const btnDebug = document.createElement('button');
btnDebug.id = 'btnDebug';
btnDebug.className = 'btn';
btnDebug.style.cssText = 'background:#FF5722;color:white;';
btnDebug.textContent = '🐛 Отладка';
document.querySelector('.toolbar').appendChild(btnDebug);

btnDebug.addEventListener('click', async () => {
    console.log('🐛 DEBUG MODE');
    
    let debugInfo = '=== ОТЛАДКА ===\n\n';
    
    try {
        // 1. Проверяем Capacitor
        debugInfo += `📱 Capacitor: ${typeof Capacitor !== 'undefined' ? '✅' : '❌'}\n`;
        if (typeof Capacitor !== 'undefined') {
            debugInfo += `   Platform: ${Capacitor.getPlatform()}\n`;
        }
        
        // 2. Проверяем Filesystem
        debugInfo += `\n📁 Filesystem: ${typeof Filesystem !== 'undefined' ? '✅' : '❌'}\n`;
        
        // 3. Проверяем папку Gedparse
        debugInfo += '\n📂 Проверка папки Gedparse:\n';
        try {
            const result = await Filesystem.readdir({
                path: 'Gedparse',
                directory: Directory.Documents
            });
            debugInfo += `   ✅ Папка существует\n`;
            debugInfo += `   📄 Файлов: ${result.files.length}\n`;
            result.files.forEach(f => {
                debugInfo += `      - ${f.name} (${f.type})\n`;
            });
        } catch (e) {
            debugInfo += `   ❌ Папка не найдена: ${e.message}\n`;
            
            // Пробуем создать
            try {
                await Filesystem.mkdir({
                    path: 'Gedparse',
                    directory: Directory.Documents,
                    recursive: true
                });
                debugInfo += `   ✅ Папка создана!\n`;
            } catch (createError) {
                debugInfo += `   ❌ Ошибка создания: ${createError.message}\n`;
            }
        }
        
        // 4. Проверяем другие директории
        debugInfo += '\n📁 Проверка других директорий:\n';
        const dirs = ['Documents', 'Downloads', 'Data', 'Cache'];
        for (const dir of dirs) {
            try {
                const result = await Filesystem.readdir({
                    path: '',
                    directory: Directory[dir]
                });
                debugInfo += `   ✅ ${dir}: ${result.files.length} файлов\n`;
            } catch (e) {
                debugInfo += `   ❌ ${dir}: ${e.message}\n`;
            }
        }
        
        // 5. Состояние приложения
        debugInfo += '\n📊 Состояние приложения:\n';
        debugInfo += `   Записей загружено: ${currentRecords.length}\n`;
        debugInfo += `   Сконвертировано: ${convertedRecords.length}\n`;
        debugInfo += `   Предупреждений: ${warnings.length}\n`;
        
    } catch (error) {
        debugInfo += `\n❌ Ошибка отладки: ${error.message}\n`;
        console.error('Debug error:', error);
    }
    
    // Показываем в alert
    alert(debugInfo);
    
    // И в консоль
    console.log(debugInfo);
});

// Обновляем статус при запуске
updateStatus('🚀 Приложение запущено. Нажмите "Отладка" для проверки.');

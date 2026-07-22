console.log('=== GEDParse APP START ===');
console.log('📱 Capacitor:', typeof Capacitor !== 'undefined' ? '✅' : '❌');
console.log('📁 Filesystem:', Capacitor?.Plugins?.Filesystem ? '✅' : '❌');
console.log('📁 FilePicker:', Capacitor?.Plugins?.FilePicker ? '✅' : '❌');
console.log('=============================');

// Инициализация
const parser = new GedcomParser();
const converter = new GedcomConverter();
const validator = new MigrationValidator();

let currentRecords = [];
let convertedRecords = [];
let warnings = [];
let selectedFolder = null;

// DOM элементы
const btnSelectFolder = document.getElementById('btnSelectFolder');
const btnLoad = document.getElementById('btnLoad');
const btnValidate = document.getElementById('btnValidate');
const btnConvert = document.getElementById('btnConvert');
const btnExport = document.getElementById('btnExport');
const statusEl = document.getElementById('status');
const tableBody = document.getElementById('tableBody');
const statsEl = document.getElementById('stats');
const recordCountEl = document.getElementById('recordCount');
const warningCountEl = document.getElementById('warningCount');
const drawerEl = document.getElementById('drawer');

// ============================================
// КНОПКА "ВЫБРАТЬ ПАПКУ"
// ============================================

btnSelectFolder?.addEventListener('click', async () => {
    try {
        updateStatus('📁 Выберите папку с GEDCOM файлами...');
        const uri = await FilePicker.selectFolder();
        if (uri) {
            selectedFolder = uri;
            updateStatus(`✅ Выбрана папка: ${uri}`);
            await loadFilesFromFolder();
        } else {
            updateStatus('❌ Выбор папки отменен');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        updateStatus(`❌ Ошибка: ${error.message}`);
    }
});

// ============================================
// КНОПКА "ПРИМЕРЫ" 
// ============================================

btnLoad?.addEventListener('click', async () => {
    try {
        if (!selectedFolder) {
            updateStatus('⚠️ Сначала выберите папку через "📁 Выбрать папку"');
            return;
        }
        await showExamplesDrawer();
    } catch (error) {
        console.error('❌ Error:', error);
        updateStatus(`❌ Ошибка: ${error.message}`);
    }
});

// ============================================
// ЗАГРУЗКА ФАЙЛОВ ИЗ ПАПКИ
// ============================================

async function loadFilesFromFolder() {
    try {
        const result = await FilePicker.listGedFiles(selectedFolder);
        if (result.files && result.files.length > 0) {
            // Показываем файлы в таблице
            let tableHtml = '';
            result.files.forEach(file => {
                tableHtml += `
                    <tr style="cursor:pointer;" onclick="window.loadFile('${file.name}')">
                        <td>📄</td>
                        <td>${file.name}</td>
                        <td>${(file.size / 1024).toFixed(1)} KB</td>
                    </tr>
                `;
            });
            tableBody.innerHTML = tableHtml;
            updateStatus(`📂 ${result.files.length} .ged файлов в папке`);
        } else {
            tableBody.innerHTML = `<tr><td colspan="3" class="empty-state">Нет .ged файлов в папке</td></tr>`;
            updateStatus('📂 Папка пуста. Нажмите "Примеры" для создания тестовых файлов');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        updateStatus(`❌ Ошибка загрузки файлов: ${error.message}`);
    }
}

// ============================================
// ПОКАЗАТЬ DRAWER С ПРИМЕРАМИ
// ============================================

function showExamplesDrawer() {
    drawerEl.innerHTML = `
        <div style="padding:16px;background:#f5f5f5;border-radius:8px;margin-bottom:16px;">
            <div style="font-weight:bold;margin-bottom:8px;">📝 Создать примеры GEDCOM файлов</div>
            <div style="display:flex;gap:8px;">
                <button onclick="window.createSample('5.5.1')" style="flex:1;padding:8px;background:#2196F3;color:white;border:none;border-radius:4px;cursor:pointer;">
                    📝 Пример 5.5.1
                </button>
                <button onclick="window.createSample('7.0')" style="flex:1;padding:8px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;">
                    📝 Пример 7.0
                </button>
            </div>
        </div>
    `;
    drawerEl.style.display = 'block';
}

// ============================================
// СОЗДАНИЕ ПРИМЕРОВ
// ============================================

window.createSample = async function(version) {
    try {
        if (!selectedFolder) {
            updateStatus('⚠️ Сначала выберите папку через "📁 Выбрать папку"');
            return;
        }
        
        let content = '';
        let filename = '';
        
        if (version === '5.5.1') {
            filename = 'sample_5_5_1.ged';
            content = `0 HEAD\n1 GEDC\n2 VERS 5.5.1\n1 CHAR UTF-8\n0 @I1@ INDI\n1 NAME John /Doe/\n2 GIVN John\n2 SURN Doe\n1 SEX M\n1 BIRT\n2 DATE 15 JAN 1980\n1 DEAT\n2 DATE 20 MAR 2020\n0 @I2@ INDI\n1 NAME Mary /Smith/\n2 GIVN Mary\n2 SURN Smith\n1 SEX F\n1 BIRT\n2 DATE 10 JUN 1985\n1 FAMC @F1@\n0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 MARR\n2 DATE 14 FEB 2010\n0 TRLR`;
        } else if (version === '7.0') {
            filename = 'sample_7_0.ged';
            content = `0 HEAD\n1 GEDC\n2 VERS 7.0\n1 CHAR UTF-8\n0 @I1@ INDI\n1 NAME John /Doe/\n2 GIVN John\n2 SURN Doe\n1 SEX M\n1 BIRT\n2 DATE 15 JAN 1980\n1 DEAT\n2 DATE 20 MAR 2020\n0 @I2@ INDI\n1 NAME Mary /Smith/\n2 GIVN Mary\n2 SURN Smith\n1 SEX F\n1 BIRT\n2 DATE 10 JUN 1985\n1 FAMC @F1@\n0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 MARR\n2 DATE 14 FEB 2010\n0 TRLR`;
        }
        
        await FilePicker.saveFile(filename, content, selectedFolder);
        updateStatus(`✅ Создан пример: ${filename}`);
        await loadFilesFromFolder();
        drawerEl.style.display = 'none';
    } catch (error) {
        console.error('❌ Error:', error);
        updateStatus(`❌ Ошибка создания примера: ${error.message}`);
    }
};

// ============================================
// ЗАГРУЗКА ФАЙЛА
// ============================================

window.loadFile = async function(filename) {
    try {
        updateStatus(`📖 Загрузка ${filename}...`);
        const content = await FilePicker.readFile(filename, selectedFolder);
        
        currentRecords = parser.parse(content);
        convertedRecords = [];
        warnings = [];
        
        renderTable(currentRecords);
        updateStatus(`✅ Загружено: ${currentRecords.length} записей из ${filename}`);
        updateStats(currentRecords.length, 0);
        
        btnValidate.disabled = false;
        btnConvert.disabled = false;
        btnExport.disabled = true;
    } catch (error) {
        console.error('❌ Error:', error);
        updateStatus(`❌ Ошибка: ${error.message}`);
    }
};

// ============================================
// ПРОВЕРКА
// ============================================

btnValidate?.addEventListener('click', () => {
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

btnConvert?.addEventListener('click', () => {
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

btnExport?.addEventListener('click', async () => {
    if (convertedRecords.length === 0) {
        updateStatus('⚠️ Нет данных для экспорта');
        return;
    }
    
    try {
        if (!selectedFolder) {
            updateStatus('⚠️ Сначала выберите папку через "📁 Выбрать папку"');
            return;
        }
        
        const filename = prompt('Введите имя файла:', 'converted_7_0.ged');
        if (!filename) return;
        
        const content = generateGedcom(convertedRecords);
        await FilePicker.saveFile(filename, content, selectedFolder);
        
        updateStatus(`✅ Файл сохранен как: ${filename}`);
        await loadFilesFromFolder();
    } catch (error) {
        console.error('❌ Error:', error);
        updateStatus(`❌ Ошибка: ${error.message}`);
    }
});

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

function renderTable(records) {
    if (!records || records.length === 0) {
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
}

function updateStatus(message) {
    if (statusEl) statusEl.textContent = message;
}

function updateStats(count, warningsCount) {
    if (statsEl) statsEl.style.display = 'block';
    if (recordCountEl) recordCountEl.textContent = count;
    if (warningCountEl) warningCountEl.textContent = warningsCount;
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
// ИНИЦИАЛИЗАЦИЯ
// ============================================

console.log('🧬 GEDParse app initialized');
updateStatus('🚀 Выберите папку с GEDCOM файлами');

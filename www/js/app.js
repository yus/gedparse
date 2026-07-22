console.log('=== GEDParse APP START ===');
console.log('📱 Capacitor:', typeof Capacitor !== 'undefined' ? '✅' : '❌');
console.log('📁 Filesystem:', Capacitor?.Plugins?.Filesystem ? '✅' : '❌');
console.log('📁 FilePicker:', Capacitor?.Plugins?.FilePicker ? '✅' : '❌');

// Инициализация
const parser = new GedcomParser();
const converter = new GedcomConverter();
const validator = new MigrationValidator();

let currentRecords = [];
let convertedRecords = [];
let warnings = [];
let currentFolder = null;

// DOM
const menuBtn = document.getElementById('menuBtn');
const drawer = document.getElementById('drawer');
const drawerClose = document.getElementById('drawerClose');
const drawerBody = document.getElementById('drawerBody');
const statusEl = document.getElementById('status');
const tableBody = document.getElementById('tableBody');
const statsEl = document.getElementById('stats');
const recordCountEl = document.getElementById('recordCount');
const warningCountEl = document.getElementById('warningCount');

// ============================================
// DRAWER УПРАВЛЕНИЕ
// ============================================

function openDrawer(html) {
    drawerBody.innerHTML = html;
    drawer.style.display = 'flex';
}

function closeDrawer() {
    drawer.style.display = 'none';
}

menuBtn?.addEventListener('click', () => {
    showMainMenu();
});

drawerClose?.addEventListener('click', closeDrawer);

drawer?.addEventListener('click', (e) => {
    if (e.target === drawer) closeDrawer();
});

// ============================================
// ГЛАВНОЕ МЕНЮ
// ============================================

function showMainMenu() {
    openDrawer(`
        <button class="drawer-btn primary" onclick="window.selectFolder()">📁 Выбрать папку</button>
        <button class="drawer-btn secondary" onclick="window.showExamples()">📝 Создать примеры</button>
        <button class="drawer-btn warning" onclick="window.loadFilePicker()">📂 Выбрать GEDCOM файл</button>
        <hr style="margin:12px 0;">
        <button class="drawer-btn gray" onclick="window.refreshFiles()">🔄 Обновить список</button>
        <button class="drawer-btn danger" onclick="closeDrawer()">✕ Закрыть</button>
    `);
}

// ============================================
// ВЫБОР ПАПКИ
// ============================================

window.selectFolder = async function() {
    try {
        updateStatus('📁 Выберите папку...');
        const uri = await FilePicker.selectFolder();
        if (uri) {
            currentFolder = uri;
            updateStatus(`✅ Папка: ${uri}`);
            await refreshFiles();
            closeDrawer();
        } else {
            updateStatus('❌ Выбор отменен');
        }
    } catch (e) {
        updateStatus(`❌ ${e.message}`);
    }
};

// ============================================
// ОБНОВЛЕНИЕ СПИСКА ФАЙЛОВ
// ============================================

window.refreshFiles = async function() {
    if (!currentFolder) {
        updateStatus('⚠️ Сначала выберите папку');
        return;
    }
    try {
        const result = await FilePicker.listGedFiles(currentFolder);
        if (result.files && result.files.length > 0) {
            let html = '';
            result.files.forEach(file => {
                const is551 = file.name.includes('5.5.1');
                const is700 = file.name.includes('7.0');
                let badge = '<span class="badge-unknown">❓</span>';
                if (is551) badge = '<span class="badge-551">5.5.1</span>';
                else if (is700) badge = '<span class="badge-700">7.0</span>';
                
                html += `
                    <div class="file-item" onclick="window.loadFile('${file.name}')">
                        <span>📄 ${file.name}</span>
                        <span>${badge} ${(file.size/1024).toFixed(1)} KB</span>
                    </div>
                `;
            });
            // Показываем файлы в drawer
            openDrawer(`
                <h3>📂 Файлы в папке</h3>
                ${html}
                <hr style="margin:12px 0;">
                <button class="drawer-btn gray" onclick="closeDrawer()">✕ Закрыть</button>
            `);
            updateStatus(`📂 ${result.files.length} файлов найдено`);
        } else {
            updateStatus('📂 Нет .ged файлов');
            openDrawer(`
                <h3>📂 Нет файлов</h3>
                <p>В папке нет .ged файлов. Создайте примеры.</p>
                <button class="drawer-btn secondary" onclick="window.showExamples()">📝 Создать примеры</button>
                <button class="drawer-btn gray" onclick="closeDrawer()">✕ Закрыть</button>
            `);
        }
    } catch (e) {
        updateStatus(`❌ ${e.message}`);
    }
};

// ============================================
// ВЫБОР ФАЙЛА ЧЕРЕЗ СИСТЕМНЫЙ ДИАЛОГ
// ============================================

window.loadFilePicker = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ged';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            processGedcom(content, file.name);
            closeDrawer();
        };
        reader.readAsText(file);
        document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
};

// ============================================
// ЗАГРУЗКА ФАЙЛА ИЗ ПАПКИ
// ============================================

window.loadFile = async function(filename) {
    try {
        updateStatus(`📖 Загрузка ${filename}...`);
        const content = await FilePicker.readFile(filename, currentFolder);
        processGedcom(content, filename);
        closeDrawer();
    } catch (e) {
        updateStatus(`❌ ${e.message}`);
    }
};

// ============================================
// ОБРАБОТКА GEDCOM
// ============================================

function processGedcom(content, filename) {
    try {
        currentRecords = parser.parse(content);
        convertedRecords = [];
        warnings = [];
        renderTable(currentRecords);
        updateStatus(`✅ Загружено ${currentRecords.length} записей из ${filename}`);
        updateStats(currentRecords.length, 0);
        document.getElementById('btnValidate').disabled = false;
        document.getElementById('btnConvert').disabled = false;
        document.getElementById('btnExport').disabled = true;
    } catch (e) {
        updateStatus(`❌ Ошибка парсинга: ${e.message}`);
    }
};

// ============================================
// ПРИМЕРЫ
// ============================================

window.showExamples = function() {
    if (!currentFolder) {
        updateStatus('⚠️ Сначала выберите папку');
        return;
    }
    openDrawer(`
        <h3>📝 Создать примеры</h3>
        <p>Выберите версию GEDCOM для создания:</p>
        <button class="drawer-btn warning" onclick="window.createSample('5.5.1')">📝 Пример 5.5.1</button>
        <button class="drawer-btn primary" onclick="window.createSample('7.0')">📝 Пример 7.0</button>
        <hr style="margin:12px 0;">
        <button class="drawer-btn gray" onclick="closeDrawer()">✕ Закрыть</button>
    `);
};

window.createSample = async function(version) {
    try {
        let content, filename;
        if (version === '5.5.1') {
            filename = 'sample_5_5_1.ged';
            content = `0 HEAD\n1 GEDC\n2 VERS 5.5.1\n1 CHAR UTF-8\n0 @I1@ INDI\n1 NAME John /Doe/\n2 GIVN John\n2 SURN Doe\n1 SEX M\n1 BIRT\n2 DATE 15 JAN 1980\n1 DEAT\n2 DATE 20 MAR 2020\n0 @I2@ INDI\n1 NAME Mary /Smith/\n2 GIVN Mary\n2 SURN Smith\n1 SEX F\n1 BIRT\n2 DATE 10 JUN 1985\n1 FAMC @F1@\n0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 MARR\n2 DATE 14 FEB 2010\n0 TRLR`;
        } else {
            filename = 'sample_7_0.ged';
            content = `0 HEAD\n1 GEDC\n2 VERS 7.0\n1 CHAR UTF-8\n0 @I1@ INDI\n1 NAME John /Doe/\n2 GIVN John\n2 SURN Doe\n1 SEX M\n1 BIRT\n2 DATE 15 JAN 1980\n1 DEAT\n2 DATE 20 MAR 2020\n0 @I2@ INDI\n1 NAME Mary /Smith/\n2 GIVN Mary\n2 SURN Smith\n1 SEX F\n1 BIRT\n2 DATE 10 JUN 1985\n1 FAMC @F1@\n0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 MARR\n2 DATE 14 FEB 2010\n0 TRLR`;
        }
        await FilePicker.saveFile(filename, content, currentFolder);
        updateStatus(`✅ Создан: ${filename}`);
        closeDrawer();
        await refreshFiles();
    } catch (e) {
        updateStatus(`❌ ${e.message}`);
    }
};

// ============================================
// КНОПКИ (ОСТАВЛЯЕМ ТОЛЬКО ЭТИ)
// ============================================

document.getElementById('btnValidate')?.addEventListener('click', () => {
    if (!currentRecords.length) { updateStatus('⚠️ Сначала загрузите файл'); return; }
    warnings = validator.validate(currentRecords);
    updateStats(currentRecords.length, warnings.length);
    updateStatus(warnings.length ? `⚠️ ${warnings.length} предупреждений` : '✅ Ошибок нет');
    if (warnings.length) showWarnings(warnings);
});

document.getElementById('btnConvert')?.addEventListener('click', () => {
    if (!currentRecords.length) { updateStatus('⚠️ Сначала загрузите файл'); return; }
    const result = converter.convert551to700(currentRecords);
    convertedRecords = result.records;
    warnings = result.warnings;
    renderTable(convertedRecords);
    updateStatus(`✅ Сконвертировано ${convertedRecords.length} записей`);
    updateStats(convertedRecords.length, warnings.length);
    document.getElementById('btnExport').disabled = false;
});

document.getElementById('btnExport')?.addEventListener('click', async () => {
    if (!convertedRecords.length) { updateStatus('⚠️ Нет данных'); return; }
    if (!currentFolder) { updateStatus('⚠️ Выберите папку'); return; }
    const name = prompt('Имя файла:', 'converted_7_0.ged');
    if (!name) return;
    try {
        const content = generateGedcom(convertedRecords);
        await FilePicker.saveFile(name, content, currentFolder);
        updateStatus(`✅ Сохранен: ${name}`);
        await refreshFiles();
    } catch (e) { updateStatus(`❌ ${e.message}`); }
});

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ
// ============================================

function renderTable(records) {
    if (!records?.length) { tableBody.innerHTML = '<tr><td colspan="3" class="empty-state">Нет записей</td></tr>'; return; }
    tableBody.innerHTML = records.slice(0, 100).map(r => `
        <tr><td class="record-id">${r.id || '—'}</td>
        <td><span class="record-type">${r.type}</span></td>
        <td class="fields-preview">${r.fields.slice(0,5).map(f=>`${f.tag}:${f.value}`).join(', ')}${r.fields.length>5?'…':''}</td>
    </tr>`).join('');
}

function updateStatus(msg) { if (statusEl) statusEl.textContent = msg; }
function updateStats(c, w) { statsEl.style.display='block'; recordCountEl.textContent=c; warningCountEl.textContent=w; }
function showWarnings(w) { alert(w.map(w=>`⚠️ ${w.recordId}: ${w.field} -> ${w.message}\n💡 ${w.suggestion}`).join('\n\n')); }

function generateGedcom(records) {
    let c = '0 HEAD\n1 GEDC\n2 VERS 7.0\n1 CHAR UTF-8\n';
    records.forEach(r => { c += `0 ${r.id} ${r.type}\n`; r.fields.forEach(f => c += generateField(f,1)); });
    c += '0 TRLR\n';
    return c;
}

function generateField(f,l) {
    const i='  '.repeat(l); let r=`${i}${f.tag} ${f.value}\n`;
    f.children.forEach(c=>r+=generateField(c,l+1)); return r;
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

updateStatus('🚀 Откройте меню ☰ и выберите папку или файл');

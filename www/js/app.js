console.log('=== GEDParse APP START ===');

const parser = new GedcomParser();
const converter = new GedcomConverter();
const validator = new MigrationValidator();

let currentRecords = [];
let convertedRecords = [];
let warnings = [];
let currentFileName = '';
let currentVersion = '';
let selectedRecordIndex = -1;

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
const btnGraph = document.getElementById('btnGraph');
const btnEdit = document.getElementById('btnEdit');
const personCard = document.getElementById('person-card');
const personName = document.getElementById('person-name');
const personDetails = document.getElementById('person-details');
const editorModal = document.getElementById('editor-modal');
const editorBody = document.getElementById('editor-body');
const graphFullscreen = document.getElementById('graph-fullscreen');
const graphContainerFull = document.getElementById('graph-container-full');

const btnValidate = document.getElementById('btnValidate');
const btnConvert = document.getElementById('btnConvert');
const btnExport = document.getElementById('btnExport');
let network = null;

// ============================================
// DRAWER
// ============================================

function openDrawer(html) {
    drawerBody.innerHTML = html;
    drawer.style.display = 'flex';
}

function closeDrawer() { drawer.style.display = 'none'; }

menuBtn?.addEventListener('click', showMainMenu);
drawerClose?.addEventListener('click', closeDrawer);
drawer?.addEventListener('click', (e) => { if (e.target === drawer) closeDrawer(); });

// ============================================
// МЕНЮ
// ============================================

function showMainMenu() {
    openDrawer(`
        <button class="drawer-btn primary" onclick="window.pickFile()">📂 Выбрать GEDCOM файл</button>
        <button class="drawer-btn secondary" onclick="window.showExamples()">📝 Создать примеры</button>
        <hr style="margin:12px 0;">
        <button class="drawer-btn danger" onclick="closeDrawer()">✕ Закрыть</button>
    `);
}

// ============================================
// ВЫБОР ФАЙЛА
// ============================================

window.pickFile = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ged';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        currentFileName = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            processGedcom(content, file.name);
            closeDrawer();
        };
        reader.onerror = () => updateStatus('❌ Ошибка чтения файла');
        reader.readAsText(file);
        document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
};

// ============================================
// ОПРЕДЕЛЕНИЕ ВЕРСИИ
// ============================================

function detectGedcomVersion(content) {
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.includes('VERS 5.5.1')) return '5.5.1';
        if (line.includes('VERS 7.0')) return '7.0';
        if (line.includes('VERS 5.5')) return '5.5.x';
    }
    return 'unknown';
}

// ============================================
// ОБРАБОТКА GEDCOM
// ============================================

function processGedcom(content, filename) {
    try {
        currentVersion = detectGedcomVersion(content);
        currentRecords = parser.parse(content);
        convertedRecords = [];
        warnings = [];
        
        renderTable(currentRecords, currentVersion);
        updateStatus(`✅ ${filename} (${currentVersion}) — ${currentRecords.length} записей`);
        updateStats(currentRecords.length, 0);
        
        if (btnValidate) btnValidate.disabled = false;
        if (btnConvert) btnConvert.disabled = false;
        if (btnExport) btnExport.disabled = true;
        
        btnGraph.style.display = 'inline-block';
        btnEdit.style.display = 'inline-block';
        
        closeDrawer();
    } catch (e) {
        updateStatus(`❌ ${e.message}`);
        console.error(e);
    }
}

// ============================================
// ТАБЛИЦА С РЕДАКТИРОВАНИЕМ
// ============================================

function renderTable(records, version) {
    if (!records?.length) {
        tableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Нет записей</td></tr>';
        return;
    }
    
    const allTags = new Set();
    records.forEach(r => r.fields.forEach(f => allTags.add(f.tag)));
    const tagArray = Array.from(allTags).slice(0, 5); // Показываем только первые 5 полей
    
    let html = `<tr><th>#</th><th>ID</th><th>Type</th><th>Fields</th><th>Version</th></tr>`;
    
    records.slice(0, 100).forEach((r, i) => {
        const fieldStr = r.fields.slice(0, 5).map(f => `${f.tag}:${f.value}`).join(', ');
        html += `
            <tr onclick="window.showRecord(${i})" style="cursor:pointer;">
                <td>${i+1}</td>
                <td class="record-id">${r.id || '—'}</td>
                <td><span class="record-type">${r.type}</span></td>
                <td>${fieldStr}${r.fields.length > 5 ? '…' : ''}</td>
                <td><span class="badge-${version === '7.0' ? '700' : '551'}">${version || '❓'}</span></td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// ============================================
// ПОКАЗАТЬ ЗАПИСЬ (РЕДАКТОР)
// ============================================

window.showRecord = function(index) {
    selectedRecordIndex = index;
    const record = currentRecords[index];
    if (!record) return;
    
    // Показываем карточку
    personName.textContent = `${record.id || 'Unknown'} (${record.type})`;
    let details = '';
    record.fields.forEach(f => {
        details += `<div class="field"><strong>${f.tag}:</strong> ${f.value}</div>`;
        f.children.forEach(c => {
            details += `<div class="field" style="padding-left:20px;color:#666;"><strong>${c.tag}:</strong> ${c.value}</div>`;
        });
    });
    personDetails.innerHTML = details;
    personCard.style.display = 'block';
    
    // Открываем редактор
    openEditor(record);
};

function openEditor(record) {
    let html = `
        <div style="margin-bottom:8px;"><strong>ID:</strong> ${record.id}</div>
        <div style="margin-bottom:8px;"><strong>Type:</strong> ${record.type}</div>
        <div style="margin-bottom:8px;"><strong>Поля:</strong></div>
        <div id="editor-fields">
    `;
    
    record.fields.forEach((f, i) => {
        html += `
            <div class="field-row">
                <input type="text" value="${f.tag}" style="width:80px;" data-index="${i}" data-type="tag">
                <input type="text" value="${f.value}" style="flex:1;" data-index="${i}" data-type="value">
                <button onclick="window.removeField(${i})" style="background:#f44336;color:white;border:none;border-radius:4px;cursor:pointer;">✕</button>
            </div>
        `;
        f.children.forEach((c, ci) => {
            html += `
                <div class="field-row" style="padding-left:20px;">
                    <input type="text" value="${c.tag}" style="width:80px;" data-parent="${i}" data-index="${ci}" data-type="child-tag">
                    <input type="text" value="${c.value}" style="flex:1;" data-parent="${i}" data-index="${ci}" data-type="child-value">
                    <button onclick="window.removeChildField(${i}, ${ci})" style="background:#f44336;color:white;border:none;border-radius:4px;cursor:pointer;">✕</button>
                </div>
            `;
        });
    });
    
    html += `
        </div>
        <div style="margin-top:8px;">
            <button onclick="window.addField()" class="drawer-btn secondary" style="width:auto;padding:4px 12px;font-size:12px;">+ Добавить поле</button>
            <button onclick="window.addChildField()" class="drawer-btn secondary" style="width:auto;padding:4px 12px;font-size:12px;">+ Добавить дочернее</button>
        </div>
    `;
    
    editorBody.innerHTML = html;
    editorModal.style.display = 'flex';
}

// Редактор: добавление поля
window.addField = function() {
    const container = document.getElementById('editor-fields');
    const index = currentRecords[selectedRecordIndex].fields.length;
    const div = document.createElement('div');
    div.className = 'field-row';
    div.innerHTML = `
        <input type="text" placeholder="TAG" style="width:80px;" data-index="${index}" data-type="tag">
        <input type="text" placeholder="value" style="flex:1;" data-index="${index}" data-type="value">
        <button onclick="this.parentElement.remove()" style="background:#f44336;color:white;border:none;border-radius:4px;cursor:pointer;">✕</button>
    `;
    container.appendChild(div);
};

window.addChildField = function() {
    const container = document.getElementById('editor-fields');
    const parentIndex = currentRecords[selectedRecordIndex].fields.length - 1;
    const childIndex = currentRecords[selectedRecordIndex].fields[parentIndex]?.children?.length || 0;
    const div = document.createElement('div');
    div.className = 'field-row';
    div.style.paddingLeft = '20px';
    div.innerHTML = `
        <input type="text" placeholder="CHILD TAG" style="width:80px;" data-parent="${parentIndex}" data-index="${childIndex}" data-type="child-tag">
        <input type="text" placeholder="value" style="flex:1;" data-parent="${parentIndex}" data-index="${childIndex}" data-type="child-value">
        <button onclick="this.parentElement.remove()" style="background:#f44336;color:white;border:none;border-radius:4px;cursor:pointer;">✕</button>
    `;
    container.appendChild(div);
};

// Редактор: удаление поля
window.removeField = function(index) {
    if (confirm('Удалить поле?')) {
        currentRecords[selectedRecordIndex].fields.splice(index, 1);
        openEditor(currentRecords[selectedRecordIndex]);
    }
};

window.removeChildField = function(parentIndex, childIndex) {
    if (confirm('Удалить дочернее поле?')) {
        currentRecords[selectedRecordIndex].fields[parentIndex].children.splice(childIndex, 1);
        openEditor(currentRecords[selectedRecordIndex]);
    }
};

// Сохранение редактора
document.getElementById('editor-save')?.addEventListener('click', () => {
    const record = currentRecords[selectedRecordIndex];
    const inputs = document.querySelectorAll('#editor-fields .field-row');
    const newFields = [];
    let currentField = null;
    
    inputs.forEach((row, index) => {
        const tagInput = row.querySelector('[data-type="tag"]');
        const valInput = row.querySelector('[data-type="value"]');
        const childTag = row.querySelector('[data-type="child-tag"]');
        const childVal = row.querySelector('[data-type="child-value"]');
        
        if (tagInput && valInput) {
            // Основное поле
            currentField = { tag: tagInput.value, value: valInput.value, children: [] };
            newFields.push(currentField);
        } else if (childTag && childVal && currentField) {
            // Дочернее поле
            currentField.children.push({ tag: childTag.value, value: childVal.value });
        }
    });
    
    record.fields = newFields;
    renderTable(currentRecords, currentVersion);
    updateStatus('✅ Запись обновлена');
    editorModal.style.display = 'none';
    personCard.style.display = 'none';
});

document.getElementById('editor-close')?.addEventListener('click', () => {
    editorModal.style.display = 'none';
});

// ============================================
// ГРАФ
// ============================================

btnGraph?.addEventListener('click', () => {
    if (!currentRecords.length) { updateStatus('⚠️ Сначала загрузите файл'); return; }
    openGraphFullscreen(currentRecords);
});

function openGraphFullscreen(records) {
    graphFullscreen.style.display = 'flex';
    graphContainerFull.innerHTML = '';
    
    const data = buildFamilyGraph(records);
    if (data.nodes.length === 0) {
        graphContainerFull.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">Нет данных для графа</div>';
        return;
    }
    
    network = new vis.Network(graphContainerFull, data, {
        layout: { hierarchical: { enabled: true, direction: 'UD' } },
        physics: { enabled: true, stabilization: { iterations: 100 } },
        nodes: { shape: 'dot', size: 25, font: { size: 14 } },
        edges: { smooth: true }
    });
    
    network.on('click', (params) => {
        const nodeId = params.nodes[0];
        if (nodeId) {
            const record = records.find(r => r.id === nodeId);
            if (record) {
                const idx = records.indexOf(record);
                window.showRecord(idx);
            }
        }
    });
    
    setTimeout(() => network.fit(), 200);
}

// Экспорт графа в PNG
document.getElementById('graph-export-png')?.addEventListener('click', async () => {
    try {
        const canvas = graphContainerFull.querySelector('canvas');
        if (!canvas) { updateStatus('❌ Нет графа для экспорта'); return; }
        const link = document.createElement('a');
        link.download = 'family_tree.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        updateStatus('✅ Граф экспортирован как PNG');
    } catch (e) { updateStatus(`❌ ${e.message}`); }
});

document.getElementById('graph-close')?.addEventListener('click', () => {
    graphFullscreen.style.display = 'none';
    if (network) { network.destroy(); network = null; }
});

// ============================================
// ПОСТРОЕНИЕ ГРАФА
// ============================================

function buildFamilyGraph(records) {
    const nodes = [];
    const edges = [];
    const nodeIds = new Set();
    const indiRecords = records.filter(r => r.type === 'INDI');
    const famRecords = records.filter(r => r.type === 'FAM');
    
    // Узлы для людей
    indiRecords.forEach(r => {
        const id = r.id || `unknown_${Math.random()}`;
        if (!nodeIds.has(id)) {
            nodeIds.add(id);
            const nameField = r.fields.find(f => f.tag === 'NAME');
            let label = nameField ? nameField.value.split('/')[1] || nameField.value : id;
            // Добавляем ID для отображения
            label = `${label} (${id})`;
            nodes.push({ id, label, title: label });
        }
    });
    
    // Связи
    famRecords.forEach(fam => {
        const husb = fam.fields.find(f => f.tag === 'HUSB');
        const wife = fam.fields.find(f => f.tag === 'WIFE');
        const children = fam.fields.filter(f => f.tag === 'CHIL');
        if (husb && wife) edges.push({ from: husb.value, to: wife.value, label: '💑' });
        children.forEach(child => {
            if (husb) edges.push({ from: husb.value, to: child.value, label: '⬇️', dashes: true });
            if (wife) edges.push({ from: wife.value, to: child.value, label: '⬇️', dashes: true });
        });
    });
    
    return { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
}

// ============================================
// ПРИМЕРЫ
// ============================================

const SAMPLE_FILES = {
    '5.5.1': {
        name: 'sample_5_5_1.ged',
        content: `0 HEAD\n1 GEDC\n2 VERS 5.5.1\n1 CHAR UTF-8\n0 @I1@ INDI\n1 NAME John /Doe/\n2 GIVN John\n2 SURN Doe\n1 SEX M\n1 BIRT\n2 DATE 15 JAN 1980\n1 DEAT\n2 DATE 20 MAR 2020\n0 @I2@ INDI\n1 NAME Mary /Smith/\n2 GIVN Mary\n2 SURN Smith\n1 SEX F\n1 BIRT\n2 DATE 10 JUN 1985\n1 FAMC @F1@\n0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 MARR\n2 DATE 14 FEB 2010\n0 TRLR`
    },
    '7.0': {
        name: 'sample_7_0.ged',
        content: `0 HEAD\n1 GEDC\n2 VERS 7.0\n1 CHAR UTF-8\n0 @I1@ INDI\n1 NAME John /Doe/\n2 GIVN John\n2 SURN Doe\n1 SEX M\n1 BIRT\n2 DATE 15 JAN 1980\n1 DEAT\n2 DATE 20 MAR 2020\n0 @I2@ INDI\n1 NAME Mary /Smith/\n2 GIVN Mary\n2 SURN Smith\n1 SEX F\n1 BIRT\n2 DATE 10 JUN 1985\n1 FAMC @F1@\n0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 MARR\n2 DATE 14 FEB 2010\n0 TRLR`
    }
};

window.showExamples = function() {
    openDrawer(`
        <h3>📝 Создать примеры</h3>
        <p>Файлы будут скачаны в папку <strong>Downloads</strong>:</p>
        <button class="drawer-btn warning" onclick="window.createSample('5.5.1')">📝 GEDCOM 5.5.1</button>
        <button class="drawer-btn primary" onclick="window.createSample('7.0')">📝 GEDCOM 7.0</button>
        <hr style="margin:12px 0;">
        <button class="drawer-btn gray" onclick="closeDrawer()">✕ Закрыть</button>
    `);
};

window.createSample = async function(version) {
    try {
        const sample = SAMPLE_FILES[version];
        if (!sample) throw new Error('Неизвестная версия');
        const blob = new Blob([sample.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sample.name;
        a.click();
        URL.revokeObjectURL(url);
        updateStatus(`✅ Скачан: ${sample.name}`);
        closeDrawer();
    } catch (e) { updateStatus(`❌ ${e.message}`); }
};

// ============================================
// КНОПКИ
// ============================================

btnValidate?.addEventListener('click', () => {
    if (!currentRecords.length) { updateStatus('⚠️ Сначала загрузите файл'); return; }
    warnings = validator.validate(currentRecords);
    updateStats(currentRecords.length, warnings.length);
    updateStatus(warnings.length ? `⚠️ ${warnings.length} предупреждений` : '✅ Ошибок нет');
    if (warnings.length) showWarnings(warnings);
});

btnConvert?.addEventListener('click', () => {
    if (!currentRecords.length) { updateStatus('⚠️ Сначала загрузите файл'); return; }
    const result = converter.convert551to700(currentRecords);
    convertedRecords = result.records;
    warnings = result.warnings;
    renderTable(convertedRecords, '7.0');
    updateStatus(`✅ Сконвертировано ${convertedRecords.length} записей (7.0)`);
    updateStats(convertedRecords.length, warnings.length);
    if (btnExport) btnExport.disabled = false;
});

btnExport?.addEventListener('click', async () => {
    if (!convertedRecords.length) { updateStatus('⚠️ Нет данных'); return; }
    const name = prompt('Имя файла:', 'converted_7_0.ged');
    if (!name) return;
    try {
        const content = generateGedcom(convertedRecords);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        updateStatus(`✅ Файл ${name} скачан`);
    } catch (e) { updateStatus(`❌ ${e.message}`); }
});

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ
// ============================================

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

updateStatus('🚀 Откройте меню ☰ и выберите файл');
console.log('🧬 GEDParse app initialized');

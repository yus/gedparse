console.log('=== GEDParse APP START ===');
console.log('📱 Capacitor:', typeof Capacitor !== 'undefined' ? '✅' : '❌');

const parser = new GedcomParser();
const converter = new GedcomConverter();
const validator = new MigrationValidator();

let currentRecords = [];
let convertedRecords = [];
let warnings = [];
let currentFileName = '';
let currentVersion = '';

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
const graphContainer = document.getElementById('graph-container');

const btnValidate = document.getElementById('btnValidate');
const btnConvert = document.getElementById('btnConvert');
const btnExport = document.getElementById('btnExport');

// ============================================
// DRAWER
// ============================================

function openDrawer(html) {
    drawerBody.innerHTML = html;
    drawer.style.display = 'flex';
}

function closeDrawer() {
    drawer.style.display = 'none';
}

menuBtn?.addEventListener('click', showMainMenu);
drawerClose?.addEventListener('click', closeDrawer);
drawer?.addEventListener('click', (e) => {
    if (e.target === drawer) closeDrawer();
});

// ============================================
// ГЛАВНОЕ МЕНЮ
// ============================================

function showMainMenu() {
    openDrawer(`
        <button class="drawer-btn primary" onclick="window.pickFile()">📂 Выбрать GEDCOM файл</button>
        <button class="drawer-btn secondary" onclick="window.showExamples()">📝 Создать примеры</button>
        <hr style="margin:12px 0;">
        <button class="drawer-btn gray" onclick="window.showExamples()">🔄 Показать примеры</button>
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
        
        // Показываем кнопку графа
        btnGraph.style.display = 'block';
        
        openDrawer(`
            <h3>📄 ${filename}</h3>
            <p><strong>Версия:</strong> <span class="badge-${currentVersion === '7.0' ? '700' : '551'}">${currentVersion}</span></p>
            <p><strong>Записей:</strong> ${currentRecords.length}</p>
            <hr style="margin:12px 0;">
            <button class="drawer-btn gray" onclick="closeDrawer()">✕ Закрыть</button>
        `);
        
    } catch (e) {
        updateStatus(`❌ Ошибка парсинга: ${e.message}`);
        console.error(e);
    }
}

// ============================================
// ПРИМЕРЫ (СКАЧИВАЮТСЯ В DOWNLOADS)
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
        
        // Скачиваем через ссылку
        const blob = new Blob([sample.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sample.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        updateStatus(`✅ Скачан: ${sample.name}`);
        closeDrawer();
        
        setTimeout(() => {
            openDrawer(`
                <h3>✅ Файл скачан</h3>
                <p><strong>${sample.name}</strong> сохранен в <strong>Downloads</strong></p>
                <p>Теперь загрузите его через <strong>📂 Выбрать GEDCOM файл</strong></p>
                <hr style="margin:12px 0;">
                <button class="drawer-btn primary" onclick="window.pickFile(); closeDrawer();">📂 Загрузить файл</button>
                <button class="drawer-btn gray" onclick="closeDrawer()">✕ Закрыть</button>
            `);
        }, 500);
        
    } catch (e) {
        updateStatus(`❌ ${e.message}`);
        console.error(e);
    }
};

// ============================================
// ТАБЛИЦА
// ============================================

function renderTable(records, version) {
    if (!records?.length) {
        tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Нет записей</td></tr>';
        return;
    }
    
    const allTags = new Set();
    records.forEach(r => r.fields.forEach(f => allTags.add(f.tag)));
    const tagArray = Array.from(allTags);
    
    let html = `<tr><th>#</th><th>ID</th><th>Type</th>`;
    tagArray.forEach(tag => html += `<th>${tag}</th>`);
    html += `<th>Version</th></tr>`;
    
    records.slice(0, 100).forEach((r, i) => {
        html += `<tr><td>${i+1}</td><td class="record-id">${r.id || '—'}</td><td><span class="record-type">${r.type}</span></td>`;
        tagArray.forEach(tag => {
            const field = r.fields.find(f => f.tag === tag);
            html += `<td>${field ? field.value : '—'}</td>`;
        });
        html += `<td><span class="badge-${version === '7.0' ? '700' : '551'}">${version || '❓'}</span></td></tr>`;
    });
    
    tableBody.innerHTML = html;
}

// ============================================
// ГРАФ СЕМЬИ
// ============================================

function buildFamilyGraph(records) {
    const nodes = [];
    const edges = [];
    const nodeIds = new Set();
    
    // Собираем всех людей (INDI)
    const indiRecords = records.filter(r => r.type === 'INDI');
    const famRecords = records.filter(r => r.type === 'FAM');
    
    // Добавляем узлы для людей
    indiRecords.forEach(r => {
        const id = r.id || `unknown_${Math.random()}`;
        if (!nodeIds.has(id)) {
            nodeIds.add(id);
            // Пытаемся найти имя
            const nameField = r.fields.find(f => f.tag === 'NAME');
            const name = nameField ? nameField.value.split('/')[1] || nameField.value : id;
            nodes.push({ id, label: name, title: name });
        }
    });
    
    // Добавляем связи из FAM записей
    famRecords.forEach(fam => {
        const husbField = fam.fields.find(f => f.tag === 'HUSB');
        const wifeField = fam.fields.find(f => f.tag === 'WIFE');
        const childFields = fam.fields.filter(f => f.tag === 'CHIL');
        
        // Связь муж-жена
        if (husbField && wifeField) {
            edges.push({ from: husbField.value, to: wifeField.value, label: 'marriage', dashes: false });
        }
        // Связи родитель-ребенок
        childFields.forEach(child => {
            if (husbField) edges.push({ from: husbField.value, to: child.value, label: 'father', dashes: true });
            if (wifeField) edges.push({ from: wifeField.value, to: child.value, label: 'mother', dashes: true });
        });
    });
    
    return { nodes, edges };
}

function renderGraph(records) {
    try {
        const { nodes, edges } = buildFamilyGraph(records);
        if (nodes.length === 0) {
            graphContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">Нет данных для построения графа</div>';
            graphContainer.style.display = 'block';
            return;
        }
        
        // Используем vis-network
        const container = document.getElementById('graph-container');
        container.style.display = 'block';
        container.innerHTML = ''; // Очищаем
        
        const data = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };
        
        const options = {
            layout: {
                hierarchical: {
                    enabled: true,
                    direction: 'UD',
                    sortMethod: 'directed'
                }
            },
            physics: {
                enabled: true,
                hierarchicalRepulsion: { centralGravity: 0.5 },
                stabilization: { iterations: 100 }
            },
            edges: {
                smooth: true,
                arrows: { to: { enabled: false } }
            },
            nodes: {
                shape: 'dot',
                size: 20,
                font: { size: 14, face: 'arial' }
            }
        };
        
        const network = new vis.Network(container, data, options);
        
        // Адаптация под размер
        setTimeout(() => network.fit(), 100);
        
        // Добавляем информацию о количестве
        const info = document.createElement('div');
        info.style.cssText = 'padding:8px;background:#f5f5f5;border-radius:4px;margin-top:8px;font-size:12px;color:#666;';
        info.textContent = `👥 ${nodes.length} человек, ${edges.length} связей`;
        container.parentNode.insertBefore(info, container.nextSibling);
        
    } catch (error) {
        console.error('Ошибка рендеринга графа:', error);
        graphContainer.innerHTML = `<div style="padding:20px;color:#f44336;">❌ Ошибка построения графа: ${error.message}</div>`;
        graphContainer.style.display = 'block';
    }
}

// ============================================
// КНОПКА ГРАФА
// ============================================

btnGraph?.addEventListener('click', () => {
    if (!currentRecords.length) {
        updateStatus('⚠️ Сначала загрузите файл');
        return;
    }
    renderGraph(currentRecords);
    btnGraph.textContent = '📊 Скрыть граф';
    if (btnGraph.textContent.includes('Скрыть')) {
        btnGraph.onclick = () => {
            graphContainer.style.display = 'none';
            btnGraph.textContent = '📊 Показать граф семьи';
            btnGraph.onclick = arguments.callee;
        };
    }
});

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

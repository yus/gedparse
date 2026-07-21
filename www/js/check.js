// Создаем контейнер для вывода
const outputDiv = document.createElement('div');
outputDiv.id = 'checkOutput';
outputDiv.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #1e1e1e;
    color: #00ff00;
    padding: 16px;
    font-family: monospace;
    font-size: 12px;
    max-height: 50vh;
    overflow-y: auto;
    z-index: 9999;
    border-top: 2px solid #00ff00;
    white-space: pre-wrap;
    word-wrap: break-word;
`;
document.body.appendChild(outputDiv);

// Функция для вывода
function log(message, type = 'info') {
    const colors = {
        info: '#00ff00',
        error: '#ff4444',
        success: '#44ff88',
        warn: '#ffaa00'
    };
    const time = new Date().toLocaleTimeString();
    const color = colors[type] || colors.info;
    const line = document.createElement('div');
    line.style.color = color;
    line.textContent = `[${time}] ${message}`;
    outputDiv.appendChild(line);
    outputDiv.scrollTop = outputDiv.scrollHeight;
    console.log(message);
}

// Очищаем вывод
outputDiv.innerHTML = '';
log('🧪 CHECK.JS STARTED', 'info');

// Проверка импортов
async function checkImports() {
    const files = [
        { name: 'GedcomParser', path: './GedcomParser.js' },
        { name: 'GedcomConverter', path: './GedcomConverter.js' },
        { name: 'MigrationValidator', path: './MigrationValidator.js' },
        { name: 'FilePicker', path: './capacitor/FilePicker.js' }
    ];

    let allLoaded = true;

    for (const file of files) {
        try {
            log(`⏳ Загрузка ${file.name}...`, 'info');
            const module = await import(file.path);
            const exported = Object.keys(module);
            log(`✅ ${file.name} загружен: ${exported.join(', ')}`, 'success');
        } catch (error) {
            log(`❌ ${file.name} НЕ загружен: ${error.message}`, 'error');
            allLoaded = false;
        }
    }

    if (allLoaded) {
        log('🎉 ВСЕ МОДУЛИ ЗАГРУЖЕНЫ!', 'success');
        log('✅ Приложение должно работать', 'success');
    } else {
        log('⚠️ НЕКОТОРЫЕ МОДУЛИ НЕ ЗАГРУЖЕНЫ', 'warn');
        log('💡 Проверьте пути в import', 'warn');
    }

    // Проверка Capacitor
    try {
        if (typeof Capacitor !== 'undefined') {
            log(`📱 Capacitor: ${Capacitor.getPlatform()}`, 'success');
        } else {
            log('❌ Capacitor не найден', 'error');
        }
    } catch (e) {
        log(`❌ Ошибка Capacitor: ${e.message}`, 'error');
    }

    // Проверка Filesystem
    try {
        if (typeof Filesystem !== 'undefined') {
            log('📁 Filesystem: доступен', 'success');
        } else {
            log('❌ Filesystem не найден', 'error');
        }
    } catch (e) {
        log(`❌ Ошибка Filesystem: ${e.message}`, 'error');
    }

    log('🏁 CHECK COMPLETE', 'info');
}

// Запускаем проверку
checkImports();

// Кнопка для скрытия/показа
const toggleBtn = document.createElement('button');
toggleBtn.textContent = '❌ Скрыть лог';
toggleBtn.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    z-index: 10000;
    background: #ff4444;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
`;
toggleBtn.onclick = () => {
    const isHidden = outputDiv.style.display === 'none';
    outputDiv.style.display = isHidden ? 'block' : 'none';
    toggleBtn.textContent = isHidden ? '❌ Скрыть лог' : '📊 Показать лог';
};
document.body.appendChild(toggleBtn);

// Кнопка для повтора проверки
const retryBtn = document.createElement('button');
retryBtn.textContent = '🔄 Повторить проверку';
retryBtn.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
    z-index: 10000;
    background: #2196F3;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
`;
retryBtn.onclick = () => {
    outputDiv.innerHTML = '';
    log('🔄 ПОВТОРНАЯ ПРОВЕРКА', 'info');
    checkImports();
};
document.body.appendChild(retryBtn);

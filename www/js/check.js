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

// Проверка загрузки классов (они должны быть загружены через script)
function checkClasses() {
    const classes = [
        { name: 'GedcomParser', obj: window.GedcomParser },
        { name: 'GedcomConverter', obj: window.GedcomConverter },
        { name: 'MigrationValidator', obj: window.MigrationValidator },
        { name: 'FilePicker', obj: window.FilePicker }
    ];

    let allLoaded = true;

    for (const cls of classes) {
        if (cls.obj) {
            log(`✅ ${cls.name} загружен`, 'success');
        } else {
            log(`❌ ${cls.name} НЕ загружен (проверьте script в index.html)`, 'error');
            allLoaded = false;
        }
    }

    return allLoaded;
}

// Проверка Capacitor
function checkCapacitor() {
    try {
        if (typeof Capacitor !== 'undefined') {
            log(`📱 Capacitor: ${Capacitor.getPlatform()}`, 'success');
            
            // Проверяем плагины
            if (Capacitor.Plugins) {
                const plugins = Object.keys(Capacitor.Plugins);
                log(`📦 Плагины: ${plugins.join(', ')}`, 'info');
                
                if (Capacitor.Plugins.Filesystem) {
                    log('✅ Filesystem плагин доступен', 'success');
                } else {
                    log('❌ Filesystem плагин НЕ найден', 'error');
                }
            }
        } else {
            log('❌ Capacitor не найден', 'error');
        }
    } catch (e) {
        log(`❌ Ошибка Capacitor: ${e.message}`, 'error');
    }
}

// Основная проверка
async function runChecks() {
    log('🔄 Запуск проверки...', 'info');
    
    // 1. Проверяем классы
    const classesLoaded = checkClasses();
    
    // 2. Проверяем Capacitor
    checkCapacitor();
    
    // 3. Итог
    if (classesLoaded) {
        log('✅ ВСЕ КЛАССЫ ЗАГРУЖЕНЫ!', 'success');
    } else {
        log('⚠️ НЕКОТОРЫЕ КЛАССЫ НЕ ЗАГРУЖЕНЫ', 'warn');
        log('💡 Добавьте в index.html: <script src="js/ИмяФайла.js"></script>', 'warn');
    }
    
    log('🏁 CHECK COMPLETE', 'info');
}

// Запускаем проверку
runChecks();

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
    runChecks();
};
document.body.appendChild(retryBtn);

console.log('🚀 APP STARTED');

// Простое приветствие
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM loaded');
    
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = '✅ Приложение загружено!';
        statusEl.style.background = '#4CAF50';
        statusEl.style.color = 'white';
        statusEl.style.padding = '16px';
        statusEl.style.borderRadius = '8px';
    }
    
    // Простая кнопка
    const btnLoad = document.getElementById('btnLoad');
    if (btnLoad) {
        btnLoad.addEventListener('click', () => {
            alert('🎯 Кнопка работает!');
            console.log('🎯 Button clicked');
        });
    }
    
    // Создаем простую кнопку отладки
    const debugBtn = document.createElement('button');
    debugBtn.textContent = '🔍 ТЕСТ';
    debugBtn.style.cssText = 'padding:20px;font-size:20px;background:#FF5722;color:white;border:none;border-radius:8px;margin:16px;';
    debugBtn.onclick = () => {
        alert('✅ Тестовая кнопка сработала!');
        console.log('✅ Test button clicked');
    };
    document.querySelector('.toolbar')?.appendChild(debugBtn);
    
    console.log('✅ All set');
});

console.log('🚀 Script loaded');

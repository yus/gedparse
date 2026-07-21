import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export class CapacitorFileSystem {
    static async pickAndReadFile() {
        try {
            // Запрашиваем выбор файла
            const result = await Filesystem.readFile({
                path: 'file:///storage/emulated/0/Download/sample.ged', // путь для примера
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            
            // На самом деле нужно использовать DocumentPicker
            // Временно используем input (но он не работает)
            return new Promise((resolve, reject) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.ged,.txt';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) {
                        resolve(null);
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = () => reject(new Error('Ошибка чтения'));
                    reader.readAsText(file);
                };
                input.click();
            });
        } catch (error) {
            console.error('Ошибка:', error);
            throw error;
        }
    }
    
    static async saveFile(filename, content) {
        try {
            const result = await Filesystem.writeFile({
                path: filename,
                data: content,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            alert(`✅ Файл сохранен: ${filename}`);
            return result;
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            throw error;
        }
    }
}

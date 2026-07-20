import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export class CapacitorFileSystem {
    // Для выбора файла используем input элемент
    static pickAndReadFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.ged,.txt';
            
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) {
                    resolve(null);
                    return;
                }
                
                try {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        resolve(e.target.result);
                    };
                    reader.onerror = (e) => {
                        reject(new Error('Ошибка чтения файла'));
                    };
                    reader.readAsText(file);
                } catch (error) {
                    reject(error);
                }
            };
            
            input.click();
        });
    }
    
    static async saveFile(filename, content) {
        try {
            // Для сохранения используем FileSystem API Capacitor
            const result = await Filesystem.writeFile({
                path: filename,
                data: content,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            
            alert(`✅ Файл сохранен как: ${filename}`);
            return result;
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            throw error;
        }
    }
}

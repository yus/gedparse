const { Filesystem, Encoding } = Capacitor.Plugins;
const { FilePicker: CapawesomeFilePicker } = Capacitor.Plugins;

// Определяем константы вручную (без Directory.Documents)
const Directory = {
    Documents: 'DOCUMENTS',
    Downloads: 'DOWNLOADS',
    Data: 'DATA',
    Cache: 'CACHE'
};

class FilePicker {
    static async selectFolder() {
        try {
            const result = await CapawesomeFilePicker.pickDirectory();
            if (!result || !result.path) {
                throw new Error('Папка не выбрана');
            }
            return result.path;
        } catch (e) {
            throw new Error(`Ошибка выбора папки: ${e.message}`);
        }
    }

    static async listGedFiles(folderPath) {
        try {
            if (!folderPath) throw new Error('Папка не выбрана');
            
            const result = await Filesystem.readdir({
                path: folderPath,
                directory: Directory.Documents
            });
            
            if (!result || !result.files) {
                return { files: [] };
            }
            
            return {
                files: result.files
                    .filter(f => f.type === 'file' && f.name.toLowerCase().endsWith('.ged'))
                    .map(f => ({ 
                        name: f.name, 
                        size: f.size || 0,
                        path: f.uri || f.name
                    }))
            };
        } catch (e) {
            console.error('❌ listGedFiles error:', e);
            throw new Error(`Ошибка чтения папки: ${e.message}`);
        }
    }

    static async readFile(filename, folderPath) {
        try {
            if (!folderPath) throw new Error('Папка не выбрана');
            
            const result = await Filesystem.readFile({
                path: `${folderPath}/${filename}`,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            
            return typeof result === 'string' ? result : (result.data || '');
        } catch (e) {
            throw new Error(`Не удалось прочитать файл: ${filename} — ${e.message}`);
        }
    }

    static async saveFile(filename, content, folderPath) {
        try {
            if (!folderPath) throw new Error('Папка не выбрана');
            
            const result = await Filesystem.writeFile({
                path: `${folderPath}/${filename}`,
                data: content,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            
            return result;
        } catch (e) {
            throw new Error(`Не удалось сохранить файл: ${filename} — ${e.message}`);
        }
    }
}

window.FilePicker = FilePicker;

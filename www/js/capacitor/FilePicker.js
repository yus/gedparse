const Filesystem = Capacitor.Plugins.Filesystem;

const Directory = {
    Documents: 'DOCUMENTS',
    Downloads: 'DOWNLOADS',
    Data: 'DATA',
    Cache: 'CACHE'
};

const Encoding = {
    UTF8: 'utf8'
};

class FilePicker {
    static BASE_DIR = 'Gedparse';
    static selectedUri = null;

    // Инициализация: пробуем восстановить URI
    static init() {
        const saved = localStorage.getItem('selectedFolderUri');
        if (saved) {
            this.selectedUri = saved;
            console.log('📂 Восстановлен URI:', saved);
        }
    }

    // Выбор папки через SAF
    static async selectFolder() {
        try {
            // Проверяем разрешения
            const perms = await Filesystem.requestPermissions({
                permissions: ['publicStorage']
            });
            
            if (perms.publicStorage !== 'granted') {
                throw new Error('Нет разрешения на доступ к хранилищу');
            }

            // Открываем диалог выбора папки
            const result = await Filesystem.chooseDirectory();
            
            if (result && result.uri) {
                this.selectedUri = result.uri;
                localStorage.setItem('selectedFolderUri', result.uri);
                console.log('✅ Выбрана папка:', result.uri);
                return result.uri;
            }
            return null;
        } catch (error) {
            console.error('❌ Ошибка выбора папки:', error);
            throw error;
        }
    }

    // Получить список файлов из выбранной папки
    static async listGedFiles() {
        try {
            // Если URI не выбран — предлагаем выбрать
            if (!this.selectedUri) {
                await this.selectFolder();
                if (!this.selectedUri) {
                    return { files: [], directories: [], currentDir: 'Не выбрана', totalFiles: 0 };
                }
            }

            const result = await Filesystem.readdir({
                path: this.selectedUri,
                directory: Directory.Documents
            });

            const files = result.files
                .filter(f => f.type === 'file' && f.name.toLowerCase().endsWith('.ged'))
                .map(f => ({
                    name: f.name,
                    path: f.uri || f.name,
                    size: f.size || 0
                }));

            const directories = result.files
                .filter(f => f.type === 'directory')
                .map(f => f.name);

            return {
                files,
                directories,
                currentDir: this.selectedUri,
                totalFiles: files.length
            };
        } catch (error) {
            console.error('❌ listGedFiles error:', error);
            // Если ошибка — сбрасываем URI и пробуем заново
            this.selectedUri = null;
            localStorage.removeItem('selectedFolderUri');
            throw error;
        }
    }

    static async readFile(filename) {
        try {
            if (!this.selectedUri) {
                await this.selectFolder();
            }

            const filePath = this.selectedUri ? `${this.selectedUri}/${filename}` : filename;
            
            const result = await Filesystem.readFile({
                path: filePath,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });

            return typeof result === 'string' ? result : result.data;
        } catch (error) {
            console.error('❌ readFile error:', error);
            throw new Error(`Не удалось прочитать файл: ${filename}`);
        }
    }

    static async saveFile(filename, content) {
        try {
            if (!this.selectedUri) {
                await this.selectFolder();
            }

            const filePath = this.selectedUri ? `${this.selectedUri}/${filename}` : filename;
            
            const result = await Filesystem.writeFile({
                path: filePath,
                data: typeof content === 'string' ? content : JSON.stringify(content),
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });

            return result;
        } catch (error) {
            console.error('❌ saveFile error:', error);
            throw new Error(`Не удалось сохранить файл: ${filename}`);
        }
    }
}

// Инициализация
FilePicker.init();
window.FilePicker = FilePicker;

// Импортируем плагин
import { FilePicker as CapawesomeFilePicker } from '@capawesome/capacitor-file-picker';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

class FilePicker {
    static selectedPath = null;

    static async selectFolder() {
        try {
            // Используем pickDirectory() из плагина
            const result = await CapawesomeFilePicker.pickDirectory();
            if (result && result.path) {
                this.selectedPath = result.path;
                localStorage.setItem('gedparse_folder_path', result.path);
                return result.path;
            }
            return null;
        } catch (error) {
            console.error('❌ Ошибка выбора папки:', error);
            throw error;
        }
    }

    static async listGedFiles() {
        try {
            if (!this.selectedPath) {
                const saved = localStorage.getItem('gedparse_folder_path');
                if (saved) {
                    this.selectedPath = saved;
                } else {
                    await this.selectFolder();
                }
            }

            const result = await Filesystem.readdir({
                path: this.selectedPath,
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
                currentDir: this.selectedPath,
                totalFiles: files.length
            };
        } catch (error) {
            console.error('❌ listGedFiles error:', error);
            this.selectedPath = null;
            localStorage.removeItem('gedparse_folder_path');
            throw error;
        }
    }

    static async readFile(filename) {
        try {
            const filePath = `${this.selectedPath}/${filename}`;
            const result = await Filesystem.readFile({
                path: filePath,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            return typeof result === 'string' ? result : result.data;
        } catch (error) {
            throw new Error(`Не удалось прочитать файл: ${filename}`);
        }
    }

    static async saveFile(filename, content) {
        try {
            const filePath = `${this.selectedPath}/${filename}`;
            const result = await Filesystem.writeFile({
                path: filePath,
                data: typeof content === 'string' ? content : JSON.stringify(content),
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            return result;
        } catch (error) {
            throw new Error(`Не удалось сохранить файл: ${filename}`);
        }
    }
}

window.FilePicker = FilePicker;

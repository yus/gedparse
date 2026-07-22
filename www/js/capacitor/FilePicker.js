const { Filesystem, Directory, Encoding } = Capacitor.Plugins;
const { FilePicker: CapawesomeFilePicker } = Capacitor.Plugins;

class FilePicker {
    static async selectFolder() {
        try {
            const result = await CapawesomeFilePicker.pickDirectory();
            return result?.path || null;
        } catch (e) {
            throw new Error(`Ошибка выбора папки: ${e.message}`);
        }
    }

    static async listGedFiles(folderPath) {
        try {
            const result = await Filesystem.readdir({
                path: folderPath,
                directory: Directory.Documents
            });
            return {
                files: result.files
                    .filter(f => f.type === 'file' && f.name.toLowerCase().endsWith('.ged'))
                    .map(f => ({ name: f.name, size: f.size || 0 }))
            };
        } catch (e) {
            throw new Error(`Ошибка чтения папки: ${e.message}`);
        }
    }

    static async readFile(filename, folderPath) {
        try {
            const result = await Filesystem.readFile({
                path: `${folderPath}/${filename}`,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            return typeof result === 'string' ? result : result.data;
        } catch (e) {
            throw new Error(`Не удалось прочитать файл: ${filename}`);
        }
    }

    static async saveFile(filename, content, folderPath) {
        try {
            return await Filesystem.writeFile({
                path: `${folderPath}/${filename}`,
                data: content,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
        } catch (e) {
            throw new Error(`Не удалось сохранить файл: ${filename}`);
        }
    }
}

window.FilePicker = FilePicker;

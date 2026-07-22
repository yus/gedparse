const { Filesystem, Directory, Encoding } = Capacitor.Plugins;
const { FilePicker: CapawesomeFilePicker } = Capacitor.Plugins;

class FilePicker {
    static async selectFolder() {
        try {
            const result = await CapawesomeFilePicker.pickDirectory();
            if (result && result.path) {
                return result.path;
            }
            return null;
        } catch (error) {
            console.error('❌ Ошибка выбора папки:', error);
            throw error;
        }
    }

    static async listGedFiles(folderPath) {
        try {
            const result = await Filesystem.readdir({
                path: folderPath,
                directory: Directory.Documents
            });

            const files = result.files
                .filter(f => f.type === 'file' && f.name.toLowerCase().endsWith('.ged'))
                .map(f => ({
                    name: f.name,
                    path: f.uri || f.name,
                    size: f.size || 0
                }));

            return { files };
        } catch (error) {
            console.error('❌ listGedFiles error:', error);
            throw error;
        }
    }

    static async readFile(filename, folderPath) {
        try {
            const filePath = `${folderPath}/${filename}`;
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

    static async saveFile(filename, content, folderPath) {
        try {
            const filePath = `${folderPath}/${filename}`;
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

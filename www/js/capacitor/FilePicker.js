import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export class FilePicker {
    static async listGedFiles(path = '') {
        try {
            // Читаем содержимое директории
            const result = await Filesystem.readdir({
                path: path,
                directory: Directory.ExternalStorage
            });
            
            // Фильтруем только .ged файлы
            const files = result.files
                .filter(f => f.type === 'file' && f.name.toLowerCase().endsWith('.ged'))
                .map(f => ({
                    name: f.name,
                    path: path ? `${path}/${f.name}` : f.name,
                    fullPath: f.uri || f.name
                }));
            
            // Получаем список папок для навигации
            const dirs = result.files
                .filter(f => f.type === 'directory')
                .map(f => ({
                    name: f.name,
                    path: path ? `${path}/${f.name}` : f.name
                }));
            
            return { files, dirs, currentPath: path };
        } catch (error) {
            console.error('Ошибка чтения директории:', error);
            throw error;
        }
    }
    
    static async readFile(filePath) {
        try {
            const content = await Filesystem.readFile({
                path: filePath,
                directory: Directory.ExternalStorage,
                encoding: Encoding.UTF8
            });
            return content;
        } catch (error) {
            console.error('Ошибка чтения файла:', error);
            throw error;
        }
    }
    
    static async saveFile(filename, content) {
        try {
            const result = await Filesystem.writeFile({
                path: filename,
                data: content,
                directory: Directory.ExternalStorage,
                encoding: Encoding.UTF8
            });
            return result;
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            throw error;
        }
    }
}

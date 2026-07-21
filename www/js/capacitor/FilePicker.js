import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export class FilePicker {
    // Базовая папка
    static BASE_DIR = 'Gedparse';
    
    // Получить список .ged файлов из папки Gedparse
    static async listGedFiles() {
        try {
            console.log('📂 Reading directory:', this.BASE_DIR);
            
            // Пробуем прочитать папку Gedparse
            const result = await Filesystem.readdir({
                path: this.BASE_DIR,
                directory: Directory.Documents  // Пробуем Documents
            });
            
            console.log('✅ Files found:', result.files.length);
            
            // Фильтруем .ged файлы
            const gedFiles = result.files
                .filter(f => f.type === 'file' && f.name.toLowerCase().endsWith('.ged'))
                .map(f => ({
                    name: f.name,
                    path: `${this.BASE_DIR}/${f.name}`,
                    size: f.size || 0,
                    mtime: f.mtime || new Date()
                }));
            
            // Получаем список подпапок
            const subDirs = result.files
                .filter(f => f.type === 'directory')
                .map(f => f.name);
            
            return {
                files: gedFiles,
                directories: subDirs,
                currentDir: this.BASE_DIR,
                totalFiles: gedFiles.length
            };
            
        } catch (error) {
            console.error('❌ Error reading directory:', error);
            
            // Если папки нет - создаем её
            try {
                console.log('📁 Creating directory:', this.BASE_DIR);
                await Filesystem.mkdir({
                    path: this.BASE_DIR,
                    directory: Directory.Documents,
                    recursive: true
                });
                console.log('✅ Directory created');
                return { files: [], directories: [], currentDir: this.BASE_DIR, totalFiles: 0 };
            } catch (mkdirError) {
                console.error('❌ Failed to create directory:', mkdirError);
                throw new Error('Не удалось создать папку Gedparse');
            }
        }
    }
    
    // Чтение файла из папки Gedparse
    static async readFile(filename) {
        try {
            const filePath = `${this.BASE_DIR}/${filename}`;
            console.log('📖 Reading file:', filePath);
            
            const content = await Filesystem.readFile({
                path: filePath,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            
            console.log('✅ File read, size:', content.length);
            return content;
            
        } catch (error) {
            console.error('❌ Error reading file:', error);
            throw new Error(`Не удалось прочитать файл: ${filename}`);
        }
    }
    
    // Сохранение файла в папку Gedparse
    static async saveFile(filename, content) {
        try {
            const filePath = `${this.BASE_DIR}/${filename}`;
            console.log('💾 Saving file:', filePath);
            
            // Убеждаемся, что папка существует
            await Filesystem.mkdir({
                path: this.BASE_DIR,
                directory: Directory.Documents,
                recursive: true
            });
            
            const result = await Filesystem.writeFile({
                path: filePath,
                data: content,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            
            console.log('✅ File saved');
            return result;
            
        } catch (error) {
            console.error('❌ Error saving file:', error);
            throw new Error(`Не удалось сохранить файл: ${filename}`);
        }
    }
    
    // Удаление файла
    static async deleteFile(filename) {
        try {
            const filePath = `${this.BASE_DIR}/${filename}`;
            await Filesystem.deleteFile({
                path: filePath,
                directory: Directory.Documents
            });
            console.log('✅ File deleted:', filename);
            return true;
        } catch (error) {
            console.error('❌ Error deleting file:', error);
            throw new Error(`Не удалось удалить файл: ${filename}`);
        }
    }
}

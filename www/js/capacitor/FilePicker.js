// Получаем Filesystem из глобального объекта
const Filesystem = Capacitor.Plugins.Filesystem;

// Определяем константы вручную (правильные значения для Capacitor)
const Directory = {
    Documents: 'DOCUMENTS',
    Downloads: 'DOWNLOADS',
    Data: 'DATA',
    Cache: 'CACHE',
    External: 'EXTERNAL',
    ExternalStorage: 'EXTERNAL_STORAGE'
};

const Encoding = {
    UTF8: 'utf8'
};

class FilePicker {
    static BASE_DIR = 'Gedparse';

    static async ensureDirectory() {
        try {
            console.log('🔍 Checking directory...');
            const result = await Filesystem.readdir({
                path: this.BASE_DIR,
                directory: Directory.Documents
            });
            console.log('✅ Directory exists:', result);
            return true;
        } catch (error) {
            console.log('❌ Directory not found, creating...');
            try {
                await Filesystem.mkdir({
                    path: this.BASE_DIR,
                    directory: Directory.Documents,
                    recursive: true
                });
                console.log('✅ Directory created!');
                return true;
            } catch (createError) {
                console.error('❌ Failed to create directory:', createError);
                throw new Error(`Не удалось создать папку: ${createError.message}`);
            }
        }
    }

    static async listGedFiles() {
        try {
            console.log('📂 listGedFiles() called');
            await this.ensureDirectory();
            
            const result = await Filesystem.readdir({
                path: this.BASE_DIR,
                directory: Directory.Documents
            });
            
            console.log('📋 Full readdir result:', JSON.stringify(result, null, 2));
            
            const files = result.files
                .filter(f => f.type === 'file' && f.name.toLowerCase().endsWith('.ged'))
                .map(f => ({
                    name: f.name,
                    path: `${this.BASE_DIR}/${f.name}`,
                    size: f.size || 0,
                    mtime: f.mtime || new Date(),
                    uri: f.uri || ''
                }));
            
            const directories = result.files
                .filter(f => f.type === 'directory')
                .map(f => f.name);
            
            console.log(`✅ Found ${files.length} .ged files, ${directories.length} directories`);
            
            return {
                files,
                directories,
                currentDir: this.BASE_DIR,
                totalFiles: files.length,
                rawResult: result
            };
        } catch (error) {
            console.error('❌ listGedFiles error:', error);
            throw error;
        }
    }

    static async readFile(filename) {
        try {
            const filePath = `${this.BASE_DIR}/${filename}`;
            console.log(`📖 Reading: ${filePath}`);
            
            const content = await Filesystem.readFile({
                path: filePath,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            
            console.log(`✅ Read ${content.length} bytes`);
            return content;
        } catch (error) {
            console.error('❌ readFile error:', error);
            throw new Error(`Не удалось прочитать файл: ${filename}`);
        }
    }

    static async saveFile(filename, content) {
        try {
            const filePath = `${this.BASE_DIR}/${filename}`;
            console.log(`💾 Saving: ${filePath}`);
            
            await this.ensureDirectory();
            
            const result = await Filesystem.writeFile({
                path: filePath,
                data: content,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            
            console.log('✅ Save result:', result);
            return result;
        } catch (error) {
            console.error('❌ saveFile error:', error);
            throw new Error(`Не удалось сохранить файл: ${filename}`);
        }
    }
}

window.FilePicker = FilePicker;

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { DocumentPicker } from '@capacitor/document-picker';

export class CapacitorFileSystem {
    static async pickAndReadFile() {
        try {
            const result = await DocumentPicker.pick({
                types: ['text/plain', 'application/octet-stream'],
                limit: 1
            });
            
            if (!result || !result.files || result.files.length === 0) {
                return null;
            }
            
            const file = result.files[0];
            
            const readResult = await Filesystem.readFile({
                path: file.path,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            
            return readResult.data;
        } catch (error) {
            console.error('Ошибка чтения файла:', error);
            throw error;
        }
    }
    
    static async saveFile(filename, content) {
        try {
            await Filesystem.writeFile({
                path: filename,
                data: content,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            
            alert(`✅ Файл сохранен как: ${filename}`);
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            throw error;
        }
    }
}

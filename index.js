#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { GedcomParser } from './src/parsers/GedcomParser.js';
import { GedcomConverter } from './src/converters/GedcomConverter.js';
import { MigrationValidator } from './src/validators/MigrationValidator.js';
import { TableRenderer } from './src/ui/TableRenderer.js';

class GedcomApp {
    #parser;
    #converter;
    #validator;
    #renderer;
    #currentRecords;
    #convertedRecords;
    #warnings;

    constructor() {
        this.#parser = new GedcomParser();
        this.#converter = new GedcomConverter();
        this.#validator = new MigrationValidator();
        this.#renderer = new TableRenderer();
        this.#currentRecords = [];
        this.#convertedRecords = [];
        this.#warnings = [];
    }

    async start() {
        console.log(chalk.bold.cyan('\n🧬 GEDCOM Migration Tool v2.0'));
        console.log(chalk.gray('═'.repeat(50)));
        console.log(chalk.white('5.5.1 → 7.0 Converter'));
        console.log(chalk.gray('═'.repeat(50)));

        await this.#mainMenu();
    }

    async #mainMenu() {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'Что хотите сделать?',
                choices: [
                    { name: '📂 Загрузить GEDCOM файл', value: 'load' },
                    { name: '📊 Показать таблицу записей', value: 'show' },
                    { name: '🔍 Проверить на проблемы', value: 'validate' },
                    { name: '🔄 Конвертировать 5.5.1 → 7.0', value: 'convert' },
                    { name: '💾 Сохранить сконвертированный файл', value: 'save' },
                    { name: '📈 Показать статистику', value: 'stats' },
                    { name: '🚪 Выход', value: 'exit' }
                ]
            }
        ]);

        await this.#handleAction(answers.action);
    }

    async #handleAction(action) {
        switch (action) {
            case 'load':
                await this.#loadFile();
                break;
            case 'show':
                this.#showRecords();
                break;
            case 'validate':
                await this.#validateFile();
                break;
            case 'convert':
                await this.#convertFile();
                break;
            case 'save':
                await this.#saveFile();
                break;
            case 'stats':
                this.#showStats();
                break;
            case 'exit':
                console.log(chalk.green('👋 До свидания!'));
                process.exit(0);
        }

        await this.#mainMenu();
    }

    async #loadFile() {
        const { filepath } = await inquirer.prompt([
            {
                type: 'input',
                name: 'filepath',
                message: 'Введите путь к GEDCOM файлу:',
                validate: (input) => {
                    try {
                        readFileSync(input, 'utf-8');
                        return true;
                    } catch {
                        return 'Файл не найден!';
                    }
                }
            }
        ]);

        try {
            const content = readFileSync(filepath, 'utf-8');
            this.#currentRecords = this.#parser.parse(content);
            
            console.log(chalk.green(`✅ Загружено ${this.#currentRecords.length} записей`));
            console.log(chalk.gray(`   Всего строк: ${this.#parser.lineCount}`));
            
            this.#renderer.renderStats(this.#parser.getStats());
            
            // Показываем первые 5 записей
            this.#renderer.renderRecords(
                this.#currentRecords.slice(0, 5),
                'Пример записей (первые 5)'
            );
        } catch (error) {
            console.error(chalk.red(`❌ Ошибка загрузки: ${error.message}`));
        }
    }

    #showRecords() {
        if (this.#currentRecords.length === 0) {
            console.log(chalk.yellow('⚠️ Сначала загрузите файл!'));
            return;
        }

        this.#renderer.renderRecords(
            this.#currentRecords,
            'Все записи'
        );
    }

    async #validateFile() {
        if (this.#currentRecords.length === 0) {
            console.log(chalk.yellow('⚠️ Сначала загрузите файл!'));
            return;
        }

        console.log(chalk.blue('\n🔍 Проверка файла на проблемы миграции...'));
        
        this.#warnings = this.#validator.validate(this.#currentRecords);
        
        this.#renderer.renderWarnings(
            this.#warnings,
            'Предупреждения миграции'
        );

        // Сохраняем отчет
        const report = this.#validator.generateReport();
        const { saveReport } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'saveReport',
                message: 'Сохранить отчет в файл?',
                default: false
            }
        ]);

        if (saveReport) {
            const { filename } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'filename',
                    message: 'Имя файла для отчета:',
                    default: 'migration-report.txt'
                }
            ]);
            
            writeFileSync(filename, report);
            console.log(chalk.green(`✅ Отчет сохранен в ${filename}`));
        }
    }

    async #convertFile() {
        if (this.#currentRecords.length === 0) {
            console.log(chalk.yellow('⚠️ Сначала загрузите файл!'));
            return;
        }

        console.log(chalk.blue('\n🔄 Конвертация 5.5.1 → 7.0...'));

        const result = this.#converter.convert551to700(this.#currentRecords);
        this.#convertedRecords = result.records;
        this.#warnings = result.warnings;

        console.log(chalk.green(`✅ Конвертация завершена!`));
        console.log(chalk.gray(`   Записей: ${this.#convertedRecords.length}`));
        console.log(chalk.gray(`   Предупреждений: ${this.#warnings.length}`));

        // Показываем логи конвертации
        this.#renderer.renderConversionLog(result.log);

        // Показываем предупреждения
        if (this.#warnings.length > 0) {
            this.#renderer.renderWarnings(
                this.#warnings,
                'Предупреждения при конвертации'
            );
        }

        // Сравнение статистики
        const stats = this.#parser.getStats();
        console.log(chalk.magenta.bold('\n📊 Сравнение до/после:'));
        console.log(chalk.gray('═'.repeat(40)));
        
        const convStats = {
            total: this.#convertedRecords.length,
            byType: {}
        };
        
        for (const record of this.#convertedRecords) {
            convStats.byType[record.type] = (convStats.byType[record.type] || 0) + 1;
        }

        console.log(`До:  ${stats.total} записей`);
        console.log(`После: ${convStats.total} записей`);
        
        // Показываем изменения в типах
        const types = new Set([...Object.keys(stats.byType), ...Object.keys(convStats.byType)]);
        for (const type of types) {
            const before = stats.byType[type] || 0;
            const after = convStats.byType[type] || 0;
            const diff = after - before;
            if (diff !== 0) {
                const color = diff > 0 ? chalk.green : chalk.red;
                console.log(`  ${type}: ${before} → ${after} ${color(`(${diff > 0 ? '+' : ''}${diff})`)}`);
            }
        }
    }

    async #saveFile() {
        if (this.#convertedRecords.length === 0) {
            console.log(chalk.yellow('⚠️ Сначала сконвертируйте файл!'));
            return;
        }

        const { filename } = await inquirer.prompt([
            {
                type: 'input',
                name: 'filename',
                message: 'Имя файла для сохранения:',
                default: 'converted-7.0.ged'
            }
        ]);

        try {
            let content = '0 HEAD\n1 GEDC\n2 VERS 7.0\n1 CHAR UTF-8\n';
            
            for (const record of this.#convertedRecords) {
                content += record.toString() + '\n';
            }
            
            content += '0 TRLR\n';
            
            writeFileSync(filename, content);
            console.log(chalk.green(`✅ Файл сохранен как ${filename}`));
            console.log(chalk.gray(`   Размер: ${(content.length / 1024).toFixed(2)} KB`));
        } catch (error) {
            console.error(chalk.red(`❌ Ошибка сохранения: ${error.message}`));
        }
    }

    #showStats() {
        if (this.#currentRecords.length === 0) {
            console.log(chalk.yellow('⚠️ Сначала загрузите файл!'));
            return;
        }

        const stats = this.#parser.getStats();
        this.#renderer.renderStats(stats);

        // Дополнительная статистика по полям
        const fieldStats = {};
        for (const record of this.#currentRecords) {
            for (const field of record.fields) {
                fieldStats[field.tag] = (fieldStats[field.tag] || 0) + 1;
            }
        }

        console.log(chalk.cyan.bold('\n🏷️ Распределение полей:'));
        console.log(chalk.gray('═'.repeat(40)));
        
        const sortedFields = Object.entries(fieldStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        for (const [tag, count] of sortedFields) {
            console.log(`  ${chalk.white(tag)}: ${chalk.yellow(count)}`);
        }
    }
}

// Запуск приложения
const app = new GedcomApp();
app.start().catch(error => {
    console.error(chalk.red(`❌ Критическая ошибка: ${error.message}`));
    process.exit(1);
});

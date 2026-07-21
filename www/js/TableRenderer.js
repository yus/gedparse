import Table from 'cli-table3';
import chalk from 'chalk';

export class TableRenderer {
    renderRecords(records, title = 'GEDCOM Records') {
        const table = new Table({
            head: [
                chalk.cyan('ID'),
                chalk.cyan('Type'),
                chalk.cyan('Fields'),
                chalk.cyan('Raw Preview')
            ],
            colWidths: [15, 10, 40, 30],
            style: {
                head: [],
                border: ['gray']
            }
        });

        for (const record of records) {
            const fieldCount = record.fields.length;
            const fieldPreview = record.fields
                .slice(0, 5)
                .map(f => `${f.tag}:${f.value}`)
                .join(', ');
            
            table.push([
                record.id || '—',
                record.type || '—',
                `${fieldCount} fields\n${fieldPreview}${fieldCount > 5 ? '…' : ''}`,
                record.rawLine ? record.rawLine.substring(0, 30) + '…' : '—'
            ]);
        }

        console.log(chalk.bold(`\n📊 ${title}`));
        console.log(table.toString());
        console.log(chalk.gray(`Total: ${records.length} records\n`));
    }

    renderWarnings(warnings, title = 'Migration Warnings') {
        if (warnings.length === 0) {
            console.log(chalk.green('✅ Нет предупреждений!'));
            return;
        }

        const bySeverity = {
            high: warnings.filter(w => w.severity === 'high'),
            medium: warnings.filter(w => w.severity === 'medium'),
            low: warnings.filter(w => w.severity === 'low')
        };

        console.log(chalk.yellow.bold(`\n⚠️ ${title}`));
        console.log(chalk.gray('═'.repeat(60)));

        for (const [severity, items] of Object.entries(bySeverity)) {
            if (items.length === 0) continue;
            
            const color = severity === 'high' ? chalk.red : 
                         severity === 'medium' ? chalk.yellow : chalk.green;
            
            console.log(color.bold(`\n${severity.toUpperCase()} (${items.length}):`));
            console.log(chalk.gray('─'.repeat(40)));
            
            for (const w of items) {
                console.log(`  ${chalk.bold(w.recordId || 'Unknown')}`);
                console.log(`    ${chalk.gray(w.field)}: "${w.value || ''}"`);
                console.log(`    ${chalk.white(w.message)}`);
                console.log(`    ${chalk.cyan('→ ' + w.suggestion)}\n`);
            }
        }
    }

    renderConversionLog(log) {
        if (log.length === 0) return;

        console.log(chalk.blue.bold('\n📝 Conversion Log:'));
        console.log(chalk.gray('═'.repeat(60)));

        const table = new Table({
            head: [chalk.cyan('Record'), chalk.cyan('Action'), chalk.cyan('Time')],
            colWidths: [15, 40, 25],
            style: {
                head: [],
                border: ['gray']
            }
        });

        for (const entry of log.slice(-20)) { // Последние 20 записей
            table.push([
                entry.recordId || '—',
                entry.message,
                new Date(entry.timestamp).toLocaleTimeString()
            ]);
        }

        console.log(table.toString());
        console.log(chalk.gray(`\nTotal entries: ${log.length}`));
    }

    renderStats(stats) {
        console.log(chalk.magenta.bold('\n📈 Statistics:'));
        console.log(chalk.gray('═'.repeat(40)));
        
        const table = new Table({
            style: {
                border: ['gray']
            }
        });

        table.push(
            [chalk.cyan('Total Records'), chalk.white(stats.total)],
            [chalk.cyan('By Type'), '']
        );

        for (const [type, count] of Object.entries(stats.byType)) {
            table.push([chalk.gray(`  ${type}`), count]);
        }

        console.log(table.toString());
    }
}

class TableRenderer {
    renderRecords(records, title = 'GEDCOM Records') {
        console.log(`\n📊 ${title}`);
        console.log('─'.repeat(60));
        
        records.slice(0, 20).forEach((record, i) => {
            const fields = record.fields.slice(0, 5).map(f => `${f.tag}:${f.value}`).join(', ');
            console.log(`${i+1}. ${record.id || '—'} | ${record.type} | ${fields}${record.fields.length > 5 ? '…' : ''}`);
        });
        
        if (records.length > 20) {
            console.log(`... и ещё ${records.length - 20} записей`);
        }
        console.log(`Total: ${records.length} records\n`);
    }

    renderWarnings(warnings, title = 'Migration Warnings') {
        if (warnings.length === 0) {
            console.log('✅ Нет предупреждений!');
            return;
        }

        console.log(`\n⚠️ ${title}`);
        console.log('─'.repeat(40));
        
        warnings.slice(0, 20).forEach(w => {
            console.log(`  ${w.recordId || 'Unknown'}`);
            console.log(`    ${w.field}: "${w.value || ''}"`);
            console.log(`    ${w.message}`);
            console.log(`    → ${w.suggestion}\n`);
        });
    }

    renderConversionLog(log) {
        if (log.length === 0) return;
        console.log('\n📝 Conversion Log:');
        log.slice(-10).forEach(entry => {
            console.log(`  ${entry.recordId}: ${entry.message}`);
        });
    }

    renderStats(stats) {
        console.log('\n📈 Statistics:');
        console.log(`  Total Records: ${stats.total}`);
        console.log('  By Type:');
        for (const [type, count] of Object.entries(stats.byType)) {
            console.log(`    ${type}: ${count}`);
        }
    }
}

window.TableRenderer = TableRenderer;

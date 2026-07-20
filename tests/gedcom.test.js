import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';

import { GedcomParser } from '../src/parsers/GedcomParser.js';
import { GedcomConverter } from '../src/converters/GedcomConverter.js';
import { MigrationValidator } from '../src/validators/MigrationValidator.js';

describe('GEDCOM Parser', () => {
    let parser;
    
    before(() => {
        parser = new GedcomParser();
    });

    it('should parse basic GEDCOM file', () => {
        const content = `
0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
2 DATE 1 JAN 2000
0 TRLR
`;
        const records = parser.parse(content);
        // HEAD, @I1@ INDI, TRLR = 3 записи
        assert.equal(records.length, 3);
        assert.equal(records[1].id, '@I1@');
        assert.equal(records[1].type, 'INDI');
        // Проверяем поля: NAME и BIRT
        assert.equal(records[1].fields.length, 2);
    });

    it('should handle nested fields', () => {
        const content = `
0 @I1@ INDI
1 NAME John /Doe/
2 GIVN John
2 SURN Doe
1 BIRT
2 DATE 1 JAN 2000
`;
        const records = parser.parse(content);
        const record = records[0];
        // NAME и BIRT
        assert.equal(record.fields.length, 2);
        
        const nameField = record.fields[0];
        assert.equal(nameField.tag, 'NAME');
        // GIVN и SURN
        assert.equal(nameField.children.length, 2);
        assert.equal(nameField.children[0].tag, 'GIVN');
        assert.equal(nameField.children[1].tag, 'SURN');
    });
});

describe('GEDCOM Converter', () => {
    let converter;
    let parser;
    
    before(() => {
        converter = new GedcomConverter();
        parser = new GedcomParser();
    });

    it('should convert NAME with ROMN to TRAN', () => {
        const content = `
0 @I1@ INDI
1 NAME /橘/ 逸勢
2 ROMN /Tachibana/ no Hayanari
3 TYPE romaji
`;
        const records = parser.parse(content);
        const result = converter.convert551to700(records);
        
        const converted = result.records[0];
        const nameField = converted.fields[0];
        assert.equal(nameField.tag, 'NAME');
        
        const trans = nameField.children.find(c => c.tag === 'TRAN');
        assert.ok(trans);
        assert.equal(trans.value, '/Tachibana/ no Hayanari');
        
        const lang = trans.children.find(c => c.tag === 'LANG');
        assert.ok(lang);
        assert.equal(lang.value, 'ja-Latn');
    });

    it('should convert AFN to EXID', () => {
        const content = `
0 @I1@ INDI
1 AFN 123456789
`;
        const records = parser.parse(content);
        const result = converter.convert551to700(records);
        
        const converted = result.records[0];
        const exid = converted.fields[0];
        assert.equal(exid.tag, 'EXID');
        assert.equal(exid.value, '123456789');
        
        const type = exid.children.find(c => c.tag === 'TYPE');
        assert.ok(type);
        assert.equal(type.value, 'https://gedcom.io/terms/v7/AFN');
    });

    it('should convert RELA to ROLE', () => {
        const content = `
0 @I1@ INDI
1 ASSO @I2@
2 RELA Witness
`;
        const records = parser.parse(content);
        const result = converter.convert551to700(records);
        
        const converted = result.records[0];
        const asso = converted.fields[0];
        const role = asso.children.find(c => c.tag === 'ROLE');
        assert.ok(role);
        assert.equal(role.value, 'WITN');
    });
});

describe('Migration Validator', () => {
    let validator;
    let parser;
    
    before(() => {
        validator = new MigrationValidator();
        parser = new GedcomParser();
    });

    it('should warn about obsolete AGE values', () => {
        const content = `
0 @I1@ INDI
1 DEAT
2 AGE CHILD
`;
        const records = parser.parse(content);
        const warnings = validator.validate(records);
        
        const ageWarnings = warnings.filter(w => w.field === 'AGE');
        assert.ok(ageWarnings.length > 0);
        assert.ok(ageWarnings[0].message.includes('CHILD'));
    });

    it('should warn about invalid SEX values', () => {
        const content = `
0 @I1@ INDI
1 SEX Male
`;
        const records = parser.parse(content);
        const warnings = validator.validate(records);
        
        const sexWarnings = warnings.filter(w => w.field === 'SEX');
        assert.ok(sexWarnings.length > 0);
        // Проверяем, что в message есть Male или SEX
        const hasMaleMessage = sexWarnings.some(w => 
            w.message && (w.message.includes('Male') || w.message.includes('SEX'))
        );
        assert.ok(hasMaleMessage);
    });
});

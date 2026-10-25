import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { App } from 'obsidian-test-mocks/obsidian';
import { decodeBackup, recordClass } from '../src/backup';
import Plugin from '../src/main';
import manifest from '../manifest.json';
import { fixture, normal, v82Fixture, v82Records } from './fixture';

const file = new Uint8Array(readFileSync('tests/fixtures/colornote-8.2-synthetic.backup'));

describe('header version 8.x', () => {
	it('keeps the committed 8.2 fixture equal to its generator and under 1 MB', () => {
		expect(file.length).toBeLessThan(1024 * 1024);
		expect(Buffer.from(file).equals(Buffer.from(v82Fixture()))).toBe(true);
	});
	it('reads the 8.2 header fields', () => {
		expect(Buffer.from(file.subarray(0, 16)).toString('hex')).toBe('004e004f005400450000000800000002');
		const result = decodeBackup(file, '0000');
		expect(result.version).toBe('8.2');
		expect(result.headerCount).toBe(v82Records.length);
		expect(result.records).toEqual(v82Records);
	});
	it('classifies 8.2 records like 7.1 records', () => expect(decodeBackup(file, '0000').records.map(recordClass)).toEqual(['normal', 'normal', 'archive', 'trash', 'locked', 'system']));
	it('reads an 8.1 header', () => expect(decodeBackup(fixture([normal], '1234', 1, [8, 1]), '1234')).toEqual({ headerCount: 1, records: [normal], version: '8.1' }));
	it('still reports 7.1', () => expect(decodeBackup(fixture(), '1234').version).toBe('7.1'));
	it('fails closed on a wrong 8.2 password', () => expect(() => decodeBackup(file, '1234')).toThrow(/padding is invalid|record start|invalid UTF-8/));
	for (const v of [[8, 0], [8, 3], [9, 0], [7, 2]] as const) {
		it(`rejects unverified version ${v.join('.')}`, () => expect(() => decodeBackup(fixture([normal], '1234', 1, v), '1234')).toThrow(`Unsupported header version ${v.join('.')}. Supported versions: 7.1, 8.1, 8.2.`));
	}
	it('imports an 8.2 backup and names the version in the report', async () => {
		const app = App.createConfigured__({ files: {} });
		const plugin = new Plugin(app as never, manifest as never);
		const create = vi.spyOn(app.vault, 'create');
		await plugin.importBackup(decodeBackup(file, '0000'));
		const names = create.mock.calls.map((c) => c[0].split('/').pop());
		expect(names).toEqual(['Shopping synthetic-0001.md', 'Packing list synthetic-0002.md', 'Import report.md']);
		expect(create.mock.calls[1]![1]).toContain('- [x] Passport\n- [ ] Charger');
		expect(create.mock.calls[2]![1]).toContain('Version: 8.2');
		expect(create.mock.calls[2]![1]).not.toContain('0000');
	});
});

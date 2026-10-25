import { createCipheriv, createHash } from 'node:crypto';
import type { SourceRecord } from '../src/backup';
export const normal: SourceRecord = { _id: 1, uuid: 'demo-001', title: 'Travel plan', note: 'Train at 09:30.\nMeet at the station.', type: 0, active_state: 0, space: 0, created_date: 1728864000000, modified_date: 1728950400000, color_index: 0 };
export function stream(records: unknown[], prefix = Buffer.alloc(16, 42)): Buffer {
	return Buffer.concat([prefix, ...records.flatMap((r) => { const text = Buffer.from(typeof r === 'string' ? r : JSON.stringify(r)); const size = Buffer.alloc(4); size.writeUInt32BE(text.length); return [size, text]; })]);
}
export function encryptPlain(plain: Uint8Array, password = '1234', count = 7, version: readonly [number, number] = [7, 1]): Uint8Array {
	const pass = Buffer.from(password), salt = Buffer.from('ColorNote Fixed Salt');
	const key = createHash('md5').update(Buffer.concat([pass, salt])).digest();
	const iv = createHash('md5').update(Buffer.concat([key, pass, salt])).digest();
	const cipher = createCipheriv('aes-128-cbc', key, iv);
	const header = Buffer.alloc(28); Buffer.from('004e004f00540045', 'hex').copy(header); header.writeUInt32BE(version[0], 8); header.writeUInt32BE(version[1], 12); header.writeUInt32BE(count, 24);
	return new Uint8Array(Buffer.concat([header, cipher.update(plain), cipher.final()]));
}
export function fixture(records: unknown[] = [normal], password = '1234', count = 7, version: readonly [number, number] = [7, 1]): Uint8Array { return encryptPlain(stream(records), password, count, version); }

/** Record fields as they appear in ColorNote backups. All values are synthetic. */
const record = (id: number, uuid: string, title: string, note: string, extra: Partial<SourceRecord> & Record<string, unknown> = {}) => ({
	_id: id, account_id: 0, active_state: 0, color_index: 2, created_date: 1766700000000 + id, dirty: 0, encrypted: 0, folder_id: 0, importance: 0,
	latitude: 0, longitude: 0, minor_modified_date: 1766710000000 + id, modified_date: 1766710000000 + id, note, note_ext: null, note_type: 0,
	reminder_base: 0, reminder_date: 0, reminder_duration: 0, reminder_last: 0, reminder_option: 0, reminder_repeat: 0, reminder_repeat_ends: 0,
	reminder_type: 0, revision: 1, space: 0, staged: 0, status: 0, tags: '', title, type: 0, uuid, ...extra,
});
export const v82Records = [
	record(1, 'synthetic-0001', 'Shopping', 'Bread\nMilk'),
	record(2, 'synthetic-0002', 'Packing list', '[V] Passport\n[ ] Charger', { type: 16 }),
	record(3, 'synthetic-0003', 'Old idea', 'Archived text', { space: 16 }),
	record(4, 'synthetic-0004', 'Deleted', 'Trash text', { active_state: 16 }),
	record(5, 'synthetic-0005', 'Private', 'opaque', { encrypted: 1 }),
	record(6, 'synthetic-0006', 'syncable_settings', '{}', { type: 256 }),
];
/** A variable-length opaque prefix, as in real files, with no account data. */
export const v82Prefix = Buffer.concat([Buffer.alloc(16, 7), Buffer.from('"client_uuid":"00000000-0000-0000-0000-000000000000"}'), Buffer.from([0, 0, 0, 2, 0, 0, 0, 6])]);
/** Builds tests/fixtures/colornote-8.2-synthetic.backup (password 0000, header version 8.2). */
export function v82Fixture(): Uint8Array { return encryptPlain(stream(v82Records, v82Prefix), '0000', v82Records.length, [8, 2]); }

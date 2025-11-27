import { describe, it, expect } from 'vitest';
import { parseTime, parseDate, createVerbierDateTime, getVerbierNow } from '../src/utils.js';

describe('parseTime', () => {
    describe('24-hour format', () => {
        it('parses hour only (e.g., "15")', () => {
            expect(parseTime('15')).toEqual({ hour: 15, minute: 0, label: '3 PM' });
            expect(parseTime('8')).toEqual({ hour: 8, minute: 0, label: '8 AM' });
            expect(parseTime('0')).toEqual({ hour: 0, minute: 0, label: 'midnight' });
            expect(parseTime('23')).toEqual({ hour: 23, minute: 0, label: '11 PM' });
        });

        it('parses HH:MM format (e.g., "15:00")', () => {
            expect(parseTime('15:00')).toEqual({ hour: 15, minute: 0, label: '3 PM' });
            expect(parseTime('8:30')).toEqual({ hour: 8, minute: 30, label: '8:30 AM' });
            expect(parseTime('0:00')).toEqual({ hour: 0, minute: 0, label: 'midnight' });
            expect(parseTime('12:00')).toEqual({ hour: 12, minute: 0, label: 'noon' });
            expect(parseTime('23:59')).toEqual({ hour: 23, minute: 59, label: '11:59 PM' });
        });

        it('rejects invalid 24-hour values', () => {
            expect(parseTime('24')).toBeNull();
            expect(parseTime('25')).toBeNull();
            expect(parseTime('15:60')).toBeNull();
        });
    });

    describe('12-hour format without space', () => {
        it('parses Xam format (e.g., "3am")', () => {
            expect(parseTime('3am')).toEqual({ hour: 3, minute: 0, label: '3 AM' });
            expect(parseTime('8am')).toEqual({ hour: 8, minute: 0, label: '8 AM' });
            expect(parseTime('12am')).toEqual({ hour: 0, minute: 0, label: 'midnight' });
        });

        it('parses Xpm format (e.g., "3pm")', () => {
            expect(parseTime('3pm')).toEqual({ hour: 15, minute: 0, label: '3 PM' });
            expect(parseTime('9pm')).toEqual({ hour: 21, minute: 0, label: '9 PM' });
            expect(parseTime('12pm')).toEqual({ hour: 12, minute: 0, label: 'noon' });
        });

        it('parses HH:MMam/pm format (e.g., "3:30pm")', () => {
            expect(parseTime('3:30pm')).toEqual({ hour: 15, minute: 30, label: '3:30 PM' });
            expect(parseTime('9:15am')).toEqual({ hour: 9, minute: 15, label: '9:15 AM' });
            expect(parseTime('12:30pm')).toEqual({ hour: 12, minute: 30, label: '12:30 PM' });
            expect(parseTime('12:30am')).toEqual({ hour: 0, minute: 30, label: '12:30 AM' });
        });

        it('is case insensitive', () => {
            expect(parseTime('3AM')).toEqual({ hour: 3, minute: 0, label: '3 AM' });
            expect(parseTime('3PM')).toEqual({ hour: 15, minute: 0, label: '3 PM' });
            expect(parseTime('3:30PM')).toEqual({ hour: 15, minute: 30, label: '3:30 PM' });
        });

        it('rejects invalid 12-hour values', () => {
            expect(parseTime('0am')).toBeNull();
            expect(parseTime('13am')).toBeNull();
            expect(parseTime('13pm')).toBeNull();
            expect(parseTime('0pm')).toBeNull();
        });
    });

    describe('12-hour format with space', () => {
        it('parses "X am" format (e.g., "3 am")', () => {
            expect(parseTime('3 am')).toEqual({ hour: 3, minute: 0, label: '3 AM' });
            expect(parseTime('8 am')).toEqual({ hour: 8, minute: 0, label: '8 AM' });
            expect(parseTime('12 am')).toEqual({ hour: 0, minute: 0, label: 'midnight' });
        });

        it('parses "X pm" format (e.g., "3 pm")', () => {
            expect(parseTime('3 pm')).toEqual({ hour: 15, minute: 0, label: '3 PM' });
            expect(parseTime('9 pm')).toEqual({ hour: 21, minute: 0, label: '9 PM' });
            expect(parseTime('12 pm')).toEqual({ hour: 12, minute: 0, label: 'noon' });
        });

        it('parses "HH:MM am/pm" format (e.g., "3:30 pm")', () => {
            expect(parseTime('3:30 pm')).toEqual({ hour: 15, minute: 30, label: '3:30 PM' });
            expect(parseTime('9:15 am')).toEqual({ hour: 9, minute: 15, label: '9:15 AM' });
        });

        it('is case insensitive with space', () => {
            expect(parseTime('3 AM')).toEqual({ hour: 3, minute: 0, label: '3 AM' });
            expect(parseTime('3 PM')).toEqual({ hour: 15, minute: 0, label: '3 PM' });
        });
    });

    describe('special times', () => {
        it('parses "noon"', () => {
            expect(parseTime('noon')).toEqual({ hour: 12, minute: 0, label: 'noon' });
            expect(parseTime('NOON')).toEqual({ hour: 12, minute: 0, label: 'noon' });
        });

        it('parses "midnight"', () => {
            expect(parseTime('midnight')).toEqual({ hour: 0, minute: 0, label: 'midnight' });
            expect(parseTime('MIDNIGHT')).toEqual({ hour: 0, minute: 0, label: 'midnight' });
        });
    });

    describe('edge cases', () => {
        it('returns null for null/undefined/empty', () => {
            expect(parseTime(null)).toBeNull();
            expect(parseTime(undefined)).toBeNull();
            expect(parseTime('')).toBeNull();
        });

        it('trims whitespace', () => {
            expect(parseTime('  3pm  ')).toEqual({ hour: 15, minute: 0, label: '3 PM' });
            expect(parseTime('  noon  ')).toEqual({ hour: 12, minute: 0, label: 'noon' });
        });

        it('returns null for invalid formats', () => {
            expect(parseTime('abc')).toBeNull();
            expect(parseTime('3:00:00')).toBeNull();
            expect(parseTime('25:00')).toBeNull();
        });
    });
});

describe('parseDate', () => {
    describe('MM-DD format', () => {
        it('parses MM-DD and adds current year', () => {
            const currentYear = new Date().getFullYear();
            expect(parseDate('11-27')).toBe(`${currentYear}-11-27`);
            expect(parseDate('01-01')).toBe(`${currentYear}-01-01`);
            expect(parseDate('12-31')).toBe(`${currentYear}-12-31`);
        });
    });

    describe('YYYY-MM-DD format', () => {
        it('parses full date format', () => {
            expect(parseDate('2025-11-27')).toBe('2025-11-27');
            expect(parseDate('2024-01-01')).toBe('2024-01-01');
            expect(parseDate('2023-12-31')).toBe('2023-12-31');
        });
    });

    describe('invalid formats', () => {
        it('returns null for invalid formats', () => {
            expect(parseDate('11/27')).toBeNull();
            expect(parseDate('2025/11/27')).toBeNull();
            expect(parseDate('1-1')).toBeNull(); // Single digit month/day
            expect(parseDate('abc')).toBeNull();
            expect(parseDate('')).toBeNull();
        });

        it('does not validate date values (only format)', () => {
            // Note: parseDate only validates format, not semantic validity
            // Invalid dates like 27-11 (day-month) are accepted as MM-DD
            const currentYear = new Date().getFullYear();
            expect(parseDate('27-11')).toBe(`${currentYear}-27-11`);
            expect(parseDate('99-99')).toBe(`${currentYear}-99-99`);
        });
    });
});

describe('createVerbierDateTime', () => {
    it('creates a Date object for given date/time', () => {
        const result = createVerbierDateTime(2025, 11, 27, 12, 0);
        expect(result).toBeInstanceOf(Date);
        expect(result.getUTCFullYear()).toBe(2025);
    });

    it('handles midnight correctly', () => {
        const result = createVerbierDateTime(2025, 11, 27, 0, 0);
        expect(result).toBeInstanceOf(Date);
    });

    it('handles end of day correctly', () => {
        const result = createVerbierDateTime(2025, 11, 27, 23, 59);
        expect(result).toBeInstanceOf(Date);
    });

    it('pads single digit months and days', () => {
        const result = createVerbierDateTime(2025, 1, 5, 8, 0);
        expect(result).toBeInstanceOf(Date);
    });
});

describe('getVerbierNow', () => {
    it('returns a Date object', () => {
        const result = getVerbierNow();
        expect(result).toBeInstanceOf(Date);
    });

    it('returns a time close to now', () => {
        const result = getVerbierNow();
        const now = new Date();
        // Should be within 24 hours (accounting for timezone differences)
        const diff = Math.abs(result.getTime() - now.getTime());
        expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
    });
});

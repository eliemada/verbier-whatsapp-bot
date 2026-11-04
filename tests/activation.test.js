import { describe, expect, it } from 'vitest';
import { createActivation } from '../src/activation.js';

describe('season start', () => {
    it('resumes at 08:00 Swiss time on November 15, without restarting the worker', () => {
        let now = Date.parse('2026-11-15T06:59:59.999Z');
        const status = createActivation('2026-11-15T08:00:00+01:00', () => now);
        expect(status()).toEqual({ active: false, startsAt: '2026-11-15T07:00:00.000Z' });
        now += 1;
        expect(status().active).toBe(true);
    });

    it('retains the pause when the worker is recreated before the start date', () => {
        const now = () => Date.parse('2026-11-10T12:00:00Z');
        expect(createActivation('2026-11-15T08:00:00+01:00', now)().active).toBe(false);
        expect(createActivation('2026-11-15T08:00:00+01:00', now)().active).toBe(false);
    });

    it('runs normally when no start date is configured', () => {
        expect(createActivation()()).toEqual({ active: true, startsAt: null });
    });

    it.each(['not-a-date', '2026-11-15', '2026-11-15T08:00:00', '2026-99-15T08:00:00Z'])(
        'rejects invalid or ambiguous dates rather than posting early: %s',
        value => expect(() => createActivation(value)).toThrow('BOT_START_AT'),
    );
});

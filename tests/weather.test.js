import { describe, it, expect } from 'vitest';
import { formatCaption } from '../src/weather.js';

describe('formatCaption', () => {
    describe('with full weather data', () => {
        it('formats mountain and valley data', () => {
            const weather = {
                emoji: '❄️',
                mountain: { temp: -5, wind: 25, altitude: 2734 },
                valley: { temp: 3, wind: 10, altitude: 839 },
            };

            const result = formatCaption(weather, 'Test Title');

            expect(result).toContain('❄️ Test Title');
            expect(result).toContain('⛷️ *Pistes* (2734m)');
            expect(result).toContain('🌡️ -5°C  💨 25 km/h');
            expect(result).toContain('🏘️ *Vallée* (839m)');
            expect(result).toContain('🌡️ 3°C  💨 10 km/h');
        });

        it('handles different weather emojis', () => {
            const weather = {
                emoji: '🌨️',
                mountain: { temp: -2, wind: 15, altitude: 2734 },
                valley: { temp: 1, wind: 5, altitude: 839 },
            };

            const result = formatCaption(weather, 'Snowy Day');
            expect(result).toContain('🌨️ Snowy Day');
        });
    });

    describe('with partial weather data', () => {
        it('formats mountain only', () => {
            const weather = {
                emoji: '⛰️',
                mountain: { temp: 0, wind: 20, altitude: 2734 },
                valley: null,
            };

            const result = formatCaption(weather, 'Mountain Only');

            expect(result).toContain('⛰️ Mountain Only');
            expect(result).toContain('⛷️ *Pistes* (2734m)');
            expect(result).not.toContain('🏘️ *Vallée*');
        });

        it('formats valley only', () => {
            const weather = {
                emoji: '☀️',
                mountain: null,
                valley: { temp: 20, wind: 5, altitude: 839 },
            };

            const result = formatCaption(weather, 'Valley Only');

            expect(result).toContain('☀️ Valley Only');
            expect(result).not.toContain('⛷️ *Pistes*');
            expect(result).toContain('🏘️ *Vallée* (839m)');
        });
    });

    describe('with no weather data', () => {
        it('returns just the title when weather is null', () => {
            expect(formatCaption(null, 'Just Title')).toBe('Just Title');
        });

        it('returns just the title when weather is undefined', () => {
            expect(formatCaption(undefined, 'Just Title')).toBe('Just Title');
        });
    });

    describe('edge cases', () => {
        it('handles zero temperature', () => {
            const weather = {
                emoji: '❄️',
                mountain: { temp: 0, wind: 10, altitude: 2734 },
                valley: null,
            };

            const result = formatCaption(weather, 'Zero Temp');
            expect(result).toContain('🌡️ 0°C  💨 10 km/h');
        });

        it('handles negative wind (should not happen but handle gracefully)', () => {
            const weather = {
                emoji: '⛰️',
                mountain: { temp: 5, wind: -1, altitude: 2734 },
                valley: null,
            };

            const result = formatCaption(weather, 'Negative Wind');
            expect(result).toContain('💨 -1 km/h');
        });

        it('handles very cold temperatures', () => {
            const weather = {
                emoji: '🥶',
                mountain: { temp: -25, wind: 50, altitude: 2734 },
                valley: null,
            };

            const result = formatCaption(weather, 'Very Cold');
            expect(result).toContain('🌡️ -25°C');
        });
    });
});

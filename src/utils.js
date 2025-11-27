import { CONFIG } from './config.js';

/**
 * Creates a Date object for a specific time in Verbier timezone.
 */
export function createVerbierDateTime(year, month, day, hour, minute) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    const localDate = new Date(dateStr);
    const utcDate = new Date(`${dateStr}Z`);
    const offset =
        new Date(utcDate.toLocaleString('en-US', { timeZone: CONFIG.timezone })) - utcDate;
    return new Date(localDate.getTime() - offset);
}

export function getVerbierNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: CONFIG.timezone }));
}

/**
 * Parses time string into hour and minute.
 * Supports: "8am", "3pm", "15:00", "8:30"
 */
export function parseTime(timeStr) {
    if (!timeStr) return null;

    const hhmmMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmmMatch) {
        const [, h, m] = hhmmMatch.map(Number);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            return { hour: h, minute: m, label: timeStr };
        }
    }

    const ampmMatch = timeStr.match(/^(\d{1,2})(am|pm)$/i);
    if (ampmMatch) {
        let h = parseInt(ampmMatch[1], 10);
        const isPM = ampmMatch[2].toLowerCase() === 'pm';
        if (isPM && h !== 12) h += 12;
        if (!isPM && h === 12) h = 0;
        if (h >= 0 && h <= 23) {
            return { hour: h, minute: 0, label: timeStr.toUpperCase() };
        }
    }

    if (timeStr === 'noon' || timeStr === '12pm') {
        return { hour: 12, minute: 0, label: 'noon' };
    }

    return null;
}

/**
 * Parses date string into YYYY-MM-DD format.
 * Supports: "11-20" (MM-DD), "2025-11-20" (YYYY-MM-DD)
 */
export function parseDate(dateStr) {
    if (/^\d{2}-\d{2}$/.test(dateStr)) {
        return `${new Date().getFullYear()}-${dateStr}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    return null;
}

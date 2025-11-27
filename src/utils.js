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
 * Supports many formats:
 *   - 24h: "15", "15:00", "8:30"
 *   - 12h: "3am", "3 am", "3:30pm", "3:30 pm", "9 PM"
 *   - Special: "noon", "midnight"
 */
export function parseTime(timeStr) {
    if (!timeStr) return null;

    const str = timeStr.trim().toLowerCase();

    // Special cases
    if (str === 'noon' || str === '12pm' || str === '12 pm') {
        return { hour: 12, minute: 0, label: 'noon' };
    }
    if (str === 'midnight' || str === '12am' || str === '12 am') {
        return { hour: 0, minute: 0, label: 'midnight' };
    }

    // HH:MM with optional am/pm (e.g., "15:00", "3:30", "3:30pm", "3:30 pm")
    const timeWithMinutes = str.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (timeWithMinutes) {
        const [, hStr, mStr, period] = timeWithMinutes;
        let h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);

        if (m < 0 || m > 59) return null;

        if (period) {
            // 12-hour format only accepts 1-12
            if (h < 1 || h > 12) return null;
            const isPM = period.toLowerCase() === 'pm';
            if (isPM && h !== 12) h += 12;
            if (!isPM && h === 12) h = 0;
        } else {
            // 24-hour format
            if (h < 0 || h > 23) return null;
        }

        const label = formatTimeLabel(h, m);
        return { hour: h, minute: m, label };
    }

    // Hour only with am/pm (e.g., "3am", "3 am", "9pm", "9 pm")
    const hourWithPeriod = str.match(/^(\d{1,2})\s*(am|pm)$/i);
    if (hourWithPeriod) {
        const [, hStr, period] = hourWithPeriod;
        let h = parseInt(hStr, 10);

        // 12-hour format only accepts 1-12
        if (h < 1 || h > 12) return null;

        const isPM = period.toLowerCase() === 'pm';
        if (isPM && h !== 12) h += 12;
        if (!isPM && h === 12) h = 0;

        const label = formatTimeLabel(h, 0);
        return { hour: h, minute: 0, label };
    }

    // Hour only 24h format (e.g., "15", "8")
    const hourOnly = str.match(/^(\d{1,2})$/);
    if (hourOnly) {
        const h = parseInt(hourOnly[1], 10);
        if (h >= 0 && h <= 23) {
            const label = formatTimeLabel(h, 0);
            return { hour: h, minute: 0, label };
        }
    }

    return null;
}

/**
 * Formats hour and minute into a readable label.
 */
function formatTimeLabel(hour, minute) {
    if (hour === 0 && minute === 0) return 'midnight';
    if (hour === 12 && minute === 0) return 'noon';

    const h12 = hour % 12 || 12;
    const period = hour < 12 ? 'AM' : 'PM';
    const minStr = minute > 0 ? `:${String(minute).padStart(2, '0')}` : '';
    return `${h12}${minStr} ${period}`;
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

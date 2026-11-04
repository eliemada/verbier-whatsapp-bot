import { afterEach, describe, expect, it } from 'vitest';
import {
    existsSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cleanupBrowserLocks } from '../src/session.js';

const directories = [];
afterEach(() => {
    for (const directory of directories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

describe('cleanupBrowserLocks', () => {
    it('removes dangling Chromium lock links while preserving the authenticated profile', () => {
        const authDir = mkdtempSync(path.join(os.tmpdir(), 'verbier-session-'));
        directories.push(authDir);
        const profile = path.join(authDir, 'session', 'Default');
        mkdirSync(profile, { recursive: true });
        const sessionFile = path.join(profile, 'Cookies');
        writeFileSync(sessionFile, 'preserve-session');
        for (const directory of [path.dirname(profile), profile]) {
            for (const name of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
                const file = path.join(directory, name);
                symlinkSync('/nonexistent-old-container-lock', file);
                expect(existsSync(file)).toBe(false);
            }
        }
        const removed = cleanupBrowserLocks(authDir);
        expect(removed).toHaveLength(6);
        for (const file of removed) expect(() => lstatSync(file)).toThrow();
        expect(existsSync(sessionFile)).toBe(true);
        expect(cleanupBrowserLocks(authDir)).toEqual([]);
    });

    it('does not delete unexpected directories in place of lock files', () => {
        const authDir = mkdtempSync(path.join(os.tmpdir(), 'verbier-session-'));
        directories.push(authDir);
        mkdirSync(path.join(authDir, 'session', 'SingletonLock'), { recursive: true });
        expect(() => cleanupBrowserLocks(authDir)).toThrow();
        expect(existsSync(path.join(authDir, 'session', 'SingletonLock'))).toBe(true);
    });
});

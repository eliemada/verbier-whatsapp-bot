import { unlinkSync } from 'node:fs';
import path from 'node:path';

/** Remove locks left by a stopped browser, including dangling Chromium symlinks. */
export function cleanupBrowserLocks(authDir) {
    const removed = [];
    for (const directory of ['session', path.join('session', 'Default')]) {
        for (const name of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
            const file = path.join(authDir, directory, name);
            try {
                // existsSync follows symlinks and misses Chromium's dangling locks.
                unlinkSync(file);
                removed.push(file);
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
        }
    }
    return removed;
}

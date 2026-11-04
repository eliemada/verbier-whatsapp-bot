/** Evaluate the persisted start date on every request, including after restarts. */
export function createActivation(startAt = '', now = Date.now) {
    const startsAt = startAt ? Date.parse(startAt) : null;
    if (
        startAt &&
        (!/T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(startAt) ||
            !Number.isFinite(startsAt))
    ) {
        throw new Error('BOT_START_AT must be an ISO timestamp with an explicit timezone');
    }
    return () => ({
        active: startsAt === null || now() >= startsAt,
        startsAt: startsAt === null ? null : new Date(startsAt).toISOString(),
    });
}

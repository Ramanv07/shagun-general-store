/**
 * Wraps a promise with a hard timeout and safe failure catch.
 * Critical for serverless environments (e.g. Vercel) where background fire-and-forget
 * promises are frozen as soon as the HTTP response terminates.
 */
export async function withTimeout(promise, timeoutMs = 5000, label = 'operation') {
    let timer;
    const timeoutPromise = new Promise((resolve) => {
        timer = setTimeout(() => {
            console.warn(`[Timeout] ${label} exceeded ${timeoutMs}ms limit, continuing safely`);
            resolve(null);
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([
            Promise.resolve(promise).catch((err) => {
                console.error(`[SafeFailure] ${label} failed safely:`, err.message || err);
                return null;
            }),
            timeoutPromise
        ]);
        return result;
    } finally {
        clearTimeout(timer);
    }
}


import RateLimitRecord from '../models/RateLimitRecord.js';

export function createMongoRateLimiter({ windowMs, max, prefix, message, failClosed = false }) {
    return async (req, res, next) => {
        try {
            // Vercel edge platform header takes absolute precedence over client-supplied headers.
            // Under Express behind proxy (trust proxy = 1), req.ip is also validated.
            const vercelForwarded = req.headers['x-vercel-forwarded-for'];
            const ip = (vercelForwarded ? String(vercelForwarded).split(',')[0].trim() : null)
                || req.ip
                || (req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : null)
                || req.socket?.remoteAddress
                || '127.0.0.1';

            const key = `${prefix}:${ip}`;
            const now = new Date();
            const resetAt = new Date(now.getTime() + windowMs);

            // Attempt atomic increment on active window
            const record = await RateLimitRecord.findOneAndUpdate(
                { key, resetAt: { $gt: now } },
                { $inc: { hits: 1 } },
                { new: true }
            );

            if (record) {
                res.setHeader('X-RateLimit-Limit', max);
                res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.hits));
                res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt.getTime() / 1000));

                if (record.hits > max) {
                    return res.status(429).json({
                        message: message || 'Too many requests. Please try again later.'
                    });
                }
                return next();
            }

            // If no active window exists, initialize a new window
            const newRecord = await RateLimitRecord.findOneAndUpdate(
                { key },
                { $set: { hits: 1, resetAt, createdAt: now } },
                { upsert: true, new: true }
            );

            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, max - 1));
            res.setHeader('X-RateLimit-Reset', Math.ceil(newRecord.resetAt.getTime() / 1000));

            return next();
        } catch (err) {
            console.error(`[MongoRateLimiter] DB error updating rate limit for ${prefix}:`, err.message);
            if (failClosed) {
                return res.status(503).json({
                    message: 'Service Temporarily Unavailable: Rate limiter service unavailable'
                });
            }
            console.warn(`[MongoRateLimiter] Failing open for ${prefix} due to DB unavailability.`);
            return next();
        }
    };
}

export async function _clearRateLimits() {
    await RateLimitRecord.deleteMany({}).catch(() => {});
}


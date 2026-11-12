import app, { connectDB } from '../backend/app.js';

export default async function handler(req, res) {
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            message: 'Server Configuration Error: JWT_SECRET is not configured in Vercel Environment Variables.'
        });
    }

    // 1. Establish or reuse cached database connection pool
    const conn = await connectDB();
    if (!conn) {
        // Return HTTP 503 without crashing the serverless container
        return res.status(503).json({
            message: 'Service Temporarily Unavailable: Database connection failed. Verify MONGODB_URI in Vercel settings.'
        });
    }

    // 2. Delegate execution to the unified Express application (same middlewares, security headers, rate limits, routes)
    return app(req, res);
}

import app, { connectDB } from './app.js';

const PORT = process.env.PORT || 5000;

// Only bind to local TCP port when not operating inside Vercel serverless environment
if (!process.env.VERCEL) {
    connectDB()
        .then((conn) => {
            if (conn) {
                console.log('Atlas Connected');
                app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
            } else {
                console.warn('Starting server in offline mode...');
                app.listen(PORT, () => console.log(`Server running on port ${PORT} (DB offline)`));
            }
        })
        .catch((err) => {
            console.error('Startup error:', err);
            if (process.env.NODE_ENV === 'production') {
                process.exit(1);
            }
            app.listen(PORT, () => console.log(`Server running on port ${PORT} (DB offline)`));
        });
}

export default app;

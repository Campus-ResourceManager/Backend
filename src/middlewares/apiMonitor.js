const apiMonitor = (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`[API Monitor] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);

        // In a real system, you might save this to a database or external monitoring service (e.g., Datadog, Prometheus)
    });
    next();
};

module.exports = apiMonitor;

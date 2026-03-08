/**
 * Authentication Middleware
 * 
 * Ensures that a user session exists before allowing access to a route.
 * If not authenticated, returns a 401 Unauthorized error.
 */
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            message: "Authentication required: Please log in"
        });
    }
    next();
}

module.exports = requireAuth;

/**
 * Authentication Middleware
 * 
 * MODULE 1.2 - ROLE VERIFICATION (Authentication Check)
 * 
 * This middleware ensures that a user is logged in before accessing protected routes.
 * It checks if a valid session exists with user data.
 * 
 * How it works:
 * 1. Checks if req.session exists and contains user data
 * 2. If yes: User is authenticated, allow request to proceed (call next())
 * 3. If no: User is not authenticated, return 401 Unauthorized error
 * 
 * Usage:
 * Apply this middleware to any route that requires authentication:
 * router.get("/protected", requireAuth, controllerFunction);
 * 
 * Session Structure:
 * req.session.user = {
 *   userId: ObjectId,
 *   username: String,
 *   role: String,
 *   status: String
 * }
 */

const requireAuth = (req, res, next) => {
    // Log session check for debugging
    console.log("requireAuth checking session. User:", req.session?.user);

    // Check if session exists and has user data
    if (!req.session || !req.session.user) {
        // No valid session - user is not logged in
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    // Session is valid - user is authenticated
    // Allow request to proceed to next middleware or controller
    next();
};

module.exports = requireAuth;
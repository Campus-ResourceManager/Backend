/**
 * Role-Based Access Control Middleware
 * 
 * MODULE 1.2 - ROLE VERIFICATION (Authorization Check)
 * 
 * This middleware ensures that a user has the required role(s) to access a route.
 * It should be used AFTER requireAuth middleware (assumes user is already authenticated).
 * 
 * How it works:
 * 1. Accepts one or more allowed roles as parameter
 * 2. Checks if user's role matches any of the allowed roles
 * 3. If yes: User is authorized, allow request to proceed (call next())
 * 4. If no: User lacks permission, return 403 Forbidden error
 * 
 * Usage Examples:
 * // Single role:
 * router.get("/admin-only", requireAuth, requireRole("admin"), controllerFunction);
 * 
 * // Multiple roles:
 * router.get("/staff-only", requireAuth, requireRole(["admin", "coordinator"]), controllerFunction);
 * 
 * Available Roles:
 * - "admin": Can approve/reject bookings, manage users
 * - "coordinator": Can create booking requests, view own bookings
 */

const requireRole = (allowedRoles) => {
    // Return middleware function
    return (req, res, next) => {
        // Get user's role from session (set by requireAuth middleware)
        const userRole = req.session.user.role;

        // Convert allowedRoles to array if it's a single string
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        // Check if user's role is in the allowed roles list
        if (!roles.includes(userRole)) {
            // User's role is not allowed - return 403 Forbidden
            return res.status(403).json({
                message: "Access denied: insufficient permissions"
            });
        }

        // User has required role - allow request to proceed
        next();
    }
}

module.exports = requireRole;
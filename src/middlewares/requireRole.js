/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Restricts access to specific roles (e.g., 'admin' or 'coordinator').
 * Must be used after requireAuth to ensure req.session.user is populated.
 * 
 * @param {string|string[]} allowedRoles - The required role(s) to access the route.
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.session.user.role;
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        // Check if the current user's role matches one of the allowed roles
        if (!roles.includes(userRole)) {
            return res.status(403).json({
                message: "Access denied: insufficient permissions"
            });
        }

        next(); // Authorization successful
    }
}

module.exports = requireRole;

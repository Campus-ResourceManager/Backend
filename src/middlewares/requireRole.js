const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.session.user.role;
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        if (!roles.includes(userRole)) {
            return res.status(403).json({
                message: "Access denied: insufficient permissions"
            });
        }

        next(); // role allowed
    }
}

module.exports = requireRole;
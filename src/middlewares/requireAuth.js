const requireAuth = (req, res, next) => {
    console.log("requireAuth checking session. User:", req.session?.user);
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }
    next();
};

module.exports = requireAuth;
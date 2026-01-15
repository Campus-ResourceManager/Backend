const User = require("../models/user");

const loginUser = async (req, res) => { 
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({
                message :"Invalid credentials"
            })
        }

        if (user.status !== "active") {
            return res.status(403).json({
                message: "User account is disabled"
            });
        }

        if (user.password !== password) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        req.session.user = {
            userId: user._id,
            role: user.role,
            status: user.status
        }
        res.status(200).send({message: "Login Successful"})
    }  catch (err) {
        console.error(err);
        res.status(500).json({
        message: "Server error"
        });
    }
}

const logoutUser = (req, res) => {
    req.session.destroy();
    res.status(200).json({
        message : "User successfully logged out"
    })
};

const getMe = (req, res) => {
    res.status(200).json(req.session.user)
};

module.exports = {
    loginUser,
    logoutUser,
    getMe
};

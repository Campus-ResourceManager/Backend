const User = require("../models/user");
const bcrypt = require("bcrypt");

const registerUser = async (req, res) => {
    try { 
        const {username, password , role } = req.body;
        if (!username || !password || !role ) {
            return res.status(400).json({
                message : "UserName, password and role. Everthing is required"
            })
        }
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                message : "User already exists"
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        const user =await User.create({
            username, 
            password: hashedPassword,
            role,
            status: "active"
        })
        
        res.status(201).json({
            message : "User Registered successsfully",
            user : {
                id : user._id,
                username : user.username,
                role : user.role,
                status : user.status
            }
        });
    } catch(err) {
        console.log(err);
        res.status(500).json({
            message : "server error"
        })
    }
};

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

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        req.session.user = {
            userId: user._id,
            role: user.role,
            status: user.status
        }
        
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                status: user.status
            }
        });
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
    registerUser,
    loginUser,
    logoutUser,
    getMe
};


const loginUser = (req, res) => { 
    try {
        const { username, password } = req.body;
        req.session.user = { 
            userId: 1,
            role: "coordinator", 
            status: "active"
        }
        console.log(username, password);
        res.status(200).send({message: "user logged in"})
    }  catch (err) {
        
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

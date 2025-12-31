
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

const getMe = (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({
            message : "Not logged in"
        })
    }
    res.status(200).json(req.session.user)
};

module.exports = {
    loginUser,
    getMe
};

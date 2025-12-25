const loginUser = (req, res) => { 
    
    res.status(201).send({message: "user logged in"})
}

module.exports = {
    loginUser
};

const loginUser = (req, res) => { 
    try {
        const { username, password } = req.body;
        console.log(username, password);
        res.status(201).send({message: "user logged in"})
    }  catch (err) {
        
    }
}

module.exports = {
    loginUser
};

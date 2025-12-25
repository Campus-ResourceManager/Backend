require("dotenv").config();
const authRoutes = require("./routes/auth.js")
const express = require("express");
const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use("/api/auth", authRoutes);

app.get('/', (req, res) => {
    res.send('backend running');
})

app.listen(port, (err) => {
    if (err) {
        console.log("error while starting the server");
    } else {
        console.log("Server has been started at ",port);
    }
});
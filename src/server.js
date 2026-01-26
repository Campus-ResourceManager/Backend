require("dotenv").config();
const session = require('express-session') 
const authRoutes = require("./routes/auth.js") 
const express = require("express")
const mongoose = require("mongoose")
const app = express()
const cors = require("cors")
const port = process.env.PORT
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json())
app.use(session({
    secret : 'keyboardCat',
    resave: false, 
    saveUninitialized : true, 
    cookie: { secure: false } 
}))

app.use("/api/auth", authRoutes)
app.get('/', (req, res) => { res.send('backend running'); })
mongoose.connect(process.env.MONGO_URI) 
    .then(() => { 
        console.log("Mongo DB connected");
        app.listen(port, () => { 
        console.log("server running at port", port);
    }); 
    }) 
    .catch((err) => { 
        console.error("Mongo DB connection failed", err);
    });
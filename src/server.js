require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");

const authRoutes = require("./routes/auth.js");
const app = express();
const port = process.env.PORT;

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
const port = process.env.PORT || 8000;

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "keyboardCat",
    resave: false,
    saveUninitialized : true,
    cookie: { 
        httpOnly: true,
        secure: false,   // true only in HTTPS
        sameSite: "lax" 
    }
}))
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions"
    }),
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("backend running");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Mongo DB connected");
    app.listen(port, () => {
      console.log("server running at port", port);
    });
  })
  .catch((err) => {
    console.error("Mongo DB connection failed", err);
  });

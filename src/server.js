require("dotenv").config(); // Load environment variables
const session = require("express-session");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth.js");
const bookingRoutes = require("./routes/booking.js");
const auditLogRoutes = require("./routes/auditLog.js");

const app = express();
const port = process.env.PORT;
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());
app.use(
  session({
    secret: "keyboardCat",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/audit-logs", auditLogRoutes);

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

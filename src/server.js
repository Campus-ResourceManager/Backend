require("dotenv").config();
require("express-async-errors");
const session = require("express-session");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");

const authRoutes = require("./routes/auth.js");
const bookingRoutes = require("./routes/booking.js");
const facilityRoutes = require("./routes/facility.js");

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

// Set security headers
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again in 15 minutes"
});
app.use("/api", limiter);

// Strict rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login attempts per hour
  message: "Too many login attempts from this IP, please try again after an hour"
});
app.use("/api/auth/login", authLimiter);



app.use(express.json({ limit: "10kb" })); // Body limit

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "keyboardCat", // Use env var in production
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Secure in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/facilities", facilityRoutes);

// Global Error Handler
const fs = require('fs');
app.use((err, req, res, next) => {
  console.error("Global Error Caught:", err);
  const logMessage = `${new Date().toISOString()} - ${err.stack}\n`;
  fs.appendFileSync('error.log', logMessage);
  res.status(500).json({ message: "Internal Server Error", error: err.message });
});

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

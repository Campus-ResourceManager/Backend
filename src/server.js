/**
 * SWE CampusResourceManager - Backend Entry Point
 * 
 * This file initializes the Express server, connects to MongoDB,
 * and sets up the global middlewares and routes.
 */

require("dotenv").config();
const session = require("express-session");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Import Route Handlers
const authRoutes = require("./routes/auth.js");
const bookingRoutes = require("./routes/booking.js");
const resourceRoutes = require("./routes/resource");
const reallocationRoutes = require("./routes/reallocationRoutes");

const app = express();
const port = process.env.PORT || 8000;

/**
 * Global Middlewares
 */

// Configure CORS to allow frontend communication
app.use(
  cors({
    origin: "http://localhost:5173", // Frontend Dev Server
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Parse JSON request bodies
app.use(express.json());

// Session Management for tracking authenticated users
app.use(
  session({
    secret: "keyboardCat", // Ideally moved to .env in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
  })
);

/**
 * API Route Declarations
 */
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/reallocation", reallocationRoutes);

// Health Check Endpoint
app.get("/", (req, res) => {
  res.send("backend running");
});

/**
 * Database Connection & Server Startup
 * 
 * Connects to MongoDB via Mongoose and starts the Express listener
 * only after a successful database connection.
 */
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


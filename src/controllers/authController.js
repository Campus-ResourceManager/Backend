/**
 * Authentication Controller
 * 
 * MODULE 1 - USER IDENTIFICATION & AUTHENTICATION
 * 
 * This controller handles all authentication-related operations including:
 * - User registration (coordinators and admin requests)
 * - User login with role verification
 * - Session management
 * - User logout
 * - Admin approval workflow
 * - User management (coordinators and admins)
 */

const User = require("../models/user");
const bcrypt = require("bcrypt");

/**
 * MODULE 1 - Submodule 1.1: Login Authentication (Registration Part)
 * 
 * Register a new user (coordinator or admin)
 * 
 * Process:
 * 1. Validate required fields (username, password, role)
 * 2. Check if username already exists
 * 3. Hash password using bcrypt (10 salt rounds)
 * 4. Create user with appropriate status:
 *    - Admin: status = "disabled" (requires approval)
 *    - Coordinator: status = "active" (immediately active)
 * 5. Return success response
 * 
 * @route POST /api/auth/register (for coordinators)
 * @route POST /api/auth/admin/request (for admin requests)
 * @access Public
 */
const registerUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Validate required fields
    if (!username || !password || !role) {
      return res.status(400).json({
        message: "Username, password and role are required"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    // Hash password for security (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    // Admin accounts start as "disabled" and require approval
    // Coordinator accounts are immediately "active"
    const user = await User.create({
      username,
      password: hashedPassword,
      role,
      status: role === "admin" ? "disabled" : "active"
    });

    // Return success response
    res.status(201).json({
      message:
        role === "admin"
          ? "Admin request submitted. Awaiting approval."
          : "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        status: user.status
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * MODULE 1 - Submodule 1.1: Login Authentication
 * 
 * Authenticate user and create session
 * 
 * Process:
 * 1. Validate credentials (username, password, role)
 * 2. Find user in database
 * 3. Verify role matches (prevents login with wrong role)
 * 4. Check account status (must be "active")
 * 5. Compare password with hashed password using bcrypt
 * 6. Create session with user data
 * 7. Return success response
 * 
 * @route POST /api/auth/login
 * @access Public
 */
const loginUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Validate required fields
    if (!username || !password || !role) {
      return res.status(400).json({
        message: "Username, password and role are required"
      });
    }

    // Find user by username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    // MODULE 1 - Submodule 1.2: Role Verification
    // Ensure user is logging in with the correct role
    if (user.role !== role) {
      return res.status(401).json({
        message: `Invalid role. Your account role is ${user.role}`
      });
    }

    // Check if account is active (not disabled)
    if (user.status !== "active") {
      return res.status(403).json({
        message: "User account is disabled"
      });
    }

    // Verify password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    // Create session with user data
    // This session is used for authentication on subsequent requests
    req.session.user = {
      userId: user._id,
      role: user.role,
      status: user.status,
      username: user.username
    };

    // Return success response
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        username: user.username,
        role: user.role
      }
    });


  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * MODULE 1 - Submodule 1.3: Logout Functionality
 * 
 * Destroy user session and log out
 * 
 * Process:
 * 1. Destroy session using req.session.destroy()
 * 2. Clear session data from MongoDB store
 * 3. Return success response
 * 
 * @route POST /api/auth/logout
 * @access Private (requires authentication)
 */
const logoutUser = (req, res) => {
  // Destroy session - this removes session from MongoDB store
  req.session.destroy();
  res.status(200).json({
    message: "User successfully logged out"
  });
};

/**
 * Get current authenticated user information
 * 
 * Used by frontend to check authentication status and retrieve user data
 * 
 * @route GET /api/auth/me
 * @access Public (but returns null if not authenticated)
 */
const getMe = (req, res) => {
  try {
    console.log("getMe called. Session user:", req.session?.user);

    // Check if session exists and has user data
    if (req.session && req.session.user) {
      return res.status(200).json({
        success: true,
        user: {
          userId: req.session.user.userId,
          role: req.session.user.role,
          status: req.session.user.status,
          username: req.session.user.username
        }
      });
    } else {
      // No active session
      return res.status(200).json({ success: false, user: null });
    }
  } catch (error) {
    console.error("getMe Error:", error);
    return res.status(500).json({ message: "Server error in getMe" });
  }
};

/**
 * USER MANAGEMENT - Admin Operations
 * 
 * The following functions handle admin approval workflow and user management
 */

/**
 * Get all pending admin requests
 * 
 * Returns list of users with role="admin" and status="disabled"
 * These are admin registration requests awaiting approval
 * 
 * @route GET /api/auth/admin/pending
 * @access Private (admin only)
 */
const getPendingAdmins = async (req, res) => {
  const pendingAdmins = await User.find({
    role: "admin",
    status: "disabled"
  }).select("-password"); // Exclude password field

  res.status(200).json(pendingAdmins);
};

/**
 * Approve an admin request
 * 
 * Changes admin status from "disabled" to "active"
 * Allows the admin to log in and access admin features
 * 
 * @route PATCH /api/auth/admin/:id/approve
 * @access Private (admin only)
 */
const approveAdmin = async (req, res) => {
  const { id } = req.params;

  // Update admin status to "active"
  const admin = await User.findByIdAndUpdate(
    id,
    { status: "active" },
    { new: true } // Return updated document
  );

  if (!admin) {
    return res.status(404).json({ message: "Admin not found" });
  }

  res.status(200).json({
    message: "Admin approved successfully"
  });
};

/**
 * Reject an admin request
 * 
 * Deletes the admin request from database
 * User will need to register again if they want to request admin access
 * 
 * @route DELETE /api/auth/admin/:id/reject
 * @access Private (admin only)
 */
const rejectAdmin = async (req, res) => {
  const { id } = req.params;

  await User.findByIdAndDelete(id);

  res.status(200).json({
    message: "Admin request rejected"
  });
};

/**
 * Disable an existing admin
 * 
 * Changes admin status from "active" to "disabled"
 * Prevents admin from logging in without deleting their account
 * 
 * @route PATCH /api/auth/admin/:id/disable
 * @access Private (admin only)
 */
const disableAdmin = async (req, res) => {
  const { id } = req.params;

  // Prevent admin from disabling themselves
  if (req.session.user.userId === id) {
    return res.status(400).json({
      message: "Admin cannot disable themselves"
    });
  }

  // Update admin status to "disabled"
  const admin = await User.findOneAndUpdate(
    { _id: id, role: "admin" },
    { status: "disabled" },
    { new: true }
  );

  if (!admin) {
    return res.status(404).json({
      message: "Admin not found"
    });
  }

  res.status(200).json({
    message: "Admin disabled successfully"
  });
};

/**
 * Permanently remove an admin
 * 
 * Deletes admin account from database
 * This action cannot be undone
 * 
 * @route DELETE /api/auth/admin/:id/remove
 * @access Private (admin only)
 */
const removeAdmin = async (req, res) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (req.session.user.userId === id) {
    return res.status(400).json({
      message: "Admin cannot remove themselves"
    });
  }

  // Delete admin from database
  const admin = await User.findOneAndDelete({
    _id: id,
    role: "admin"
  });

  if (!admin) {
    return res.status(404).json({
      message: "Admin not found"
    });
  }

  res.status(200).json({
    message: "Admin removed permanently"
  });
};

/**
 * Get all coordinators
 * 
 * Returns list of all users with role="coordinator"
 * Used in admin user management interface
 * 
 * @route GET /api/auth/coordinators
 * @access Private (admin only)
 */
const getCoordinators = async (req, res) => {
  const coordinators = await User.find({
    role: "coordinator"
  }).select("-password"); // Exclude password field

  res.status(200).json(coordinators);
};

/**
 * Delete a coordinator
 * 
 * Permanently removes coordinator account from database
 * 
 * @route DELETE /api/auth/coordinators/:id
 * @access Private (admin only)
 */
const deleteCoordinator = async (req, res) => {
  const { id } = req.params;

  const coordinator = await User.findOneAndDelete({
    _id: id,
    role: "coordinator"
  });

  if (!coordinator) {
    return res.status(404).json({
      message: "Coordinator not found"
    });
  }

  res.status(200).json({
    message: "Coordinator deleted successfully"
  });
};

/**
 * Get all active admins
 * 
 * Returns list of admins with status="active"
 * Used in admin user management interface
 * 
 * @route GET /api/auth/admin/active
 * @access Private (admin only)
 */
const getActiveAdmins = async (req, res) => {
  const admins = await User.find({
    role: "admin",
    status: "active"
  }).select("-password"); // Exclude password field

  res.status(200).json(admins);
};


// Export all controller functions
module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  getPendingAdmins,
  approveAdmin,
  rejectAdmin,
  disableAdmin,
  removeAdmin,
  getCoordinators,
  deleteCoordinator,
  getActiveAdmins
};

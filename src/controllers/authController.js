/**
 * Authentication and User Management Controller
 * 
 * Handles user registration, login, session management, and admin/coordinator 
 * administrative actions.
 */

const User = require("../models/user");
const bcrypt = require("bcrypt");

/**
 * POST /api/auth/register
 * Registers a new user or submits an admin request.
 */
const registerUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Validate request body
    if (!username || !password || !role) {
      return res.status(400).json({
        message: "Username, password and role are required"
      });
    }

    // Check for existing users to prevent duplicate usernames
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    // Hash password for security before storing in DB
    const hashedPassword = await bcrypt.hash(password, 10);

    // Initial user creation
    // Admins are created as 'disabled' until another admin approves them
    const user = await User.create({
      username,
      password: hashedPassword,
      role,
      status: role === "admin" ? "disabled" : "active"
    });

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
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/auth/login
 * Authenticates a user and establishes a session.
 */
const loginUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;

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

    // Ensure the role matches the login attempt
    if (user.role !== role) {
      return res.status(401).json({
        message: `Invalid role. Your account role is ${user.role}`
      });
    }

    // Check if the account is active (Admins must be approved)
    if (user.status !== "active") {
      return res.status(403).json({
        message: "User account is disabled"
      });
    }

    // Compare provided password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    // Set session data on successful authentication
    req.session.user = {
      userId: user._id,
      role: user.role,
      status: user.status,
      username: user.username
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        username: user.username,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/auth/logout
 * Destroys the user session.
 */
const logoutUser = (req, res) => {
  req.session.destroy();
  res.status(200).json({
    message: "User successfully logged out"
  });
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's session data.
 */
const getMe = (req, res) => {
  if (req.session.user) {
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
    return res.status(200).json({ success: false, user: null });
  }
};

/**
 * GET /api/auth/admins/pending
 * [Admin only] Retrieves all admins awaiting registration approval.
 */
const getPendingAdmins = async (req, res) => {
  try {
    const pendingAdmins = await User.find({
      role: "admin",
      status: "disabled"
    }).select("-password");

    res.status(200).json(pendingAdmins);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending admins" });
  }
};

/**
 * PATCH /api/auth/admins/:id/approve
 * [Admin only] Approves a pending admin request.
 */
const approveAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findByIdAndUpdate(
      id,
      { status: "active" },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({
      message: "Admin approved successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Approval failed" });
  }
};

/**
 * DELETE /api/auth/admins/:id/reject
 * [Admin only] Rejects and deletes a pending admin request.
 */
const rejectAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.status(200).json({
      message: "Admin request rejected"
    });
  } catch (error) {
    res.status(500).json({ message: "Rejection failed" });
  }
};

/**
 * PATCH /api/auth/admins/:id/disable
 * [Admin only] Disables an active admin account.
 */
const disableAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Safety check: prevent admin from disabling their own account
    if (req.session.user.userId === id) {
      return res.status(400).json({
        message: "Admin cannot disable themselves"
      });
    }

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
  } catch (error) {
    res.status(500).json({ message: "Disable failed" });
  }
};

/**
 * DELETE /api/auth/admins/:id/remove
 * [Admin only] Permanently deletes an admin account.
 */
const removeAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.session.user.userId === id) {
      return res.status(400).json({
        message: "Admin cannot remove themselves"
      });
    }

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
  } catch (error) {
    res.status(500).json({ message: "Removal failed" });
  }
};

/**
 * GET /api/auth/coordinators
 * [Admin only] Retrieves all coordinator accounts.
 */
const getCoordinators = async (req, res) => {
  try {
    const coordinators = await User.find({
      role: "coordinator"
    }).select("-password");

    res.status(200).json(coordinators);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch coordinators" });
  }
};

/**
 * DELETE /api/auth/coordinators/:id
 * [Admin only] Deletes a coordinator account.
 */
const deleteCoordinator = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Deletion failed" });
  }
};

/**
 * GET /api/auth/admins/active
 * Retrieves all active admin accounts for selection/monitoring.
 */
const getActiveAdmins = async (req, res) => {
  try {
    const admins = await User.find({
      role: "admin",
      status: "active"
    }).select("-password");

    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch active admins" });
  }
};


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

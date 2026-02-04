const User = require("../models/user");
const bcrypt = require("bcrypt");

const registerUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({
        message: "Username, password and role are required"
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });   
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


const loginUser = async (req, res) => { 
    try {
        const { username, password, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({
                message: "Username, password and role are required"
            });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        if (user.role !== role) {
            return res.status(401).json({
                message: `Invalid role. Your account role is ${user.role}`
            });
        }

        if (user.status !== "active") {
            return res.status(403).json({
                message: "User account is disabled"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        req.session.user = {
            userId: user._id,
            role: user.role,
            status: user.status
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
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

const logoutUser = (req, res) => {
    req.session.destroy();
    res.status(200).json({
        message: "User successfully logged out"
    });
};

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

const getPendingAdmins = async (req, res) => {
  const pendingAdmins = await User.find({
    role: "admin",
    status: "disabled"
  }).select("-password");

  res.status(200).json(pendingAdmins);
};

const approveAdmin = async (req, res) => {
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
};

const rejectAdmin = async (req, res) => {
  const { id } = req.params;

  await User.findByIdAndDelete(id);

  res.status(200).json({
    message: "Admin request rejected"
  });
};

const disableAdmin = async (req, res) => {
  const { id } = req.params;

  // prevent admin from disabling themselves
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
};

const removeAdmin = async (req, res) => {
  const { id } = req.params;

  // prevent self-deletion
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
};

const getCoordinators = async (req, res) => {
  const coordinators = await User.find({
    role: "coordinator"
  }).select("-password");

  res.status(200).json(coordinators);
};

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

const getActiveAdmins = async (req, res) => {
  const admins = await User.find({
    role: "admin",
    status: "active"
  }).select("-password");

  res.status(200).json(admins);
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


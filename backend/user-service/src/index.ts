import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication middleware
const authenticateToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: "Invalid or expired token" });
      return;
    }
    (req as any).user = user;
    next();
  });
};

// In-memory user store (replace with database in production)
interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    address?: string;
    department?: string;
    position?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userProfiles: UserProfile[] = [
  {
    id: "1",
    email: "admin@rpp.com",
    name: "Admin User",
    role: "admin",
    profile: {
      firstName: "Admin",
      lastName: "User",
      phone: "0812345678",
      address: "Bangkok, Thailand",
      department: "IT",
      position: "System Administrator",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    email: "user@rpp.com",
    name: "Regular User",
    role: "user",
    profile: {
      firstName: "Regular",
      lastName: "User",
      phone: "0823456789",
      address: "Chiang Mai, Thailand",
      department: "Marketing",
      position: "Marketing Specialist",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    email: "john@rpp.com",
    name: "John Doe",
    role: "user",
    profile: {
      firstName: "John",
      lastName: "Doe",
      phone: "0834567890",
      address: "Phuket, Thailand",
      department: "Sales",
      position: "Sales Representative",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "User Service",
    timestamp: new Date().toISOString(),
  });
});

// Get all users (requires authentication)
app.get(
  "/users",
  authenticateToken,
  (req: express.Request, res: express.Response): void => {
    const users = userProfiles.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    }));
    res.json({ users, total: users.length });
  },
);

// Get user by ID
app.get("/user/:id", (req: express.Request, res: express.Response): void => {
  const { id } = req.params;
  const user = userProfiles.find((u) => u.id === id);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    profile: user.profile,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

// Update user profile (requires authentication)
app.put(
  "/user/:id",
  authenticateToken,
  (req: express.Request, res: express.Response): void => {
    const { id } = req.params;
    const { name, profile, role } = req.body;
    const currentUser = (req as any).user;

    const userIndex = userProfiles.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check if user is trying to update role and if they have admin privileges
    if (role && currentUser.role !== "admin") {
      res.status(403).json({ error: "Only admin can update user roles" });
      return;
    }

    // Update user data
    if (name) userProfiles[userIndex].name = name;
    if (profile) {
      userProfiles[userIndex].profile = {
        ...userProfiles[userIndex].profile,
        ...profile,
      };
    }
    if (role && currentUser.role === "admin") {
      userProfiles[userIndex].role = role;
    }
    userProfiles[userIndex].updatedAt = new Date();

    res.json({
      message: "User updated successfully",
      user: {
        id: userProfiles[userIndex].id,
        email: userProfiles[userIndex].email,
        name: userProfiles[userIndex].name,
        role: userProfiles[userIndex].role,
        profile: userProfiles[userIndex].profile,
        createdAt: userProfiles[userIndex].createdAt,
        updatedAt: userProfiles[userIndex].updatedAt,
      },
    });
  },
);

// Create user profile (called from auth service)
app.post("/users", (req: express.Request, res: express.Response): void => {
  const { id, email, name, role } = req.body;

  if (!id || !email || !name || !role) {
    res.status(400).json({ error: "ID, email, name, and role are required" });
    return;
  }

  const existingUser = userProfiles.find((u) => u.id === id);
  if (existingUser) {
    res.status(409).json({ error: "User already exists" });
    return;
  }

  const newUser: UserProfile = {
    id,
    email,
    name,
    role,
    profile: {
      firstName: name.split(" ")[0] || "",
      lastName: name.split(" ").slice(1).join(" ") || "",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  userProfiles.push(newUser);

  res.status(201).json({
    message: "User profile created successfully",
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      profile: newUser.profile,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    },
  });
});

// Delete user
app.delete("/user/:id", (req: express.Request, res: express.Response): void => {
  const { id } = req.params;

  const userIndex = userProfiles.findIndex((u) => u.id === id);
  if (userIndex === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  userProfiles.splice(userIndex, 1);
  res.json({ message: "User deleted successfully" });
});

// Search users
app.get(
  "/search/:query",
  (req: express.Request, res: express.Response): void => {
    const { query } = req.params;
    const searchTerm = query.toLowerCase();

    const filteredUsers = userProfiles.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.role.toLowerCase().includes(searchTerm) ||
        user.profile.firstName.toLowerCase().includes(searchTerm) ||
        user.profile.lastName.toLowerCase().includes(searchTerm),
    );

    res.json({ users: filteredUsers, total: filteredUsers.length });
  },
);

// Default route (service info)
app.get("/", (req, res) => {
  res.json({
    message: "RPP Portal User Service",
    version: "1.0.0",
    endpoints: ["/users", "/user/:id", "/search/:query"],
  });
});

// Error handling middleware
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  },
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`👤 User Service running on port ${PORT}`);
});

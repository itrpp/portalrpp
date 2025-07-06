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
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "your-nextauth-secret";

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:3000", // Next.js frontend
      "http://localhost:3001", // API Gateway
      process.env.FRONTEND_URL || "http://localhost:3000",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// Authentication middleware - Enhanced for NextAuth
const authenticateToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void => {
  // Check for user info from API Gateway headers (NextAuth session)
  const userIdHeader = req.headers["x-user-id"] as string;
  const userRoleHeader = req.headers["x-user-role"] as string;

  if (userIdHeader && userRoleHeader) {
    // User authenticated via NextAuth session through API Gateway
    (req as any).user = {
      userId: userIdHeader,
      role: userRoleHeader,
    };
    return next();
  }

  // Fallback to JWT token authentication
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  // Try NextAuth JWT first
  try {
    const decoded = jwt.verify(token, NEXTAUTH_SECRET) as any;
    (req as any).user = {
      userId: decoded.sub || decoded.userId,
      role: decoded.role || "user",
    };
    return next();
  } catch (error) {
    // Try regular JWT as fallback
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as any).user = {
        userId: decoded.userId,
        role: decoded.role || "user",
      };
      return next();
    } catch (err) {
      res.status(403).json({ error: "Invalid or expired token" });
      return;
    }
  }
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "User Service with NextAuth Support",
    timestamp: new Date().toISOString(),
  });
});

// User profile interface
interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    department?: string;
    position?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// In-memory user profiles (replace with database in production)
const userProfiles: UserProfile[] = [
  {
    id: "1",
    email: "admin@rpp.com",
    name: "Admin User",
    role: "admin",
    profile: {
      firstName: "Admin",
      lastName: "User",
      department: "IT",
      position: "System Administrator",
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    email: "user@rpp.com",
    name: "Regular User",
    role: "user",
    profile: {
      firstName: "Regular",
      lastName: "User",
      department: "General",
      position: "Employee",
    },
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  },
  {
    id: "3",
    email: "john@rpp.com",
    name: "John Doe",
    role: "user",
    profile: {
      firstName: "John",
      lastName: "Doe",
      department: "Sales",
      position: "Sales Representative",
    },
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date("2024-01-03"),
  },
];

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

// Get user by ID (requires authentication)
app.get(
  "/user/:id",
  authenticateToken,
  (req: express.Request, res: express.Response): void => {
    const { id } = req.params;
    const currentUser = (req as any).user;

    const user = userProfiles.find((u) => u.id === id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Users can only view their own profile unless they're admin
    if (currentUser.userId !== id && currentUser.role !== "admin") {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    res.json(user);
  },
);

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

    // Users can only update their own profile unless they're admin
    if (currentUser.userId !== id && currentUser.role !== "admin") {
      res.status(403).json({ error: "Access denied" });
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

// Create user profile (called from auth service or admin)
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

// Delete user profile (admin only)
app.delete(
  "/user/:id",
  authenticateToken,
  (req: express.Request, res: express.Response): void => {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // Only admin can delete users
    if (currentUser.role !== "admin") {
      res.status(403).json({ error: "Only admin can delete users" });
      return;
    }

    const userIndex = userProfiles.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Don't allow admin to delete themselves
    if (currentUser.userId === id) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    userProfiles.splice(userIndex, 1);

    res.json({
      message: "User deleted successfully",
    });
  },
);

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "RPP Portal User Service with NextAuth Support",
    version: "2.1.0",
    endpoints: ["/users", "/user/:id"],
    authSupport: ["JWT", "NextAuth"],
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`👥 User Service with NextAuth Support running on port ${PORT}`);
  console.log(`📋 Authentication Support:`);
  console.log(`   - JWT Tokens: Enabled`);
  console.log(`   - NextAuth Sessions: Enabled`);
  console.log(`   - API Gateway Headers: Enabled`);
});

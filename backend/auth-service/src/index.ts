import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// import { authenticate } from "ldap-authentication"; // Not used with user bind approach

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "your-refresh-secret-key";

// Token expiry configuration
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "7d"; // 7 days
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "30d"; // 30 days

// NextAuth secret (should match frontend)
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "your-nextauth-secret";

// LDAP Configuration (kept for reference, using direct env vars in user bind approach)
// const LDAP_CONFIG = {
//   ldapOpts: {
//     url: process.env.LDAP_URL || "ldap://localhost:389",
//   },
//   adminDn: process.env.LDAP_ADMIN_DN || "cn=admin,dc=example,dc=com",
//   adminPassword: process.env.LDAP_ADMIN_PASSWORD || "admin",
//   userSearchBase: process.env.LDAP_USER_SEARCH_BASE || "ou=users,dc=example,dc=com",
//   usernameAttribute: process.env.LDAP_USERNAME_ATTRIBUTE || "uid",
// };

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

// In-memory user store (replace with database in production)
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  createdAt: Date;
  refreshToken?: string;
}

// Interface for authenticated user (both local and LDAP)
interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  ldapUser?: boolean;
}

const users: User[] = [
  {
    id: "1",
    email: "admin@rpp.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    name: "Admin User",
    role: "admin",
    createdAt: new Date(),
  },
  {
    id: "2",
    email: "user@rpp.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    name: "Regular User",
    role: "user",
    createdAt: new Date(),
  },
  {
    id: "3",
    email: "john@rpp.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    name: "John Doe",
    role: "user",
    createdAt: new Date(),
  },
];

// Helper function to generate tokens
const generateTokens = (user: User | AuthenticatedUser) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY } as jwt.SignOptions,
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    } as jwt.SignOptions,
  );

  return { accessToken, refreshToken };
};

// Helper function to verify NextAuth JWT token
const verifyNextAuthToken = (token: string) => {
  try {
    // This is a simplified version - in production, you'd want to properly verify NextAuth JWT
    const decoded = jwt.verify(token, NEXTAUTH_SECRET) as any;
    return decoded;
  } catch {
    return null;
  }
};

// LDAP Authentication function for Windows LDAP/Active Directory
const authenticateWithLDAP = async (username: string, password: string) => {
  try {
    // Validate input
    if (!username || !password) {
      console.error("LDAP authentication: Username or password is empty");
      return null;
    }

    // Get LDAP configuration from environment variables
    const ldapUrl = process.env.LDAP_URL || "ldap://localhost:389";
    const userSearchBase =
      process.env.LDAP_USER_SEARCH_BASE || "cn=Users,dc=domain,dc=local";
    const usernameAttribute =
      process.env.LDAP_USERNAME_ATTRIBUTE || "sAMAccountName";

    console.log(`Attempting Windows LDAP authentication for: ${username}`);
    console.log(`LDAP URL: ${ldapUrl}`);
    console.log(`User Search Base: ${userSearchBase}`);
    console.log(`Username Attribute: ${usernameAttribute}`);

    // Extract username from email if needed
    let actualUsername = username;
    let userEmail = username;

    if (username.includes("@")) {
      actualUsername = username.split("@")[0];
      userEmail = username;
    } else {
      // If no @ symbol, assume it's just username and create email
      userEmail = `${username}@rpphosp.local`;
    }

    try {
      const { Client } = require("ldapts");
      const client = new Client({
        url: ldapUrl,
        timeout: 15000,
        connectTimeout: 15000,
      });

      console.log(`Trying to authenticate user: ${actualUsername}`);

      // Try different username formats for Windows LDAP
      const bindFormats = [
        actualUsername, // Direct username
        `${actualUsername}@rpphosp.local`, // UPN format
        `RPPHOSP\\${actualUsername}`, // DOMAIN\username format
        `${actualUsername}@RPPHOSP.LOCAL`, // UPN uppercase
        `rpphosp\\${actualUsername}`, // domain\username lowercase
      ];

      let bindSuccessful = false;

      for (const bindFormat of bindFormats) {
        try {
          console.log(`Trying LDAP bind with format: ${bindFormat}`);
          await client.bind(bindFormat, password);
          console.log(`LDAP bind successful with format: ${bindFormat}`);
          bindSuccessful = true;
          break;
        } catch (bindErr: any) {
          console.log(`LDAP bind failed for ${bindFormat}: ${bindErr.message}`);
          continue;
        }
      }

      if (!bindSuccessful) {
        console.log("All LDAP bind attempts failed");
        await client.unbind();
        return null;
      }

      console.log(`Successfully authenticated user: ${actualUsername}`);

      // Try to search for additional user information
      let displayName = actualUsername;
      let email = userEmail;

      try {
        // Search for user details using simple username search
        const searchResult = await client.search(userSearchBase, {
          scope: "sub",
          filter: `(|(${usernameAttribute}=${actualUsername})(mail=${userEmail})(cn=${actualUsername}))`,
          attributes: ["displayName", "mail", "cn", "memberOf"],
        });

        if (searchResult.searchEntries.length > 0) {
          const userEntry = searchResult.searchEntries[0];
          displayName = userEntry.displayName || userEntry.cn || actualUsername;
          email = userEntry.mail || userEmail;

          console.log(`Found user details: ${displayName}, ${email}`);
        }
      } catch (searchErr) {
        console.warn("Could not search for user details:", searchErr);
        // Continue with basic info
      }

      // Create user object
      const user: AuthenticatedUser = {
        id: actualUsername,
        email: email,
        name: displayName,
        role: "user", // Default role, can be enhanced with group membership check
        ldapUser: true,
      };

      await client.unbind();
      return user;
    } catch (err: any) {
      console.error(`Windows LDAP authentication failed:`, err.message);
      console.error(`Error code: ${err.code}`);
      console.error(`Error name: ${err.name}`);
      console.error(`Full error:`, err);

      // Handle specific LDAP errors
      if (err.code === "ECONNREFUSED") {
        console.error(
          "LDAP server connection refused. Check if Windows LDAP server is running and accessible.",
        );
      } else if (err.code === "ENOTFOUND") {
        console.error("LDAP server not found. Check LDAP_URL configuration.");
      } else if (err.code === "EHOSTUNREACH") {
        console.error(
          "LDAP server host unreachable. Check network connectivity.",
        );
      } else if (err.message?.includes("Invalid credentials")) {
        console.error("Invalid LDAP credentials provided.");
      } else if (err.message?.includes("timeout")) {
        console.error(
          "LDAP connection timeout. Windows LDAP server may be slow or unreachable.",
        );
      }
      return null;
    }
  } catch (error) {
    console.error("Windows LDAP Authentication error:", error);
    return null;
  }
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Auth Service with NextAuth Support",
    timestamp: new Date().toISOString(),
  });
});

// Register endpoint
app.post(
  "/register",
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        res
          .status(400)
          .json({ error: "Email, password, and name are required" });
        return;
      }

      // Check if user already exists
      const existingUser = users.find((u) => u.email === email);
      if (existingUser) {
        res.status(409).json({ error: "User already exists" });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser: User = {
        id: Date.now().toString(),
        email,
        password: hashedPassword,
        name,
        role: "user",
        createdAt: new Date(),
      };

      users.push(newUser);

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(newUser);

      // Store refresh token
      newUser.refreshToken = refreshToken;

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        token: accessToken,
        refreshToken: refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Login endpoint (compatible with NextAuth) - supports both local and LDAP authentication
app.post(
  "/login",
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { email, password, authType } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      let authenticatedUser = null;

      // Try LDAP authentication first if specified or if local user not found
      if (authType === "ldap" || authType === "auto" || authType === "manual") {
        console.log(
          `Attempting LDAP authentication for ${email} with authType: ${authType}`,
        );
        console.log(`LDAP_URL from env: ${process.env.LDAP_URL}`);
        try {
          authenticatedUser = await authenticateWithLDAP(email, password);
          if (authenticatedUser) {
            console.log("LDAP authentication successful for:", email);
          } else {
            console.log("LDAP authentication returned null for:", email);
          }
        } catch (ldapError) {
          console.error(
            "LDAP authentication failed with exception:",
            ldapError,
          );
        }
      }

      // If LDAP failed or not requested, try local authentication
      if (
        !authenticatedUser &&
        (authType === "local" ||
          authType === "auto" ||
          authType === "manual" ||
          !authType)
      ) {
        console.log(
          `Attempting local authentication for ${email} with authType: ${authType}`,
        );
        const user = users.find((u) => u.email === email);
        if (user) {
          const isValidPassword = await bcrypt.compare(password, user.password);
          if (isValidPassword) {
            authenticatedUser = {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              ldapUser: false,
            };
            console.log("Local authentication successful for:", email);
          } else {
            console.log("Local authentication password mismatch for:", email);
          }
        } else {
          console.log("Local user not found for:", email);
        }
      }

      if (!authenticatedUser) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(authenticatedUser);

      // Store refresh token for local users
      if (!authenticatedUser.ldapUser) {
        const user = users.find((u) => u.id === authenticatedUser.id);
        if (user) {
          user.refreshToken = refreshToken;
        }
      }

      res.json({
        message: "Login successful",
        user: {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          name: authenticatedUser.name,
          role: authenticatedUser.role,
          authType: authenticatedUser.ldapUser ? "ldap" : "local",
        },
        token: accessToken,
        refreshToken: refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// NextAuth session verification endpoint
app.post("/session", (req: express.Request, res: express.Response): void => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(401).json({ error: "Token required" });
      return;
    }

    // Try to decode the token
    let decoded = verifyNextAuthToken(token);

    if (!decoded) {
      // Try JWT verification as fallback
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
      }
    }

    // Find user
    const user = users.find(
      (u) => u.id === decoded.userId || u.id === decoded.sub,
    );
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      session: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      },
    });
  } catch (error) {
    console.error("Session verification error:", error);
    res.status(401).json({ error: "Invalid session" });
  }
});

// Token refresh endpoint
app.post("/refresh", (req: express.Request, res: express.Response): void => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ error: "Refresh token required" });
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as any;
    const user = users.find(
      (u) => u.id === decoded.userId && u.refreshToken === refreshToken,
    );

    if (!user) {
      res.status(403).json({ error: "Invalid refresh token" });
      return;
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Update stored refresh token
    user.refreshToken = newRefreshToken;

    res.json({
      message: "Token refreshed successfully",
      token: accessToken,
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(403).json({ error: "Invalid refresh token" });
  }
});

// LDAP authentication endpoint
app.post(
  "/ldap",
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: "Username and password are required" });
        return;
      }

      const ldapUser = await authenticateWithLDAP(username, password);

      if (!ldapUser) {
        res.status(401).json({ error: "Invalid LDAP credentials" });
        return;
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(ldapUser);

      res.json({
        message: "LDAP authentication successful",
        user: {
          id: ldapUser.id,
          email: ldapUser.email,
          name: ldapUser.name,
          role: ldapUser.role,
          authType: "ldap",
        },
        token: accessToken,
        refreshToken: refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY,
      });
    } catch (error) {
      console.error("LDAP authentication error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Token verification endpoint
app.post("/verify", (req: express.Request, res: express.Response): void => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    // Try NextAuth token first
    let decoded = verifyNextAuthToken(token);

    if (!decoded) {
      // Try JWT verification as fallback
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
      }
    }

    const user = users.find(
      (u) => u.id === decoded.userId || u.id === decoded.sub,
    );

    if (!user) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Logout endpoint
app.post("/logout", (req: express.Request, res: express.Response): void => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Find user and remove refresh token
      const user = users.find((u) => u.refreshToken === refreshToken);
      if (user) {
        user.refreshToken = undefined;
      }
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "RPP Portal Auth Service with NextAuth Support",
    version: "2.1.0",
    endpoints: [
      "/register",
      "/login",
      "/verify",
      "/refresh",
      "/logout",
      "/session",
    ],
    tokenConfig: {
      accessTokenExpiry: ACCESS_TOKEN_EXPIRY,
      refreshTokenExpiry: REFRESH_TOKEN_EXPIRY,
    },
    nextAuthSupport: true,
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

// Start server
app.listen(PORT, () => {
  console.log(`🔐 Auth Service with NextAuth Support running on port ${PORT}`);
  console.log(`📋 Token Configuration:`);
  console.log(`   - Access Token Expiry: ${ACCESS_TOKEN_EXPIRY}`);
  console.log(`   - Refresh Token Expiry: ${REFRESH_TOKEN_EXPIRY}`);
  console.log(`   - NextAuth Support: Enabled`);
});

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:3000", // Next.js frontend
      process.env.FRONTEND_URL || "http://localhost:3000",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "API Gateway with NextAuth Support",
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint for auth service connection
app.get("/test-auth", async (req, res) => {
  try {
    const response = await fetch(`${services.auth}/health`);
    const data = await response.json();
    res.json({ success: true, authService: data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Proxy configurations
const services = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:3002",
  user: process.env.USER_SERVICE_URL || "http://localhost:3003",
};

// NextAuth session verification middleware
const verifyNextAuthSession = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next(); // Let the request continue without authentication
  }

  try {
    // Verify session with auth service
    const response = await fetch(`${services.auth}/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    if (response.ok) {
      const sessionData = (await response.json()) as {
        user: any;
        session: any;
      };
      (req as any).user = sessionData.user;
      (req as any).session = sessionData.session;
    }
  } catch (error) {
    console.error("Session verification error:", error);
  }

  next();
};

// Auth service proxy - Enhanced for NextAuth
app.use("/api/auth", async (req, res) => {
  try {
    const targetUrl = `${services.auth}${req.url}`;
    console.log(`Proxying ${req.method} ${req.url} to ${targetUrl}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Forward authorization header if present
    if (req.headers.authorization) {
      headers["Authorization"] = req.headers.authorization;
    }

    // Forward cookies for NextAuth sessions
    if (req.headers.cookie) {
      headers["Cookie"] = req.headers.cookie;
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    // Forward Set-Cookie headers for NextAuth
    const setCookieHeaders = response.headers.get("set-cookie");
    if (setCookieHeaders) {
      res.setHeader("Set-Cookie", setCookieHeaders);
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error:
        "Proxy error: " +
        (error instanceof Error ? error.message : "Unknown error"),
    });
  }
});

// NextAuth API proxy for frontend
app.use("/api/auth/*", async (req, res) => {
  try {
    // This handles NextAuth API routes from frontend
    const targetUrl = `http://localhost:3000${req.originalUrl}`;
    console.log(
      `Proxying NextAuth API ${req.method} ${req.originalUrl} to ${targetUrl}`,
    );

    const headers: Record<string, string> = {};

    // Forward all headers for NextAuth
    Object.keys(req.headers).forEach((key) => {
      if (req.headers[key]) {
        headers[key] = req.headers[key] as string;
      }
    });

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });

    // Forward response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    console.error("NextAuth proxy error:", error);
    res.status(500).json({
      error:
        "NextAuth proxy error: " +
        (error instanceof Error ? error.message : "Unknown error"),
    });
  }
});

// User service proxy - Enhanced with NextAuth session support
app.get("/api/users", verifyNextAuthSession, async (req, res) => {
  try {
    const targetUrl = `${services.user}/users`;
    console.log(`Proxying GET ${req.originalUrl} to ${targetUrl}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Forward authorization header
    if (req.headers.authorization) {
      headers["Authorization"] = req.headers.authorization;
    }

    // Add user info from NextAuth session if available
    if ((req as any).user) {
      headers["X-User-Id"] = (req as any).user.id;
      headers["X-User-Role"] = (req as any).user.role;
    }

    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error:
        "Proxy error: " +
        (error instanceof Error ? error.message : "Unknown error"),
    });
  }
});

// User profile proxy with NextAuth session support
app.get("/api/users/user/:id", verifyNextAuthSession, async (req, res) => {
  try {
    const { id } = req.params;
    const targetUrl = `${services.user}/user/${id}`;
    console.log(`Proxying GET ${req.originalUrl} to ${targetUrl}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Forward authorization header
    if (req.headers.authorization) {
      headers["Authorization"] = req.headers.authorization;
    }

    // Add user info from NextAuth session if available
    if ((req as any).user) {
      headers["X-User-Id"] = (req as any).user.id;
      headers["X-User-Role"] = (req as any).user.role;
    }

    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error:
        "Proxy error: " +
        (error instanceof Error ? error.message : "Unknown error"),
    });
  }
});

// User profile update proxy with NextAuth session support
app.put("/api/users/user/:id", verifyNextAuthSession, async (req, res) => {
  try {
    const { id } = req.params;
    const targetUrl = `${services.user}/user/${id}`;
    console.log(`Proxying PUT ${req.originalUrl} to ${targetUrl}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Forward authorization header
    if (req.headers.authorization) {
      headers["Authorization"] = req.headers.authorization;
    }

    // Add user info from NextAuth session if available
    if ((req as any).user) {
      headers["X-User-Id"] = (req as any).user.id;
      headers["X-User-Role"] = (req as any).user.role;
    }

    const response = await fetch(targetUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error:
        "Proxy error: " +
        (error instanceof Error ? error.message : "Unknown error"),
    });
  }
});

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "RPP Portal API Gateway with NextAuth Support",
    version: "2.1.0",
    services: {
      auth: services.auth,
      user: services.user,
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
  console.log(`🌐 API Gateway with NextAuth Support running on port ${PORT}`);
  console.log(`📋 Services:`);
  console.log(`   - Auth Service: ${services.auth}`);
  console.log(`   - User Service: ${services.user}`);
  console.log(`   - NextAuth Support: Enabled`);
});

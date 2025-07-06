import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "API Gateway",
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

// Auth service proxy - Manual implementation
app.use("/api/auth", async (req, res) => {
  try {
    const targetUrl = `${services.auth}${req.url}`;
    console.log(`Proxying ${req.method} ${req.url} to ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
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

// User service proxy - Manual implementation with auth forwarding
app.get("/api/users", async (req, res) => {
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

// User service proxy for specific user operations
app.use(
  "/api/user",
  createProxyMiddleware({
    target: services.user,
    changeOrigin: true,
    pathRewrite: {
      "^/api/user": "/user",
    },
  }),
);

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "RPP Portal API Gateway",
    version: "1.0.0",
    services: Object.keys(services),
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
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📍 Services: ${JSON.stringify(services, null, 2)}`);
});

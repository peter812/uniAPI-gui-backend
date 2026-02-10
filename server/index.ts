import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { spawn } from "child_process";
import fs from "fs";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

let pythonProcess: ReturnType<typeof spawn> | null = null;
let manualRestart = false;

function startPythonApi() {
  pythonProcess = spawn("python", [
    "-c",
    `import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=8001, log_level='info')`
  ], {
    cwd: "./uniapi-main/backend",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  pythonProcess.stdout?.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) log(msg, "uniapi");
  });

  pythonProcess.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) log(msg, "uniapi");
  });

  pythonProcess.on("error", (err) => {
    log(`Failed to start Python API: ${err.message}`, "uniapi");
  });

  pythonProcess.on("exit", (code) => {
    if (manualRestart) {
      manualRestart = false;
      log(`Python API stopped for restart. Starting again...`, "uniapi");
      startPythonApi();
    } else {
      log(`Python API exited with code ${code}. Restarting in 5s...`, "uniapi");
      setTimeout(startPythonApi, 5000);
    }
  });

  return pythonProcess;
}

const BRIDGE_CONFIG: Record<string, { port: number; script: string; cwd: string }> = {
  instagram: { port: 5002, script: "instagram_bridge_server.py", cwd: "./uniapi-main/backend/platforms/instagram" },
  facebook: { port: 5004, script: "facebook_bridge_server.py", cwd: "./uniapi-main/backend/platforms/facebook" },
};

const bridgeProcesses: Record<string, ReturnType<typeof spawn>> = {};

async function generateAuthFile(platform: string, cwd: string): Promise<void> {
  try {
    const { storage } = await import("./storage");
    const tokens = await storage.getPlatformTokens(platform);
    if (tokens.length === 0) return;

    const authData: Record<string, any> = {};
    const platformAuth: Record<string, any> = { cookies: {} };

    for (const token of tokens) {
      if (token.tokenKey.toLowerCase() === "sessionid" || token.tokenKey.toLowerCase() === "session_id") {
        platformAuth.cookies.sessionid = token.tokenValue;
      } else if (token.tokenKey.toLowerCase().startsWith("cookie_")) {
        platformAuth.cookies[token.tokenKey.replace(/^cookie_/i, "")] = token.tokenValue;
      } else {
        platformAuth[token.tokenKey] = token.tokenValue;
      }
    }

    authData[platform] = platformAuth;
    const authFilePath = `${cwd}/platforms_auth.json`;
    fs.writeFileSync(authFilePath, JSON.stringify(authData, null, 2));
    log(`Generated auth file for ${platform} at ${authFilePath}`, `${platform}-bridge`);
  } catch (err: any) {
    log(`Warning: Could not generate auth file for ${platform}: ${err.message}`, `${platform}-bridge`);
  }
}

export function startBridge(platform: string): Promise<{ success: boolean; message: string }> {
  return new Promise(async (resolve) => {
    const config = BRIDGE_CONFIG[platform];
    if (!config) {
      resolve({ success: false, message: `Unknown platform: ${platform}` });
      return;
    }

    if (bridgeProcesses[platform]) {
      resolve({ success: false, message: `${platform} bridge is already running` });
      return;
    }

    await generateAuthFile(platform, config.cwd);

    let resolved = false;
    let stderrOutput = "";

    const proc = spawn("python", [config.script], {
      cwd: config.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    proc.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) log(msg, `${platform}-bridge`);
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        log(msg, `${platform}-bridge`);
        stderrOutput += msg + "\n";
      }
    });

    proc.on("error", (err) => {
      log(`Failed to start ${platform} bridge: ${err.message}`, `${platform}-bridge`);
      delete bridgeProcesses[platform];
      if (!resolved) {
        resolved = true;
        resolve({ success: false, message: `Failed to start ${platform} bridge: ${err.message}` });
      }
    });

    proc.on("exit", (code) => {
      log(`${platform} bridge exited with code ${code}`, `${platform}-bridge`);
      delete bridgeProcesses[platform];
      if (!resolved) {
        resolved = true;
        const errorMsg = stderrOutput.includes("ModuleNotFoundError")
          ? stderrOutput.match(/ModuleNotFoundError: .+/)?.[0] || stderrOutput.trim()
          : stderrOutput.trim() || `Process exited with code ${code}`;
        resolve({ success: false, message: `${platform} bridge crashed: ${errorMsg}` });
      }
    });

    bridgeProcesses[platform] = proc;
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ success: true, message: `${platform} bridge server started on port ${config.port}` });
      }
    }, 3000);
  });
}

export function stopBridge(platform: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const proc = bridgeProcesses[platform];
    if (!proc) {
      resolve({ success: false, message: `${platform} bridge is not running` });
      return;
    }

    proc.once("exit", () => {
      delete bridgeProcesses[platform];
      resolve({ success: true, message: `${platform} bridge stopped` });
    });

    proc.kill("SIGTERM");
    setTimeout(() => {
      if (bridgeProcesses[platform]) {
        delete bridgeProcesses[platform];
        resolve({ success: true, message: `${platform} bridge stopped (forced)` });
      }
    }, 5000);
  });
}

export function isBridgeRunning(platform: string): boolean {
  return !!bridgeProcesses[platform];
}

export function restartPythonApi(): Promise<void> {
  return new Promise((resolve) => {
    if (pythonProcess) {
      manualRestart = true;
      pythonProcess.once("exit", () => {
        setTimeout(resolve, 2000);
      });
      pythonProcess.kill("SIGTERM");
    } else {
      startPythonApi();
      setTimeout(resolve, 2000);
    }
  });
}

(async () => {
  if (!process.env.UNIAPI_URL) {
    startPythonApi();
  } else {
    log(`Using external UniAPI at ${process.env.UNIAPI_URL}`, "uniapi");
  }

  await registerRoutes(httpServer, app);

  const { seedDatabase } = await import("./seed");
  await seedDatabase();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();

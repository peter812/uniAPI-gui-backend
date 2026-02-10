import type { Express } from "express";
import { createServer, type Server } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { storage } from "./storage";
import { clientScrapeRequestSchema, insertPlatformTokenSchema } from "@shared/schema";
import type { InsertPlatformToken } from "@shared/schema";
import { randomUUID } from "crypto";
import { log, restartPythonApi, startBridge, stopBridge, isBridgeRunning } from "./index";
function requireAdmin(_req: any): boolean {
  return true;
}

async function processCallback(requestId: string) {
  try {
    const requests = await storage.getScrapeRequests(200);
    const request = requests.find((r) => r.id === requestId);
    if (!request || request.status !== "completed") return;

    log(`Sending callback for request ${request.id}`);

    const response = await fetch(request.callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serverUuid: request.serverUuid,
        requestType: request.requestType,
        queryString: request.queryString,
        status: "completed",
        result: request.result,
      }),
    });

    if (response.ok) {
      await storage.updateScrapeRequestStatus(request.id, "callback_sent");
      log(`Callback sent for request ${request.id}`);
    } else {
      await storage.updateScrapeRequestStatus(
        request.id,
        "callback_failed",
        undefined,
        `Callback returned ${response.status}`
      );
    }
  } catch (error: any) {
    log(`Callback error for request ${requestId}: ${error.message}`);
    await storage.updateScrapeRequestStatus(
      requestId,
      "callback_failed",
      undefined,
      error.message
    );
  }
}

const PYTHON_API_URL = process.env.UNIAPI_URL || "http://127.0.0.1:8001";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/uniapi/health", async (_req, res) => {
    try {
      const response = await fetch(`${PYTHON_API_URL}/health`);
      if (response.ok) {
        res.json({ status: "connected" });
      } else {
        res.json({ status: "error", message: "Python API returned error" });
      }
    } catch {
      res.json({ status: "disconnected", message: "Python API is not running" });
    }
  });

  app.get("/api/uniapi/platforms", async (_req, res) => {
    const platforms = ["twitter", "instagram", "tiktok", "facebook", "linkedin"];
    const results: Record<string, any> = {};
    await Promise.all(
      platforms.map(async (platform) => {
        try {
          const response = await fetch(`${PYTHON_API_URL}/api/v1/${platform}/health`);
          if (response.ok) {
            results[platform] = await response.json();
          } else if (platform === "twitter") {
            try {
              const fallback = await fetch(`${PYTHON_API_URL}/api/v1/twitter/users/me`);
              if (fallback.ok) {
                results[platform] = { status: "degraded", bridge_status: "disconnected", message: "Twitter API running, no bridge server" };
              } else {
                results[platform] = { status: "error", bridge_status: "disconnected" };
              }
            } catch {
              results[platform] = { status: "unavailable", bridge_status: "disconnected" };
            }
          } else {
            results[platform] = { status: "error", bridge_status: "disconnected" };
          }
        } catch {
          results[platform] = { status: "unavailable", bridge_status: "disconnected" };
        }
      })
    );
    res.json(results);
  });

  app.use(
    "/api/v1",
    createProxyMiddleware({
      target: PYTHON_API_URL,
      changeOrigin: true,
      pathRewrite: (_path: string, req: any) => req.originalUrl,
      on: {
        error: (_err, _req, res: any) => {
          if (res.writeHead) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Python API is not available. Make sure the UniAPI server is running." }));
          }
        },
      },
    })
  );

  app.post("/api/scrape", async (req, res) => {
    try {
      const parsed = clientScrapeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { requestType, queryString, extraOptions, clientUuid, apiKey, callbackUrl } = parsed.data;

      const settings = await storage.getAdminSettings();
      if (!settings || settings.apiKey !== apiKey) {
        return res.status(401).json({ error: "Invalid API key" });
      }

      const request = await storage.createScrapeRequest({
        requestType,
        queryString,
        extraOptions,
        clientUuid,
        apiKey,
        callbackUrl,
      });

      log(`New scrape request queued: ${requestType} - ${queryString}`);

      res.status(200).json({
        status: 200,
        serverUuid: request.serverUuid,
        message: "Request queued successfully",
      });

      setTimeout(() => simulateProcessing(request.id), 1000);
    } catch (error: any) {
      log(`Scrape request error: ${error.message}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/requests", async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requests = await storage.getScrapeRequests(50);
    res.json(requests);
  });

  app.get("/api/admin/platform-tokens", async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const platform = req.query.platform as string | undefined;
    const tokens = await storage.getPlatformTokens(platform);
    res.json(tokens);
  });

  app.post("/api/admin/platform-tokens", async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = insertPlatformTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const token = await storage.upsertPlatformToken(parsed.data);
    res.json(token);
  });

  app.delete("/api/admin/platform-tokens/:id", async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await storage.deletePlatformToken(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/restart-python", async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      log("Admin requested Python API restart");
      await restartPythonApi();
      res.json({ success: true, message: "Python server restarted" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to restart Python server", message: error.message });
    }
  });

  app.get("/api/bridge/status/:platform", async (req, res) => {
    const { platform } = req.params;
    res.json({ platform, running: isBridgeRunning(platform) });
  });

  app.post("/api/bridge/start/:platform", async (req, res) => {
    const { platform } = req.params;
    try {
      const result = await startBridge(platform);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/bridge/stop/:platform", async (req, res) => {
    const { platform } = req.params;
    try {
      const result = await stopBridge(platform);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return httpServer;
}

async function simulateProcessing(requestId: string) {
  try {
    await storage.updateScrapeRequestStatus(requestId, "processing");
    log(`Processing request ${requestId}...`);

    await new Promise((resolve) => setTimeout(resolve, 3000 + Math.random() * 5000));

    const result = {
      scraped: true,
      timestamp: new Date().toISOString(),
      note: "Simulated result. Connect to the real uniAPI Python scraper for actual data.",
    };

    await storage.updateScrapeRequestStatus(requestId, "completed", result);
    log(`Request ${requestId} completed`);

    await processCallback(requestId);

    const nextRequest = await storage.getNextQueuedRequest();
    if (nextRequest) {
      log(`Processing next queued request: ${nextRequest.id}`);
      setTimeout(() => simulateProcessing(nextRequest.id), 500);
    }
  } catch (error: any) {
    log(`Processing error for ${requestId}: ${error.message}`);
    await storage.updateScrapeRequestStatus(requestId, "error", undefined, error.message);

    const nextRequest = await storage.getNextQueuedRequest();
    if (nextRequest) {
      setTimeout(() => simulateProcessing(nextRequest.id), 500);
    }
  }
}

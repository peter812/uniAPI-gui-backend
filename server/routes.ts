import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { clientScrapeRequestSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import { log } from "./index";
import bcrypt from "bcryptjs";

const activeSessions = new Map<string, { createdAt: number }>();
const SESSION_TTL = 24 * 60 * 60 * 1000;

function isValidSession(token: string): boolean {
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TTL) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

function getSessionToken(req: any): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.query.sessionToken as string | undefined;
}

function requireAdmin(req: any): boolean {
  const token = getSessionToken(req);
  if (!token) return false;
  return isValidSession(token);
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ error: "Password required" });
      }

      const settings = await storage.getAdminSettings();
      if (!settings) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, settings.adminPassword);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const sessionToken = randomUUID();
      activeSessions.set(sessionToken, { createdAt: Date.now() });

      res.json({ sessionToken });
    } catch (error: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/logout", async (req, res) => {
    const token = getSessionToken(req);
    if (token) {
      activeSessions.delete(token);
    }
    res.json({ success: true });
  });

  app.get("/api/admin/settings", async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const settings = await storage.getAdminSettings();
    if (!settings) {
      return res.status(404).json({ error: "Settings not initialized" });
    }

    res.json({
      id: settings.id,
      apiKey: settings.apiKey,
      instagramToken: settings.instagramToken,
    });
  });

  app.post("/api/admin/reset-api-key", async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const newKey = await storage.resetApiKey();
    res.json({ apiKey: newKey });
  });

  app.post("/api/admin/instagram-token", async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { instagramToken } = req.body;
    if (!instagramToken || typeof instagramToken !== "string") {
      return res.status(400).json({ error: "Instagram token required" });
    }

    await storage.updateInstagramToken(instagramToken);
    res.json({ success: true });
  });

  app.get("/api/admin/requests", async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requests = await storage.getScrapeRequests(50);
    res.json(requests);
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

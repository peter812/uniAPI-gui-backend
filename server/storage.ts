import { db } from "./db";
import { scrapeRequests, adminSettings } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { ScrapeRequest, AdminSettings } from "@shared/schema";

export interface IStorage {
  getAdminSettings(): Promise<AdminSettings | undefined>;
  initializeAdmin(password: string): Promise<AdminSettings>;
  resetApiKey(): Promise<string>;
  updateInstagramToken(token: string): Promise<void>;

  createScrapeRequest(data: {
    requestType: string;
    queryString: string;
    extraOptions?: any;
    clientUuid: string;
    apiKey: string;
    callbackUrl: string;
  }): Promise<ScrapeRequest>;
  getScrapeRequests(limit?: number): Promise<ScrapeRequest[]>;
  getScrapeRequestByServerUuid(serverUuid: string): Promise<ScrapeRequest | undefined>;
  updateScrapeRequestStatus(id: string, status: string, result?: any, errorMessage?: string): Promise<void>;
  getNextQueuedRequest(): Promise<ScrapeRequest | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getAdminSettings(): Promise<AdminSettings | undefined> {
    const [settings] = await db.select().from(adminSettings).limit(1);
    return settings;
  }

  async initializeAdmin(password: string): Promise<AdminSettings> {
    const existing = await this.getAdminSettings();
    if (existing) return existing;

    const [settings] = await db
      .insert(adminSettings)
      .values({
        apiKey: `uniapi_${randomUUID().replace(/-/g, "")}`,
        adminPassword: password,
      })
      .returning();
    return settings;
  }

  async resetApiKey(): Promise<string> {
    const newKey = `uniapi_${randomUUID().replace(/-/g, "")}`;
    const settings = await this.getAdminSettings();
    if (settings) {
      await db
        .update(adminSettings)
        .set({ apiKey: newKey })
        .where(eq(adminSettings.id, settings.id));
    }
    return newKey;
  }

  async updateInstagramToken(token: string): Promise<void> {
    const settings = await this.getAdminSettings();
    if (settings) {
      await db
        .update(adminSettings)
        .set({ instagramToken: token })
        .where(eq(adminSettings.id, settings.id));
    }
  }

  async createScrapeRequest(data: {
    requestType: string;
    queryString: string;
    extraOptions?: any;
    clientUuid: string;
    apiKey: string;
    callbackUrl: string;
  }): Promise<ScrapeRequest> {
    const serverUuid = randomUUID();
    const [request] = await db
      .insert(scrapeRequests)
      .values({
        requestType: data.requestType,
        queryString: data.queryString,
        extraOptions: data.extraOptions || null,
        clientUuid: data.clientUuid,
        serverUuid,
        apiKey: data.apiKey,
        callbackUrl: data.callbackUrl,
        status: "queued",
      })
      .returning();
    return request;
  }

  async getScrapeRequests(limit = 50): Promise<ScrapeRequest[]> {
    return db
      .select()
      .from(scrapeRequests)
      .orderBy(desc(scrapeRequests.createdAt))
      .limit(limit);
  }

  async getScrapeRequestByServerUuid(serverUuid: string): Promise<ScrapeRequest | undefined> {
    const [request] = await db
      .select()
      .from(scrapeRequests)
      .where(eq(scrapeRequests.serverUuid, serverUuid));
    return request;
  }

  async updateScrapeRequestStatus(
    id: string,
    status: string,
    result?: any,
    errorMessage?: string
  ): Promise<void> {
    await db
      .update(scrapeRequests)
      .set({
        status,
        result: result || null,
        errorMessage: errorMessage || null,
        updatedAt: new Date(),
      })
      .where(eq(scrapeRequests.id, id));
  }

  async getNextQueuedRequest(): Promise<ScrapeRequest | undefined> {
    const [request] = await db
      .select()
      .from(scrapeRequests)
      .where(eq(scrapeRequests.status, "queued"))
      .orderBy(scrapeRequests.createdAt)
      .limit(1);
    return request;
  }
}

export const storage = new DatabaseStorage();

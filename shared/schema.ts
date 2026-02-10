import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scrapeRequests = pgTable("scrape_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestType: text("request_type").notNull(),
  queryString: text("query_string").notNull(),
  extraOptions: jsonb("extra_options"),
  clientUuid: text("client_uuid").notNull(),
  serverUuid: text("server_uuid").notNull(),
  apiKey: text("api_key").notNull(),
  callbackUrl: text("callback_url").notNull(),
  status: text("status").notNull().default("queued"),
  result: jsonb("result"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adminSettings = pgTable("admin_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKey: text("api_key").notNull(),
  adminPassword: text("admin_password").notNull(),
  instagramToken: text("instagram_token"),
});

export const insertScrapeRequestSchema = createInsertSchema(scrapeRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const clientScrapeRequestSchema = z.object({
  requestType: z.string().min(1),
  queryString: z.string().min(1),
  extraOptions: z.record(z.any()).optional(),
  clientUuid: z.string().uuid(),
  apiKey: z.string().min(1),
  callbackUrl: z.string().url(),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1),
});

export const updateInstagramTokenSchema = z.object({
  instagramToken: z.string().min(1),
});

export type InsertScrapeRequest = z.infer<typeof insertScrapeRequestSchema>;
export type ScrapeRequest = typeof scrapeRequests.$inferSelect;
export type AdminSettings = typeof adminSettings.$inferSelect;
export type ClientScrapeRequest = z.infer<typeof clientScrapeRequestSchema>;

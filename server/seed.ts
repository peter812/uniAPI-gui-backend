import { storage } from "./storage";
import { log } from "./index";

const ADMIN_PASSWORD = "401065";

export async function seedDatabase() {
  try {
    const existing = await storage.getAdminSettings();
    if (!existing) {
      await storage.initializeAdmin(ADMIN_PASSWORD);
      log("Admin settings initialized with hardcoded password.");
    } else {
      log("Admin settings already exist, skipping seed");
    }
  } catch (error: any) {
    log(`Seed error: ${error.message}`);
  }
}

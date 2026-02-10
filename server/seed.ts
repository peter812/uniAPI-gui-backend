import { storage } from "./storage";
import { log } from "./index";
import bcrypt from "bcryptjs";

const DEFAULT_ADMIN_PASSWORD = "admin123";

export async function seedDatabase() {
  try {
    const existing = await storage.getAdminSettings();
    if (!existing) {
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
      await storage.initializeAdmin(hashedPassword);
      log("Admin settings initialized. Default password has been set.");
    } else {
      log("Admin settings already exist, skipping seed");
    }
  } catch (error: any) {
    log(`Seed error: ${error.message}`);
  }
}

import fs from "node:fs";
import path from "node:path";
import type { RatingMatchRecord } from "../../../shared/rating/ratingTypes";
import type { OnlineRatingProfile } from "./ratingTypes";

export interface RatingFileStoreOptions {
  dataDir?: string;
  profilesFile?: string;
  recordsFile?: string;
}

export class RatingFileStore {
  private readonly dataDir: string;
  private readonly profilesPath: string;
  private readonly recordsPath: string;

  constructor(options: RatingFileStoreOptions = {}) {
    this.dataDir = options.dataDir ?? path.resolve(process.cwd(), "data");
    this.profilesPath = options.profilesFile ?? path.join(this.dataDir, "rating_profiles.json");
    this.recordsPath = options.recordsFile ?? path.join(this.dataDir, "rating_match_records.jsonl");
  }

  loadProfiles(): OnlineRatingProfile[] {
    if (!fs.existsSync(this.profilesPath)) {
      return [];
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(this.profilesPath, "utf8")) as OnlineRatingProfile[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveProfiles(profiles: OnlineRatingProfile[]): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.writeFileSync(this.profilesPath, `${JSON.stringify(profiles, null, 2)}\n`, "utf8");
  }

  appendMatchRecord(record: RatingMatchRecord): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.appendFileSync(this.recordsPath, `${JSON.stringify(record)}\n`, "utf8");
  }
}

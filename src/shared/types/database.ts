import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { reports, insights } from '../report-schema.js';

export type Report = InferSelectModel<typeof reports>;
export type NewReport = InferInsertModel<typeof reports>;

export type Insight = InferSelectModel<typeof insights> & {
  insightData: InsightData;
};

export type NewInsight = Omit<InferInsertModel<typeof insights>, 'insightData'> & {
  insightData: InsightData;
};

export interface InsightData {
  // Define the structure of your insight data here
  summary?: string;
  keyFindings?: string[];
  recommendations?: string[];
  metrics?: Record<string, unknown>;
  prompt_version?: string;
  // Add other fields as needed
}

export type GenerateInsightOptions = {
  role?: 'Executive' | 'Sales' | 'Lot';
  saveResults?: boolean;
  evaluateQuality?: boolean;
  assessBusinessImpact?: boolean;
};

export type GenerateInsightResult = {
  insightId: string;
  timestamp: string;
  reportId: string;
  platform: string;
  insightData: InsightData;
  duration: number;
};

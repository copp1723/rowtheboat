/**
 * Tool for fetching CRM reports from various platforms
 * Uses the config-driven Playwright runner for automation
 */
import { fetchCRMReport, parseCRMReport } from '../agents/fetchCRMReport.js';
import { EkoTool } from './extractCleanContent.js';
import { CRMReportOptions } from '../types.js';
interface FetchCRMReportArgs {
  site: string; // CRM platform (VinSolutions, VAUTO)
  dealerId: string; // Dealership ID
  reportType?: string; // Specific report type to fetch
  dateRange?: string; // Date range for the report
}
/**
 * Creates a fetchCRMReport tool that extracts reports from CRM platforms
 * @returns A tool object that can be registered with Eko
 */
export function fetchCRMReportTool(): EkoTool {
  return {
    name: 'fetchCRMReport',
    description: 'Fetches CRM reports from various dealer platforms like VinSolutions, VAUTO',
    parameters: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'CRM platform name (VinSolutions, VAUTO)',
        },
        dealerId: {
          type: 'string',
          description: 'Dealer ID for the report',
        },
        reportType: {
          type: 'string',
          description: 'Optional specific report type to fetch',
        },
        dateRange: {
          type: 'string',
          description: 'Optional date range for the report (e.g., "yesterday", "last week")',
        },
      },
      required: ['site', 'dealerId'],
    },
    handler: async (args: FetchCRMReportArgs) => {
      const { site, dealerId, reportType, dateRange } = args;
      try {
        console.log(`Fetching CRM report for dealer ${dealerId} from ${site}...`);
        // Use the fetchCRMReport function with the provided arguments
        const reportOptions: CRMReportOptions = {
          platform: site,
          dealerId,
        };
        // Only add optional properties if they're defined
        if (reportType) reportOptions.reportType = reportType;
        if (dateRange) reportOptions.dateRange = dateRange;
        const filePath = await fetchCRMReport(reportOptions);
        // Parse the CSV/Excel report
        const parsedReport = await parseCRMReport(filePath);
        // Return the parsed data
        return {
          success: true,
          message: `Successfully fetched CRM report from ${site}`,
          dealerId,
          reportFile: filePath,
          reportData: parsedReport,
        };
      } catch (error: unknown) {
        console.error(`Error fetching CRM report:`, error);
        const errorMessage =
          error instanceof Error
            ? error instanceof Error
              ? error instanceof Error
                ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                : String(error)
              : String(error)
            : String(error);
        return {
          success: false,
          message: `Failed to fetch CRM report: ${errorMessage}`,
          dealerId,
          error: errorMessage,
        };
      }
    },
  };
}
// Export as default for simpler imports
export default fetchCRMReportTool;

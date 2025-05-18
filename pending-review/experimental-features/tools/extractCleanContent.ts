import { spawn } from 'child_process';
import { join } from 'path';
// Define the interface for the tool's arguments
interface ExtractCleanContentArgs {
  url: string;
}
// Tool interface based on Eko
export interface EkoTool {
  name: string;
  description: string;
  parameters: any;
  handler: (args: any) => Promise<any>;
}
/**
 * Creates an extractCleanContent tool that uses Python's trafilatura to extract clean text from webpages
 * @returns A tool object that can be registered with Eko
 */
export function extractCleanContent(): EkoTool {
  return {
    name: 'extractCleanContent',
    description:
      'Extract clean, readable text content from a webpage by removing ads, navigation, and other non-content elements.',
    parameters: {
      type: 'object',
      required: ['url'],
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the webpage to extract content from',
        },
      },
    },
    handler: async (args: ExtractCleanContentArgs) => {
      try {
        // Validate input
        if (!args.url || typeof args.url !== 'string') {
          throw new Error('URL is required and must be a string');
        }
        // Make sure the URL has a protocol
        const url = args.url.startsWith('http') ? args.url : `https://${args.url}`;
        // Get the path to the Python script in the src directory
        // In production, __dirname points to dist/tools, so we need to go up to the root and back to src/tools
        const scriptPath = join(process.cwd(), 'src', 'tools', 'extract_content.py');
        // Execute the Python script
        const result = await runPythonScript(scriptPath, [url]);
        // Parse the result
        let parsedResult;
        try {
          parsedResult = JSON.parse(result);
        } catch (e) {
          console.error('Error parsing Python script output:', e);
          console.error('Raw output:', result);
          throw new Error('Failed to parse content extraction result');
        }
        // Check for errors
        if (parsedResult.error) {
          throw new Error(`Content extraction failed: ${parsedResult.error}`);
        }
        // Return the extracted content
        return {
          success: true,
          content: parsedResult.content,
          url: url,
          extracted_at: new Date().toISOString(),
          extracted_with: 'trafilatura',
        };
      } catch (error: any) {
        console.error('Error in extractCleanContent tool:', error);
        return {
          success: false,
          error:
            (error instanceof Error
              ? error instanceof Error
                ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                : String(error)
              : String(error)) || String(error),
          url: args.url,
        };
      }
    },
  };
}
/**
 * Executes a Python script and returns its output
 * @param scriptPath The path to the Python script
 * @param args Arguments to pass to the script
 * @returns The script's stdout output
 */
function runPythonScript(scriptPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // Spawn the Python process
    const pythonProcess = spawn('python3', [scriptPath, ...args]);
    let stdout = '';
    let stderr = '';
    // Collect stdout data
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    // Collect stderr data
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error(`stderr: ${stderr}`);
        reject(new Error(`Python script execution failed: ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });
    // Handle errors
    pythonProcess.on('error', (err) => {
      reject(err);
    });
  });
}

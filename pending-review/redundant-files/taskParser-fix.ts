/**
 * Fixed task parser implementation
 * With direct pattern matching for CRM report requests
 */
import { TaskType } from '../types.js';
import * as uuid from 'uuid';
/**
 * Simple parser function that directly handles VinSolutions CRM report requests
 * without complex logic or LLM calls
 */
export function parseTaskDirect(taskText: string): ParsedTask {
  console.log(`TaskParser-fix.ts: processing task: "${taskText}"`);
  const taskLower = taskText.toLowerCase();
  // Log all pattern tests for debugging
  const patternTests = {
    vinsolutions: taskLower.includes('vinsolutions'),
    sales: taskLower.includes('sales'),
    report: taskLower.includes('report'),
    dealer: taskLower.includes('dealer'),
    yesterday: taskLower.includes('yesterday'),
    fetch: taskLower.includes('fetch'),
    get: taskLower.includes('get'),
    pull: taskLower.includes('pull'),
  };
  console.log('Pattern components:', patternTests);
  // Define a comprehensive set of patterns to match different phrasings
  const patterns = [
    // Direct VinSolutions patterns
    {
      pattern: /fetch\s+(?:yesterday['']s\s+)?sales\s+report\s+from\s+vinsolutions/i,
      name: 'VinSolutions direct fetch pattern',
    },
    {
      pattern: /get\s+(?:the\s+)?(?:yesterday['']s\s+)?sales\s+report\s+from\s+vinsolutions/i,
      name: 'VinSolutions get pattern',
    },
    {
      pattern: /pull\s+(?:the\s+)?(?:yesterday['']s\s+)?sales\s+report\s+from\s+vinsolutions/i,
      name: 'VinSolutions pull pattern',
    },
    // Generic sales report patterns that mention VinSolutions
    {
      pattern: /vinsolutions.*sales\s+report/i,
      name: 'VinSolutions + sales report (any order)',
    },
    {
      pattern: /sales\s+report.*vinsolutions/i,
      name: 'Sales report + VinSolutions (any order)',
    },
  ];
  // Test all patterns
  let matchedPattern = null;
  for (const p of patterns) {
    const isMatch = p.pattern.test(taskText);
    console.log(`Testing pattern '${p.name}':`, isMatch);
    if (isMatch) {
      matchedPattern = p;
      break;
    }
  }
  // Direct pattern matching for VinSolutions CRM report
  if (matchedPattern) {
    console.log(`☑️ Pattern matched: ${matchedPattern.name}`);
    // Extract dealer ID if present
    const dealerMatch = taskText.match(/dealer(?:ship)?\s+([A-Za-z0-9]+)/i);
    const dealerId = dealerMatch ? dealerMatch[1] : 'ABC123';
    console.log(`Dealer ID extracted: ${dealerId}`);
    return {
      id: uuid.v4(), // Use uuid.v4() instead of uuidv4()
      type: TaskType.FetchCRMReport,
      parameters: {
        site: 'vinsolutions',
        dealerId: dealerId,
      },
      original: taskText,
    };
  }
  // Keyword-based detection as fallback
  if (
    (taskLower.includes('sales') && taskLower.includes('report')) ||
    (taskLower.includes('crm') && taskLower.includes('report'))
  ) {
    // If VinSolutions is mentioned anywhere, it's probably a VinSolutions request
    if (taskLower.includes('vinsolutions')) {
      console.log('☑️ VinSolutions keyword match detected');
      // Extract dealer ID if present
      const dealerMatch = taskText.match(/dealer(?:ship)?\s+([A-Za-z0-9]+)/i);
      const dealerId = dealerMatch ? dealerMatch[1] : 'ABC123';
      console.log(`Dealer ID extracted: ${dealerId}`);
      return {
        id: uuid.v4(), // Use uuid.v4() instead of uuidv4()
        type: TaskType.FetchCRMReport,
        parameters: {
          site: 'vinsolutions',
          dealerId: dealerId,
        },
        original: taskText,
      };
    } else {
      console.log('☑️ Generic sales report pattern matched (non-VinSolutions)');
      // Extract dealer ID if present
      const dealerMatch = taskText.match(/dealer(?:ship)?\s+([A-Za-z0-9]+)/i);
      const dealerId = dealerMatch ? dealerMatch[1] : 'ABC123';
      console.log(`Dealer ID extracted: ${dealerId}`);
      return {
        id: uuid.v4(), // Use uuid.v4() instead of uuidv4()
        type: TaskType.FetchCRMReport,
        parameters: {
          site: 'vinsolutions', // Default
          dealerId: dealerId,
        },
        original: taskText,
      };
    }
  }
  // Default: unknown task type
  console.log('⚠️ No pattern matched, treating as unknown task type');
  return {
    id: uuid.v4(), // Use uuid.v4() instead of uuidv4()
    type: TaskType.Unknown,
    parameters: {},
    original: taskText,
  };
}

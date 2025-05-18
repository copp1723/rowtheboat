// A simplified implementation of the multi-step extraction and summarization
import axios from 'axios';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to run the Python extractor
async function extractContent(url) {
  try {
    console.log(`Extracting content from ${url}`);
    
    // Use Python script for content extraction
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'tools/extract_content.py');
      const python = spawn('python3', [pythonScript, url]);
      
      let dataString = '';
      let errorString = '';
      
      python.stdout.on('data', (data) => {
        dataString += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        errorString += data.toString();
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python process exited with code ${code}`);
          console.error(`Error output: ${errorString}`);
          reject(new Error(`Failed to extract content: ${errorString}`));
        } else {
          try {
            const result = JSON.parse(dataString);
            resolve(result);
          } catch (err) {
            reject(new Error(`Failed to parse Python output: ${err.message}`));
          }
        }
      });
    });
  } catch (error) {
    console.error('Error extracting content:', error);
    throw error;
  }
}

// Summarize text using OpenAI API
async function summarizeText(text) {
  try {
    console.log(`Summarizing text (length: ${text.length} characters)`);
    
    // Use the OpenAI API for summarization
    // Get the OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable.');
    }
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes text content concisely.'
          },
          {
            role: 'user',
            content: `Please summarize the following text in a few sentences:\n\n${text}`
          }
        ],
        max_tokens: 300
      },
      {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      summary: response.data.choices[0].message.content,
      originalLength: text.length,
      summaryLength: response.data.choices[0].message.content.length
    };
  } catch (error) {
    console.error('Error summarizing text:', error.message);
    
    if (error.response) {
      console.error('OpenAI API error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    throw new Error(`Failed to summarize text: ${error.message}`);
  }
}

// Main function that executes the multi-step process
async function extractAndSummarize(url) {
  try {
    // Step 1: Extract content
    console.log("Step 1: Extracting content");
    const extractionResult = await extractContent(url);
    
    if (!extractionResult || !extractionResult.content) {
      throw new Error('Failed to extract content or content is empty');
    }
    
    console.log(`Extracted ${extractionResult.content.length} characters of content`);
    
    // Step 2: Summarize the extracted content
    console.log("Step 2: Summarizing content");
    const summarizationResult = await summarizeText(extractionResult.content);
    
    // Return the complete result with metadata
    return {
      url,
      originalContent: extractionResult.content,
      summary: summarizationResult.summary,
      stats: {
        originalLength: extractionResult.content.length,
        summaryLength: summarizationResult.summary.length,
        compressionRatio: Math.round((summarizationResult.summary.length / extractionResult.content.length) * 100) + '%'
      },
      steps: [
        { name: 'extract', status: 'success' },
        { name: 'summarize', status: 'success' }
      ]
    };
  } catch (error) {
    console.error('Error in extract and summarize flow:', error);
    throw error;
  }
}

export {
  extractAndSummarize
};
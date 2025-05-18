// Simple implementation of the AI agent backend (no database dependencies)
import * as dotenv from 'dotenv';
import express from 'express';
import * as crypto from 'crypto';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());

// Simple in-memory storage for tasks
const taskLogs = {};

// API endpoint to submit a task
app.post('/api/tasks', async (req, res) => {
  try {
    const { task } = req.body;
    
    if (!task || typeof task !== 'string') {
      return res.status(400).json({ error: 'Task is required and must be a string' });
    }
    
    // Check for required URL in summarize tasks
    if ((task.toLowerCase().includes('summarize') || task.toLowerCase().includes('summary')) && 
        !task.match(/\b([a-z0-9-]+\.)+[a-z]{2,}\b/i)) {
      // Missing URL in a summarize task
      console.error("❌ Task parser error: No valid URL detected");
      return res.status(400).json({ 
        error: 'No valid URL found. Please include a full or partial URL.' 
      });
    }
    
    // Generate task ID
    const taskId = crypto.randomUUID();
    
    // Store task in memory
    taskLogs[taskId] = {
      id: taskId,
      task,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Log the task for debugging
    console.log(`Task submitted: ${taskId} - ${task}`);
    
    // Start processing task in background
    setTimeout(() => processTask(taskId, task), 0);
    
    // Return the task ID
    return res.status(201).json({
      id: taskId,
      message: 'Task submitted successfully'
    });
    
  } catch (error) {
    console.error('Error in task submission:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get task status by ID
app.get('/api/tasks/:taskId', (req, res) => {
  const { taskId } = req.params;
  
  // Check if task exists
  if (!taskLogs[taskId]) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Return task status
  return res.status(200).json(taskLogs[taskId]);
});

// API endpoint to list all tasks
app.get('/api/tasks', (req, res) => {
  // Return all tasks as an array
  const tasks = Object.values(taskLogs);
  return res.status(200).json(tasks);
});

// API endpoint for direct task execution (Phase 3)
app.post('/submit-task', async (req, res) => {
  try {
    const { task } = req.body;
    
    if (!task || typeof task !== 'string') {
      return res.status(400).json({ error: 'Task is required and must be a string' });
    }
    
    // Generate task ID
    const taskId = crypto.randomUUID();
    
    // Determine task type
    const taskType = task.toLowerCase().includes('crawl') ? 'web_crawling' : 
                    task.toLowerCase().includes('flight') ? 'flight_status' : 'unknown';
    
    // Process the task immediately with mocked response
    const result = {
      type: taskType,
      timestamp: new Date().toISOString(),
      message: "Task executed with simulated Eko Agent",
      data: {}
    };
    
    // Add relevant data based on task type
    if (taskType === 'web_crawling') {
      result.data = {
        "top_posts": [
          {
            "title": "Introducing Our New AI Agent Framework",
            "url": "https://example.com/post1",
            "score": 142
          },
          {
            "title": "The Future of AI Agents in Business", 
            "url": "https://example.com/post2",
            "score": 98
          }
        ]
      };
    } else if (taskType === 'flight_status') {
      result.data = {
        "flight": "DL1234",
        "status": "On time",
        "departure": "10:00 AM",
        "arrival": "12:30 PM"
      };
    } else {
      result.data = {
        "message": "Task type not supported yet"
      };
    }
    
    // Store the completed task
    taskLogs[taskId] = {
      id: taskId,
      task,
      taskType,
      status: 'completed',
      result,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
    
    // Log the execution
    console.log(`Task executed directly: ${taskId} - ${taskType}`);
    
    // Return the result
    return res.status(200).json({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('Error in direct task execution:', error);
    return res.status(500).json({ 
      success: false, 
      error: String(error) || 'Internal server error' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'up',
    version: '1.0.0',
    message: 'AI Agent API server is running'
  });
});

// Mock function to process tasks asynchronously
async function processTask(taskId, taskText) {
  try {
    console.log(`Processing task: ${taskId}`);
    
    // Update task status to processing
    taskLogs[taskId] = {
      ...taskLogs[taskId],
      status: 'processing'
    };
    
    // Simulate processing delay (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Determine task type
    const taskType = taskText.toLowerCase().includes('crawl') ? 'web_crawling' : 
                     taskText.toLowerCase().includes('flight') ? 'flight_status' : 'unknown';
    
    // Create result based on task type
    let result = {
      type: taskType,
      timestamp: new Date().toISOString(),
      message: "Task processed with simulated agent",
      data: {}
    };
    
    if (taskType === 'web_crawling') {
      result.data = {
        "top_posts": [
          {
            "title": "Introducing Our New AI Agent Framework",
            "url": "https://example.com/post1",
            "score": 142
          },
          {
            "title": "The Future of AI Agents in Business",
            "url": "https://example.com/post2",
            "score": 98
          }
        ]
      };
    } else if (taskType === 'flight_status') {
      result.data = {
        "flight": "DL1234",
        "status": "On time",
        "departure": "10:00 AM",
        "arrival": "12:30 PM"
      };
    } else {
      result.data = {
        "message": "Task type not supported yet"
      };
    }
    
    // Update task with result
    taskLogs[taskId] = {
      ...taskLogs[taskId],
      status: 'completed',
      taskType,
      result,
      completedAt: new Date().toISOString()
    };
    
    console.log(`Task completed: ${taskId}`);
    
  } catch (error) {
    console.error(`Error processing task ${taskId}:`, error);
    
    // Update task with error
    taskLogs[taskId] = {
      ...taskLogs[taskId],
      status: 'failed',
      error: String(error),
      completedAt: new Date().toISOString()
    };
  }
}

// Start the server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI Agent API server running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  POST /api/tasks - Submit a new task`);
  console.log(`  GET /api/tasks/:taskId - Get task status`);
  console.log(`  GET /api/tasks - List all tasks`);
  console.log(`  POST /submit-task - Execute tasks directly`);
});

export { app, server };
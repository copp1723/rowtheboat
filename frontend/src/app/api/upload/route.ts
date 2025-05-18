import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

// Simple function to count lines in a file
async function countLines(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return content.split('\n').length
  } catch (error) {
    console.error('Error counting lines:', error)
    return 0
  }
}

// Simple function to process a CSV file
async function processFile(filePath: string): Promise<any> {
  try {
    const stats = await fs.stat(filePath)
    const lineCount = await countLines(filePath)

    return {
      upload_id: uuidv4(),
      file_name: path.basename(filePath),
      file_size: stats.size,
      line_count: lineCount,
      timestamp: Date.now()
    }
  } catch (error) {
    console.error('Error processing file:', error)
    return {
      upload_id: uuidv4(),
      error: 'Error processing file'
    }
  }
}

export async function POST(request: Request) {
  try {
    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp')
    try {
      await fs.mkdir(tempDir, { recursive: true })
    } catch (err) {
      console.error('Error creating temp directory:', err)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      )
    }

    // Save file temporarily
    const tempPath = path.join(tempDir, file.name)
    const fileBuffer = await file.arrayBuffer()
    await fs.writeFile(tempPath, Buffer.from(fileBuffer))

    console.log(`File saved to ${tempPath}, processing...`)

    try {
      // Process the file using our JavaScript implementation
      const result = await processFile(tempPath)
      console.log('File processing result:', result)

      // Clean up temp file
      try {
        await fs.unlink(tempPath)
      } catch (err) {
        console.error('Error deleting temp file:', err)
      }

      // Simulate a delay to show progress in the UI
      await new Promise(resolve => setTimeout(resolve, 1000))

      return NextResponse.json({
        uploadId: result.upload_id,
        filename: file.name,
        lineCount: result.line_count,
        fileSize: result.file_size
      })
    } catch (processingError) {
      console.error('Error during file processing:', processingError)

      // Fallback: Generate a UUID as upload ID
      const fallbackId = uuidv4()

      return NextResponse.json({
        uploadId: fallbackId,
        filename: file.name,
        warning: 'File was uploaded but could not be processed. Using fallback ID.'
      })
    }

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

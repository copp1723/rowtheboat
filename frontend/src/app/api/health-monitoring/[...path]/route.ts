import { NextRequest, NextResponse } from 'next/server';

// Health monitoring API proxy
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path || [];
  const path = pathSegments.join('/');
  
  try {
    // Forward to the health monitoring server
    const response = await fetch(`http://localhost:5002/api/health-monitoring/${path}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Health monitoring service returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error proxying to health monitoring API: ${error}`);
    return NextResponse.json(
      { error: 'Failed to fetch data from health monitoring service' },
      { status: 500 }
    );
  }
}

// Handle POST requests
export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path || [];
  const path = pathSegments.join('/');
  
  try {
    // Forward to the health monitoring server
    const response = await fetch(`http://localhost:5002/api/health-monitoring/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: request.body ? JSON.stringify(await request.json()) : undefined,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Health monitoring service returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error proxying to health monitoring API: ${error}`);
    return NextResponse.json(
      { error: 'Failed to send data to health monitoring service' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';

/**
 * Send a test email to the specified recipient
 * POST /api/emails/test
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientEmail } = body;
    
    // Validate email
    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, message: 'Recipient email is required' },
        { status: 400 }
      );
    }
    
    // Make a request to our backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/emails/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipientEmail }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: result.message || 'Failed to send test email' 
        },
        { status: response.status }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
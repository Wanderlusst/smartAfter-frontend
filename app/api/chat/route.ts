import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createServerClient } from '@/app/lib/supabaseClient';

// System prompt with context about SmartAfter
const SYSTEM_PROMPT = `You are SmartBot, an intelligent after-purchase assistant built into SmartAfter.

The user has granted access to their Gmail, and your job is to:
- Help them track all past and present online purchases from Amazon, Flipkart, Myntra, etc.
- Find and retrieve invoices, receipts, warranty cards, and return windows.
- Summarize purchases by category (e.g., Electronics, Grocery, Fashion).
- Remind about items nearing return deadlines or warranty expiry.
- Help download or preview attachments (PDFs, receipts, etc.).
- Answer product-specific support questions like "where is my headphone invoice?" or "did I return my order?".

You can access parsed Gmail order data including:
- Sender (from), Subject, Date, Attachment names
- Document Type (Invoice, Receipt, Return Label, Warranty)
- Product Name, Price (if detected), Category
- Attachment ID (optional)

You are friendly, helpful, but direct. Use short and actionable answers.
If an invoice is found, provide the date and suggest downloading.
If a return window is open, tell the user with urgency.

Never guess. If data is missing, ask the user to wait for sync or upload.

If the user asks general questions like:
- "What have I spent this month?"
- "Show me all my Flipkart orders"
- "Download all receipts from June"

Give concise, helpful responses using data at hand.

Avoid fake empathy. Keep tone professional but helpful, like Google Assistant or Notion AI.`;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, includeContext = true } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // Get user context from Supabase if requested
    let userContext = '';
    if (includeContext) {
      try {
        const supabase = createServerClient();
        const { data: purchases } = await supabase
          .from('purchases')
          .select('vendor, amount, date, subject')
          .eq('user_id', session.user.id)
          .order('date', { ascending: false })
          .limit(10);

        if (purchases && purchases.length > 0) {
          userContext = `\n\nUSER'S RECENT PURCHASES:\n${purchases.map(p => 
            `- ${p.vendor}: ${p.amount} on ${p.date} (${p.subject})`
          ).join('\n')}`;
        }
      } catch {
        
      }
    }

    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: 'system', content: SYSTEM_PROMPT + userContext },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' 
      }, { status: 500 });
    }

    // Create streaming response
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: openaiMessages,
        stream: true,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      await response.json().catch(() => ({}));
      
      return NextResponse.json({ 
        error: 'Failed to get AI response. Please try again.' 
      }, { status: 500 });
    }

    // Create a ReadableStream for streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch {
    
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.' 
    }, { status: 500 });
  }
} 
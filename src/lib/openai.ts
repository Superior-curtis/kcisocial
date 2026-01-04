const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Helper function to chat with Google Gemini
async function chatWithGemini(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
  // Convert messages to Gemini format
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const conversationMessages = messages.filter(m => m.role !== 'system');
  
  // Build Gemini prompt format
  const parts = conversationMessages.map(m => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    return {
      role,
      parts: [{ text: m.content }]
    };
  });

  // Prepend system message as user message if exists
  if (systemMessage) {
    parts.unshift({
      role: 'user',
      parts: [{ text: `System instructions: ${systemMessage}` }]
    });
    parts.splice(1, 0, {
      role: 'model',
      parts: [{ text: 'Understood. I will follow these instructions.' }]
    });
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: parts.slice(-10), // Last 10 messages to stay within context
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Gemini API error:', errorData);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
}

export async function correctText(textToCorrect: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key not configured');
    return textToCorrect; // Return original text if API not configured
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a text correction assistant. Your task is to correct grammar and improve wording. Reply with ONLY the corrected text, no explanations or numbering.',
          },
          {
            role: 'user',
            content: `Please correct this text grammatically and improve the wording: "${textToCorrect}"`
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return textToCorrect; // Return original text on error
    }

    const data = await response.json();
    const corrected = data.choices[0]?.message?.content?.trim() || textToCorrect;
    
    // Ensure we're returning plain text, not numbered output
    // Remove leading numbers/bullets if present (e.g., "1. ", "1) ")
    return corrected.replace(/^[\d]+[\.\)]\s*/, '').trim();
  } catch (error) {
    console.error('Error correcting text:', error);
    return textToCorrect; // Return original text on error
  }
}

export async function chatWithAI(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
  // Try Gemini first (free tier available)
  if (GEMINI_API_KEY) {
    try {
      return await chatWithGemini(messages);
    } catch (error) {
      console.error('Gemini API failed, falling back to OpenAI:', error);
    }
  }

  // Fall back to OpenAI
  if (!OPENAI_API_KEY) {
    console.error('No AI API key configured (OpenAI or Gemini)');
    throw new Error('AI_NOT_CONFIGURED');
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant for KCIS (康橋國際學校) students. You can help with homework, answer questions about classes, provide study tips, explain concepts, solve math problems, and assist with general school-related queries. Be friendly, encouraging, and educational in your responses. Answer in the same language the user asks in (English or Chinese).',
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return 'Sorry, I encountered an error processing your request. Please try again.';
  }
}

// Minimal AI assistant stub to keep UI logic separate.
// The assistant only returns suggestions; never auto-posts.

export interface AiSuggestion {
  original: string;
  improved: string;
  notes?: string;
}

// Placeholder using a simple heuristic. Replace with a server function or API.
export async function rewritePostContent(input: string): Promise<AiSuggestion> {
  const trimmed = input.trim();
  const improved =
    trimmed.length === 0
      ? ""
      : trimmed.charAt(0).toUpperCase() + trimmed.slice(1) + (/[.!?]$/.test(trimmed) ? '' : '.');
  return {
    original: input,
    improved,
    notes: 'Basic clarity pass applied. Replace with a proper AI backend.',
  };
}

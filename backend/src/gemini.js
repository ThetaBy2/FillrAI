// Calls Google Gemini. Returns null when no API key is configured,
// so every caller has a plain fallback and the app works without AI.
export async function askGemini(parts) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.includes('your_gemini_api_key')) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.3 },
    }),
  });
  if (!response.ok) throw new Error(`Gemini request failed (${response.status})`);

  const data = await response.json();
  const replyParts = data.candidates?.[0]?.content?.parts || [];
  return replyParts.map((part) => part.text || '').join('');
}


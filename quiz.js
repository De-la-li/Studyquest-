// ══════════════════════════════════════════════════════
//  StudyQuest — Secure Quiz Generation Function
// ══════════════════════════════════════════════════════

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const { topic, count, difficulty } = JSON.parse(event.body);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    const diffDesc = {
      easy:   'basic recall and understanding',
      medium: 'some analysis and application required',
      hard:   'deep understanding and critical thinking',
    };

    const prompt = `Generate exactly ${count} multiple-choice quiz questions about: "${topic}".
Difficulty: ${difficulty} (${diffDesc[difficulty] || diffDesc.medium}).
Return ONLY a valid JSON array, no markdown, no backticks, no extra text.
Format:
[{"q":"Question text?","options":["A) option","B) option","C) option","D) option"],"answer":0,"explanation":"Brief explanation of why this is correct."}]
Rules:
- answer is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D)
- All 4 options must be plausible
- Questions must be clear and unambiguous
- Explanations should be educational`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.5 },
        }),
      }
    );

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const questions = JSON.parse(raw.replace(/```json|```/g, '').trim());

    if (!Array.isArray(questions) || !questions.length) throw new Error('Invalid quiz data');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ questions }),
    };

  } catch (error) {
    console.error('Quiz function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Could not generate quiz. Try a different topic!' }),
    };
  }
};

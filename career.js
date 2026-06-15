// ══════════════════════════════════════════════════════
//  StudyQuest — Secure Career Guide Function
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
    const { studying, interests, prefs, goal, target } = JSON.parse(event.body);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    const prompt = `You are Sage, a career counsellor for university students in Ghana and Africa.
Build a detailed career roadmap for this student:
- Currently studying: ${studying || 'Not specified'}
- Interests & strengths: ${interests || 'Not specified'}
- Work environment preference: ${prefs || 'Not specified'}
- Career goal: ${goal || 'Not specified'}
- Target career: ${target || 'Suggest the best fit based on their background'}

Return ONLY valid JSON, no markdown, no backticks:
{
  "career": "Specific job title",
  "emoji": "one relevant emoji",
  "overview": "2-3 sentences connecting their background to this career path",
  "why": "1-2 sentences on why this suits them specifically",
  "skills": [{"title":"Skill name","desc":"Why it matters and how to build it","timeline":"short"}],
  "steps": [{"title":"Action step","desc":"Specific actionable advice for a Ghanaian student","timeline":"medium"}],
  "certifications": [{"title":"Certification or qualification","desc":"Where to get it and cost if known","timeline":"long"}],
  "resources": [{"title":"Resource name","desc":"What it is and where to find it for free or cheap"}],
  "salaryRange": "Realistic salary range in Ghana (GHS) or internationally (USD)",
  "jobOutlook": "Job market outlook specifically in Ghana and West Africa"
}
timeline values: short=0-6 months, medium=6-18 months, long=1-3 years
Keep advice practical and relevant to the Ghanaian context.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
        }),
      }
    );

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const roadmap = JSON.parse(raw.replace(/```json|```/g, '').trim());

    if (!roadmap.career) throw new Error('Invalid roadmap data');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ roadmap }),
    };

  } catch (error) {
    console.error('Career function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Could not generate roadmap. Please try again!' }),
    };
  }
};

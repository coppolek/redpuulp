import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Translate the following title and description into Italian. Preserve any HTML formatting exactly as it is in the description. Do NOT add markdown wrappers like \`\`\`json.
Return ONLY a valid JSON object with EXACTLY two keys: "title" and "description".

Original Title: Test Title
Original Description: <p>Test Description</p>`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING }
        }
      }
    }
  });
  console.log(response.text);
}
test().catch(console.error);

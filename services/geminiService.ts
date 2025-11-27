import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionCategory } from "../types";
import { v4 as uuidv4 } from 'uuid'; // Assumption: uuid is available or we use a helper. 
// Since I can't guarantee 'uuid' package, I will implement a simple ID generator below.

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export const generateInterviewQuestions = async (
  jobDescription: string,
  category: QuestionCategory
): Promise<Question[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prompt engineering based on category
  let promptContext = "";
  if (category === QuestionCategory.COMPLETE_SESSION) {
    promptContext = "Generate a mix of 5 questions including background, behavioral, and technical questions.";
  } else if (category === QuestionCategory.BACKGROUND) {
    promptContext = "Generate 5 background and experience-based interview questions.";
  } else if (category === QuestionCategory.BEHAVIORAL) {
    promptContext = "Generate 5 situational and behavioral (STAR method) interview questions.";
  } else {
    promptContext = "Generate 5 technical interview questions relevant to the specific skills mentioned.";
  }

  const prompt = `
    You are an expert technical recruiter. 
    ${promptContext}
    Based on the following Job Description: "${jobDescription.substring(0, 5000)}..."
  `;

  // Define schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The interview question text" },
            categoryHint: { type: Type.STRING, description: "The category this question belongs to" }
          },
          required: ["text", "categoryHint"]
        }
      }
    },
    required: ["questions"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a helpful interview coach. Output only valid JSON."
      }
    });

    const text = response.text;
    if (!text) return [];

    const data = JSON.parse(text);
    
    // Map to our internal type
    return data.questions.map((q: any) => ({
      id: generateId(),
      text: q.text,
      category: category === QuestionCategory.COMPLETE_SESSION ? mapCategory(q.categoryHint) : category,
      aiGenerated: true,
      createdAt: Date.now()
    }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

function mapCategory(hint: string): QuestionCategory {
  const h = hint.toLowerCase();
  if (h.includes('tech')) return QuestionCategory.TECHNICAL;
  if (h.includes('behav') || h.includes('situ')) return QuestionCategory.BEHAVIORAL;
  return QuestionCategory.BACKGROUND;
}
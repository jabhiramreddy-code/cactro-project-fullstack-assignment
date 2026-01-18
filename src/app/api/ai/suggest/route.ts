import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logEvent } from '@/lib/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, description } = await request.json();

        if (!title) {
            return NextResponse.json(
                { error: 'Video title is required' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `
      You are a YouTube expert. I have a video with the following details:
      
      Current Title: "${title}"
      Description (optional): "${description || 'N/A'}"
      
      Please suggest 3 improved, engaging, and SEO-friendly titles for this video.
      Return strictly a JSON array of strings, like this: ["Title 1", "Title 2", "Title 3"].
      Do not include markdown formatting or explanations.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown if Gemini adds it (e.g. ```json ... ```)
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let suggestions;
        try {
            suggestions = JSON.parse(cleanedText);
        } catch (e) {
            // Fallback if JSON parsing fails, though prompt instructions should prevent this
            console.error("AI JSON Parse Error", e);
            suggestions = [
                `Make "${title}" Better`,
                `The Ultimate Guide to: ${title}`,
                `Watch This Before You Make a Video About ${title}`
            ];
        }

        await logEvent('AI_SUGGESTIONS_GENERATED', { originalTitle: title });

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('FULL AI ERROR DETAILS:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return NextResponse.json(
            { error: 'Failed to generate suggestions', details: (error as Error).message },
            { status: 500 }
        );
    }
}

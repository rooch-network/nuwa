import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

/**
 * Schema for the tweet scoring result.
 */
export const tweetScoreSchema = z.object({
    score: z.number().min(0).max(100).describe("The numerical score assigned to the tweet (0-100)."),
    reasoning: z.string().describe("A brief explanation of why this score was given, based on the criteria.")
});

/**
 * Type definition for the tweet scoring result.
 */
export type TweetScoreResult = z.infer<typeof tweetScoreSchema>;

/**
 * Scores a tweet based on provided data and predefined criteria using an AI model.
 * 
 * @param tweetData The JSON data object of the tweet to be scored.
 * @returns A promise that resolves to an object containing the score and reasoning.
 * @throws Throws an error if the AI model fails to generate the score object.
 */
export async function getTweetScore(tweetData: object): Promise<TweetScoreResult> {
    
    // --- Refined Scoring Criteria (0-100 points) ---
    const scoringCriteria = `
    1.  **Core Theme Relevance (Nuwa & AI) (0-35 points):** 
        - Discusses both Nuwa and AI in depth, especially Nuwa's AI aspects or applications: (25-35 points)
        - Discusses either Nuwa or AI relevantly and in some depth: (10-24 points)
        - Briefly mentions Nuwa or AI, or relevance is weak: (1-9 points)
        - Irrelevant: (0 points)
    2.  **Depth and Novelty (0-25 points):** 
        - Offers deep insights, unique perspective, critical analysis, or truly novel ideas: (18-25 points)
        - Provides some analysis or explanation beyond surface level, shows some original thought: (8-17 points)
        - Superficial, generic statements, common knowledge, or repetitive: (0-7 points)
    3.  **Clarity and Quality (0-20 points):** 
        - Excellent clarity, structure, grammar, and readability: (15-20 points)
        - Generally clear and well-written, minor issues acceptable: (7-14 points)
        - Unclear, poorly structured, significant errors: (0-6 points)
    4.  **Content Uniqueness / Non-Templated (0-10 points):** 
        - Reads as authentic, individual thought and expression: (7-10 points)
        - Feels somewhat generic or uses common phrasings/templates: (3-6 points)
        - Seems highly templated, uninspired, or potentially copied: (0-2 points)
    5.  **Sentiment (0-10 points):** 
        - Clearly Positive or Enthusiastic towards the core themes: (8-10 points)
        - Neutral or Objective: (4-7 points)
        - Negative or Critical: (0-3 points)
    
    The total score is the sum of points from these criteria (max 100).
    `;
    // --- End of Scoring Criteria Definition ---

    try {
        const { object: scoreResult } = await generateObject({
            model: openai('gpt-4o-mini'), // Consider gpt-4o for better nuance
            schema: tweetScoreSchema,
            prompt: `Please analyze and score the following tweet based *strictly* on the provided criteria. Assign points for each criterion and sum them for the final score (0-100).

            **Scoring Criteria:**
            ${scoringCriteria}

            **Tweet Data (JSON):**
            \`\`\`json
            ${JSON.stringify(tweetData, null, 2)}
            \`\`\`

            Provide the final numerical score (0-100) and a brief reasoning summarizing how the score was derived based *only* on the criteria.
            `
        });

        return scoreResult;

    } catch (error) {
        console.error("Error generating tweet score:", error);
        throw new Error(`Failed to get tweet score from AI model: ${error instanceof Error ? error.message : String(error)}`);
    }
} 
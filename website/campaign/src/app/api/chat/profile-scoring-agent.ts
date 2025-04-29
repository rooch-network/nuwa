import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

/**
 * Schema for the Twitter Profile scoring result.
 */
export const profileScoreSchema = z.object({
    score: z.number().min(0).max(100).describe("The numerical score assigned to the Twitter profile (0-100)."),
    reasoning: z.string().describe("A brief explanation of why this score was given, based on the profile criteria.")
});

/**
 * Type definition for the Twitter Profile scoring result.
 */
export type ProfileScoreResult = z.infer<typeof profileScoreSchema>;

/**
 * Scores a Twitter Profile based on provided data and predefined criteria using an AI model.
 *
 * @param profileData The JSON data object of the Twitter profile to be scored.
 *                      This should include information like description, follower count,
 *                      following count, tweet count, recent tweets (if available), etc.
 * @returns A promise that resolves to an object containing the score and reasoning.
 * @throws Throws an error if the AI model fails to generate the score object.
 */
export async function getProfileScore(profileData: object): Promise<ProfileScoreResult> {

    // --- Profile Scoring Criteria (0-100 points) ---
    const scoringCriteria = `
    1.  **Profile Completeness & Clarity (0-15 points):**
        - Bio/Description: Informative and clear? (0-7 points)
        - Profile Picture & Header: Appropriate, professional/on-topic? (0-5 points)
        - Location/Link: Provided and relevant? (0-3 points)
    2.  **Relevance to Web3 or AI (0-20 points):**
        - Bio/Description Keywords: Explicitly mentions relevant topics (Web3, AI, Blockchain, DeFi, ML, specific technologies)? (0-10 points)
        - Recent Tweet Content (if provided): Consistent discussion or engagement with relevant topics? (0-7 points)
        - Overall Focus: Profile clearly centers around relevant themes? (0-3 points)
    3.  **Account Activity (0-20 points):**
        - Tweet Frequency: Active posting schedule (relative to account age)? (0-10 points)
        - Follower/Following Ratio: Healthy ratio (e.g., not excessively following)? (0-5 points)
        - Account Age & Consistency: Established account with consistent activity? (0-5 points)
    4.  **Influence & Reach (0-10 points):**
        - Follower Count: Scale (e.g., <1k, 1k-10k, 10k+)? (Consider quality over quantity). (0-7 points)
        - Listed Count (if available): Indicator of perceived value by others. (0-3 points)
    5.  **Content Quality & Engagement (0-35 points):**
        - Content Quality: Professional, relevant, and valuable to the community? (0-10 points)
        - Recent Tweet Quality (if provided): Well-written, informative, non-spammy? (0-10 points)
        - Engagement Metrics: Likes, retweets, replies, and overall interaction rate on tweets (0-10 points)
        - Originality & Uniqueness: Shares original thoughts, analysis, or insights rather than just retweeting others? (0-5 points)

    The total score is the sum of points from these criteria (max 100). Focus on evaluating both relevance to Web3/AI ecosystems and overall content quality.
    `;
    // --- End of Profile Scoring Criteria Definition ---

    try {
        // Note: Profile data can be large. Ensure only relevant parts are sent.
        // Consider summarizing recent tweets if including them.
        const { object: scoreResult } = await generateObject({
            model: openai('gpt-4o-mini'), // Consider gpt-4o for more complex profile analysis
            schema: profileScoreSchema,
            prompt: `Please analyze and score the following Twitter profile based *strictly* on the provided criteria. Assign points for each criterion and sum them for the final score (0-100). Evaluate based *only* on the information provided.

            **Scoring Criteria:**
            ${scoringCriteria}

            **Twitter Profile Data (JSON):**
            \`\`\`json
            ${JSON.stringify(profileData, null, 2)}
            \`\`\`

            Your response MUST include the following fields in the specified format:
            1. score: The total numerical score (0-100)
            2. reasoning: A brief explanation of your scoring rationale that summarizes how the score was derived based *only* on the criteria
            
            Please ensure that both fields are included in your response, with the score being a number between 0 and 100.
            `
        });

        return scoreResult;

    } catch (error) {
        console.error("Error generating profile score:", error);
        throw new Error(`Failed to get profile score from AI model: ${error instanceof Error ? error.message : String(error)}`);
    }
}

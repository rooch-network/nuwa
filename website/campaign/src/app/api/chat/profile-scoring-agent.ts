import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

/**
 * Schema for the Twitter Profile scoring result with category scores.
 */
export const profileScoreSchema = z.object({
    profileCompleteness: z.number().min(0).describe("Score for Profile Completeness & Clarity (0-15)."),
    relevance: z.number().min(0).describe("Score for Relevance to Web3 or AI (0-15)."),
    accountActivity: z.number().min(0).describe("Score for Account Activity (0-20)."),
    influence: z.number().min(0).describe("Score for Influence & Reach (0-15)."),
    contentQuality: z.number().min(0).describe("Score for Content Quality & Engagement (0-35)."),
    reasoning: z.string().describe("A brief explanation of why these scores were given, based on the profile criteria.")
});

/**
 * Type definition for the Twitter Profile scoring result.
 */
export type CategoryProfileScoreResult = z.infer<typeof profileScoreSchema>;

/**
 * Returns the legacy ProfileScoreResult format for backward compatibility
 */
export type ProfileScoreResult = {
    score: number;
    reasoning: string;
};

/**
 * Scores a Twitter Profile based on provided data and predefined criteria using an AI model.
 *
 * @param profileData The JSON data object of the Twitter profile to be scored.
 *                      This should include information like description, follower count,
 *                      following count, tweet count, recent tweets (if available), etc.
 * @returns A promise that resolves to an object containing detailed category scores and reasoning.
 * @throws Throws an error if the AI model fails to generate the score object.
 */
export async function getProfileScore(profileData: object): Promise<ProfileScoreResult> {

    // --- Profile Scoring Criteria (0-100 points) ---
    const scoringCriteria = `
    1.  **Profile Completeness & Clarity (0-15 points):**
        - Bio/Description: Informative and clear? (0-7 points)
        - Profile Picture & Header: Appropriate, professional/on-topic? (0-5 points)
        - Location/Link: Provided and relevant? (0-3 points)
    2.  **Relevance to Web3 or AI (0-15 points):**
        - Bio/Description Keywords: Explicitly mentions relevant topics (Web3, AI, Blockchain, DeFi, ML, specific technologies)? (0-8 points)
        - Recent Tweet Content (if provided): Consistent discussion or engagement with relevant topics? (0-5 points)
        - Overall Focus: Profile clearly centers around relevant themes? (0-2 points)
    3.  **Account Activity (0-20 points):**
        - Tweet Frequency: Active posting schedule (relative to account age)? (0-10 points)
        - Follower/Following Ratio: Healthy ratio (e.g., not excessively following)? (0-5 points)
        - Account Age & Consistency: Established account with consistent activity? (0-5 points)
    4.  **Influence & Reach (0-15 points):**
        - Follower Count: Scale (e.g., <1k, 1k-10k, 10k+)? (Consider quality over quantity). (0-7 points)
        - Listed Count (if available): Indicator of perceived value by others. (0-3 points)
        - Verified Status: Twitter verified account? (0-5 points)
    5.  **Content Quality & Engagement (0-35 points):**
        - Recent Tweet Quality (if provided): Well-written, informative, non-spammy? Professional, relevant, and valuable to the community (0-20 points)
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
            prompt: `Please analyze and score the following Twitter profile based *strictly* on the provided criteria. 
            Evaluate based *only* on the information provided.

            **Scoring Criteria:**
            ${scoringCriteria}

            **Twitter Profile Data (JSON):**
            \`\`\`json
            ${JSON.stringify(profileData, null, 2)}
            \`\`\`

            **IMPORTANT SCORING RULES**:
            1. If certain information is not provided at all (such as recent tweets, engagement metrics, etc.), you MUST assign a score of 0 for those specific criteria.
            2. If information is partially provided or incomplete, you must deduct points proportionally to how much is missing.
            3. Be consistent in your scoring - the same profile should receive similar scores across multiple evaluations.
            4. In your reasoning, explicitly mention what information was missing or incomplete and how that affected your scoring.
            5. Follow these specific guidelines for common scenarios:
               - If profile header is missing: deduct at least 2 points from Profile Completeness
               - If engagement metrics are incomplete: deduct at least 5 points from Content Quality
               - If listed count is 0 or missing: assign 0 points for that specific criterion
               - If verification status is not explicitly stated as true: assign 0 points for that criterion

            For your output, you MUST provide scores for each of the following main categories:

            1. profileCompleteness: total points for Profile Completeness & Clarity (0-15)
            2. relevance: total points for Relevance to Web3 or AI (0-15)
            3. accountActivity: total points for Account Activity (0-20)
            4. influence: total points for Influence & Reach (0-15)
            5. contentQuality: total points for Content Quality & Engagement (0-35)
            6. reasoning: A detailed explanation of why these scores were given
            
            In your reasoning, you MUST include for each category:
            - The specific score assigned (e.g., "Profile Completeness & Clarity (12/15)")
            - What information was present and what was missing
            - How you calculated the score based on subcriteria
            - Any deductions made due to missing or incomplete information
            `
        });
            
        // Calculate the total score
        const totalScore = Math.min(
            scoreResult.profileCompleteness +
            scoreResult.relevance +
            scoreResult.accountActivity +
            scoreResult.influence +
            scoreResult.contentQuality,
            100
        );
        
        return {
            score: totalScore,
            reasoning: scoreResult.reasoning
        };

    } catch (error) {
        console.error("Error generating profile score:", error);
        throw new Error(`Failed to get profile score from AI model: ${error instanceof Error ? error.message : String(error)}`);
    }
}

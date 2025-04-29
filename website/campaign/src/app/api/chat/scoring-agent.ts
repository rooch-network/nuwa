import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { StandardTweet } from '@/app/services/twitterAdapter';
import { TweetScoreData } from '@/app/types/scoring';
/**
 * Schema for the tweet scoring result.
 */
export const tweetScoreSchema = z.object({
    score: z.number().min(0).max(100).describe("The numerical score assigned to the tweet (0-100)."),
    reasoning: z.string().describe("A brief explanation of why this score was given, based on the criteria."),
    engagement_score: z.number().min(0).max(50).describe("Portion of score based on engagement metrics (0-50)."),
    content_score: z.number().min(0).max(50).describe("Portion of score based on content quality (0-50).")
});

/**
 * Type definition for the tweet scoring result.
 */
export type TweetScoreResult = z.infer<typeof tweetScoreSchema>;

/**
 * Scores a tweet based on provided data and predefined criteria using an AI model.
 * Can optionally consider previous scoring data to assess engagement growth.
 * 
 * @param tweetData The StandardTweet object to be scored.
 * @param previousScore Optional previous scoring data for comparison.
 * @returns A promise that resolves to an object containing the score and reasoning.
 * @throws Throws an error if the AI model fails to generate the score object.
 */
export async function assessTweetScore(
    tweetData: StandardTweet,
    previousScore?: TweetScoreData
): Promise<TweetScoreResult> {
    
    // --- Refined Scoring Criteria (0-100 points) ---
    const scoringCriteria = `
    1.  **Core Theme Relevance (Nuwa & AI) (0-25 points):** 
        - Discusses both Nuwa and AI in depth, especially Nuwa's AI aspects or applications: (18-25 points)
        - Discusses either Nuwa or AI relevantly and in some depth: (8-17 points)
        - Briefly mentions Nuwa or AI, or relevance is weak: (1-7 points)
        - Irrelevant: (0 points)
    2.  **Depth and Novelty (0-15 points):** 
        - Offers deep insights, unique perspective, critical analysis, or truly novel ideas: (10-15 points)
        - Provides some analysis or explanation beyond surface level, shows some original thought: (5-9 points)
        - Superficial, generic statements, common knowledge, or repetitive: (0-4 points)
    3.  **Clarity and Quality (0-7 points):** 
        - Excellent clarity, structure, grammar, and readability: (5-7 points)
        - Generally clear and well-written, minor issues acceptable: (2-4 points)
        - Unclear, poorly structured, significant errors: (0-1 points)
    4.  **Content Uniqueness / Non-Templated (0-3 points):** 
        - Reads as authentic, individual thought and expression: (2-3 points)
        - Feels somewhat generic or uses common phrasings/templates: (1 point)
        - Seems highly templated, uninspired, or potentially copied: (0 points)
    5.  **Engagement Growth (0-25 points):**
        - Significant increase in engagement (likes, retweets, replies) compared to previous metrics: (18-25 points)
        - Moderate increase in engagement metrics: (8-17 points)
        - Minimal or no change in engagement: (1-7 points)
        - Decrease in engagement: (0 points)
        - For first-time scoring with no previous data, assign points based on initial engagement relative to followers (12-15 points is typical)
        - NOTE: You MUST assign a score in this category even if there is no change in engagement metrics.
    6.  **Current Engagement Level (0-25 points):**
        - High engagement relative to author's followers (e.g., >5% engagement rate): (18-25 points)
        - Moderate engagement relative to author's followers: (8-17 points)
        - Low engagement relative to author's followers: (0-7 points)
        - NOTE: Calculate engagement rate as (likes + retweets + replies + quotes) / followers_count * 100%.
          If followers_count is not available or is 0, estimate an appropriate score based on raw engagement numbers.
    
    The total score is the sum of points from these criteria (max 100).
    Calculate the engagement_score (criteria 5+6, max 50) and content_score (criteria 1-4, max 50) separately.
    ALWAYS provide a numerical score for EACH criterion, even when there is no change in metrics.
    `;
    // --- End of Scoring Criteria Definition ---

    try {
        // Extract current engagement metrics
        const currentMetrics = {
            likes: tweetData.public_metrics?.like_count || 0,
            retweets: tweetData.public_metrics?.retweet_count || 0,
            replies: tweetData.public_metrics?.reply_count || 0,
            quotes: tweetData.public_metrics?.quote_count || 0,
            impressions: tweetData.public_metrics?.impression_count,
            followers: tweetData.author?.public_metrics?.followers_count
        };
         
        
        // Prepare previous score context if available
        let previousScoreContext = '';
        if (previousScore) {
            const scoredDate = new Date(previousScore.scored_at).toLocaleDateString();
            previousScoreContext = `
            **Previous Scoring Data (${scoredDate}):**
            - Previous Score: ${previousScore.score}/100
            - Previous Content Score: ${previousScore.content_score}/50
            - Previous Engagement Score: ${previousScore.engagement_score}/50
            
            **Previous Engagement Metrics:**
            - Likes: ${previousScore.engagement_metrics.likes}
            - Retweets: ${previousScore.engagement_metrics.retweets}
            - Replies: ${previousScore.engagement_metrics.replies}
            ${previousScore.engagement_metrics.quotes ? `- Quotes: ${previousScore.engagement_metrics.quotes}` : ''}
            ${previousScore.engagement_metrics.impressions ? `- Impressions: ${previousScore.engagement_metrics.impressions}` : ''}
            
            When evaluating engagement growth (criterion 5), compare current metrics with these previous metrics.
            `;
        }

        const { object: scoreResult } = await generateObject({
            model: openai('gpt-4o-mini'),
            schema: tweetScoreSchema,
            prompt: `Please analyze and score the following tweet based *strictly* on the provided criteria. Assign points for each criterion and sum them for the final score (0-100).

            **Scoring Criteria:**
            ${scoringCriteria}

            **Current Engagement Metrics:**
            - Likes: ${currentMetrics.likes}
            - Retweets: ${currentMetrics.retweets}
            - Replies: ${currentMetrics.replies}
            - Quotes: ${currentMetrics.quotes || 'N/A'}
            ${currentMetrics.impressions ? `- Impressions: ${currentMetrics.impressions}` : ''}
            ${currentMetrics.followers ? `- Author Followers: ${currentMetrics.followers}` : '- Author Followers: Unknown (use raw engagement numbers for scoring)'}
            
            ${previousScoreContext}

            **Tweet Data (JSON):**
            \`\`\`json
            ${JSON.stringify(tweetData, null, 2)}
            \`\`\`

            Your response MUST include the following fields in the specified format:
            1. score: The total numerical score (0-100)
            2. reasoning: A brief explanation of your scoring rationale
            3. engagement_score: The portion of score based on engagement metrics (criteria 5+6, 0-50 points)
            4. content_score: The portion of score based on content quality (criteria 1-4, 0-50 points)
            
            IMPORTANT SCORING CONSTRAINTS:
            - content_score MUST be between 0-50 (sum of criteria 1-4 only)
            - engagement_score MUST be between 0-50 (sum of criteria 5-6 only)
            - The final score MUST be the sum of content_score + engagement_score
            - Double-check your calculations to ensure content_score does not exceed 50
            
            Please ensure that all four fields are included in your response, with the correct value ranges.
            `
        });

        return scoreResult;

    } catch (error) {
        console.error("Error generating tweet score:", error);
        throw new Error(`Failed to get tweet score from AI model: ${error instanceof Error ? error.message : String(error)}`);
    }
} 
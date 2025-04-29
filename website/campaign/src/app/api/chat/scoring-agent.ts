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
    engagement_score: z.number().min(0).max(25).describe("Portion of score based on engagement metrics (0-25)."),
    content_score: z.number().min(0).max(75).describe("Portion of score based on content quality (0-75).")
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
    1.  **Core Theme Relevance (Nuwa & AI) (0-35 points):** 
        - Discusses both Nuwa and AI in depth, especially Nuwa's AI aspects or applications: (25-35 points)
        - Discusses either Nuwa or AI relevantly and in some depth: (10-24 points)
        - Briefly mentions Nuwa or AI, or relevance is weak: (1-9 points)
        - Irrelevant: (0 points)
    2.  **Depth and Novelty (0-20 points):** 
        - Offers deep insights, unique perspective, critical analysis, or truly novel ideas: (14-20 points)
        - Provides some analysis or explanation beyond surface level, shows some original thought: (7-13 points)
        - Superficial, generic statements, common knowledge, or repetitive: (0-6 points)
    3.  **Clarity and Quality (0-15 points):** 
        - Excellent clarity, structure, grammar, and readability: (10-15 points)
        - Generally clear and well-written, minor issues acceptable: (5-9 points)
        - Unclear, poorly structured, significant errors: (0-4 points)
    4.  **Content Uniqueness / Non-Templated (0-5 points):** 
        - Reads as authentic, individual thought and expression: (3-5 points)
        - Feels somewhat generic or uses common phrasings/templates: (1-2 points)
        - Seems highly templated, uninspired, or potentially copied: (0 points)
    5.  **Engagement Growth (0-15 points):**
        - Significant increase in engagement (likes, retweets, replies) compared to previous metrics: (10-15 points)
        - Moderate increase in engagement metrics: (5-9 points)
        - Minimal or no change in engagement: (1-4 points)
        - Decrease in engagement: (0 points)
        - For first-time scoring with no previous data, assign points based on initial engagement relative to followers (7-8 points is typical)
    6.  **Current Engagement Level (0-10 points):**
        - High engagement relative to author's followers (e.g., >5% engagement rate): (7-10 points)
        - Moderate engagement relative to author's followers: (3-6 points)
        - Low engagement relative to author's followers: (0-2 points)
    
    The total score is the sum of points from these criteria (max 100).
    Calculate the engagement_score (criteria 5+6, max 25) and content_score (criteria 1-4, max 75) separately.
    `;
    // --- End of Scoring Criteria Definition ---

    try {
        // Extract current engagement metrics
        const currentMetrics = {
            likes: tweetData.public_metrics?.like_count || 0,
            retweets: tweetData.public_metrics?.retweet_count || 0,
            replies: tweetData.public_metrics?.reply_count || 0,
            quotes: tweetData.public_metrics?.quote_count || 0,
            impressions: tweetData.public_metrics?.impression_count
        };
         
        
        // Prepare previous score context if available
        let previousScoreContext = '';
        if (previousScore) {
            const scoredDate = new Date(previousScore.scored_at).toLocaleDateString();
            previousScoreContext = `
            **Previous Scoring Data (${scoredDate}):**
            - Previous Score: ${previousScore.score}/100
            - Previous Content Score: ${previousScore.content_score}/75
            - Previous Engagement Score: ${previousScore.engagement_score}/25
            
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
            
            ${previousScoreContext}

            **Tweet Data (JSON):**
            \`\`\`json
            ${JSON.stringify(tweetData, null, 2)}
            \`\`\`

            Provide the final numerical score (0-100), engagement_score (0-25), content_score (0-75), and a brief reasoning summarizing how the score was derived based *only* on the criteria.
            `
        });

        return scoreResult;

    } catch (error) {
        console.error("Error generating tweet score:", error);
        throw new Error(`Failed to get tweet score from AI model: ${error instanceof Error ? error.message : String(error)}`);
    }
} 
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { StandardTweet } from '@/app/services/twitterAdapter';
import { TweetScoreData } from '@/app/types/scoring';
/**
 * Schema for the tweet scoring result.
 */
export const tweetScoreSchema = z.object({
    score: z.number().min(0).describe("The numerical score assigned to the tweet (0-100)."),
    reasoning: z.string().describe("A brief explanation of why this score was given, based on the criteria."),
    engagement_score: z.number().min(0).describe("Portion of score based on engagement metrics (0-50)."),
    content_score: z.number().min(0).describe("Portion of score based on content quality (0-50).")
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
    5.  **Engagement Score (0-50 points):**
        - For tweets with previous scoring data:
          • Significant engagement growth (>50% increase): (35-50 points)
          • Moderate engagement growth (10-50% increase): (20-34 points)
          • Minimal engagement growth (<10% increase): (10-19 points)
          • No change or decrease in engagement: Use the engagement rate scoring below, but maximum 15 points
        
        - For new tweets or tweets without previous data (based on engagement rate):
          • Exceptional engagement rate (>10%): (40-50 points)
          • High engagement rate (5-10%): (30-39 points)
          • Good engagement rate (2-5%): (20-29 points)
          • Average engagement rate (0.5-2%): (10-19 points)
          • Low engagement rate (<0.5%): (5-9 points)
          • New tweet with minimal engagement: (15-20 points as potential score)
        
        - NOTE: The engagement rate has been pre-calculated for you. For newer tweets (less than 24 hours old), focus on the quality of early engagement rather than raw numbers.
    
    The total score is the sum of points from these criteria (max 100).
    Calculate the engagement_score (criterion 5, max 50) and content_score (criteria 1-4, max 50) separately.
    ALWAYS provide a numerical score for EACH criterion.
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
        
        // Calculate engagement rate
        let engagementRate = 0;
        const totalInteractions = currentMetrics.likes + currentMetrics.retweets + 
                                 currentMetrics.replies + (currentMetrics.quotes || 0);
        
        if (currentMetrics.followers && currentMetrics.followers > 0) {
            engagementRate = (totalInteractions / currentMetrics.followers) * 100;
        }
         
        
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
            - Author Followers: ${currentMetrics.followers || 'Unknown'}
            - Total Interactions: ${totalInteractions}
            - Engagement Rate: ${engagementRate.toFixed(2)}% ${!currentMetrics.followers ? '(estimated without follower count)' : ''}
            
            ${previousScoreContext}

            **Tweet Data (JSON):**
            \`\`\`json
            ${JSON.stringify(tweetData, null, 2)}
            \`\`\`

            Your response MUST include the following fields in the specified format:
            1. score: The total numerical score = engagement_score + content_score (0-100)
            2. reasoning: A brief explanation of your scoring rationale
            3. engagement_score: The portion of score based on engagement metrics (criteria 5, 0-50 points)
            4. content_score: The portion of score based on content quality (criteria 1-4, 0-50 points)
            
            Scoring Guidelines:
            - Be generous in your evaluation - most tweets should receive at least some points in multiple categories
            - Avoid assigning 0 points for any major category unless the tweet is completely irrelevant or has no engagement
            - Consider the context and intent of the tweet, not just keywords
            
            Please ensure that all four fields are included in your response, with appropriate positive scores.
            `
        });
        //finalize the score to ensure it falls within the expected range
        if (!scoreResult) {
            throw new Error("Failed to generate score object from AI model.");
        }
        if (scoreResult.score < 0){
            console.warn("Score is less than 0, which is unexpected.");
            scoreResult.score = 0;
        }
        if (scoreResult.content_score < 0){   
            console.warn("Content score is less than 0, which is unexpected.");
            scoreResult.content_score = 0;
        }
        if (scoreResult.engagement_score < 0){   
            console.warn("Engagement score is less than 0, which is unexpected.");
            scoreResult.engagement_score = 0;
        }
        if (scoreResult.content_score > 50){   
            console.warn("Content score exceeds 50, which is unexpected.");
            scoreResult.content_score = 50;
        }
        if (scoreResult.engagement_score > 50){   
            console.warn("Engagement score exceeds 50, which is unexpected.");
            scoreResult.engagement_score = 50;
        }
        if (scoreResult.content_score + scoreResult.engagement_score != scoreResult.score){   
            console.warn("Score does not match the sum of content_score and engagement_score.");
            scoreResult.score = scoreResult.engagement_score + scoreResult.content_score;
        }
        if (scoreResult.score > 100){
            console.warn("Score is greater than 100, which is unexpected.");
            scoreResult.score = 100;
        }

        return scoreResult;

    } catch (error) {
        console.error("Error generating tweet score:", error);
        throw new Error(`Failed to get tweet score from AI model: ${error instanceof Error ? error.message : String(error)}`);
    }
} 
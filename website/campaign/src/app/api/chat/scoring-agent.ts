import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { StandardTweet } from '@/app/services/twitterAdapter';
import { TweetScoreData } from '@/app/types/scoring';
/**
 * Schema for the tweet scoring result.
 */
export const tweetScoreSchema = z.object({
    reasoning: z.string().describe("A brief explanation of why this score was given, based on the criteria."),
    engagement_score: z.number().min(0).describe("Portion of score based on engagement metrics (0-50)."),
    content_score: z.number().min(0).describe("Portion of score based on content quality (0-50).")
}).transform(data => {
    // Calculate the total score from the component scores
    const score = data.content_score + data.engagement_score;
    // Return the data with the calculated score
    return {
        ...data,
        score: Math.min(score, 100) // Ensure score doesn't exceed 100
    };
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
        - Extended discussion of Nuwa AI with specific applications, technical details, or use cases: assign 20 to 25 points
          Example: "Nuwa's AI platform offers developers powerful tools for building natural language applications with minimal coding required. The platform's strength lies in its pre-trained models that understand context across multiple languages..."
        - Clear discussion of both Nuwa and AI with some details: assign 15 to 19 points
          Example: "Nuwa's AI technology helps developers build better applications by automating repetitive tasks and generating code suggestions."
        - Simple mention of Nuwa AI in relevant context: assign 8 to 14 points
          Example: "Nuwa AI is incredibly helpful for developers!"
        - Brief or passing mention of either Nuwa or AI: assign 1 to 7 points
          Example: "Looking forward to trying this new tech!"
        - No mention of Nuwa or AI: assign 0 points
        
    2.  **Depth and Novelty (0-15 points):** 
        - Detailed explanation with examples, data, or technical insights (requires longer text): assign 12 to 15 points
          Example: "Nuwa's AI models achieve 95% accuracy on translation tasks while using 40% less computing resources. This is achieved through a novel approach to transformer architecture that optimizes token processing..."
        - Explains concepts with some supporting details: assign 8 to 11 points
          Example: "Nuwa AI helps developers by automating the documentation process and suggesting code improvements based on context-aware pattern recognition."
        - Mentions specific benefits or features without elaboration: assign 4 to 7 points
          Example: "Nuwa AI helps developers by automating documentation."
        - General statements without specifics: assign 0 to 3 points
          Example: "Nuwa AI is great."
        
        Note: This category strongly favors longer, more detailed content. Short tweets cannot score above 7 points here.
        
    3.  **Clarity and Quality (0-7 points):** 
        - Exceptionally well-structured with excellent flow (typically longer content): assign 6 to 7 points
        - Clear, error-free content: assign 4 to 5 points
        - Generally understandable with minor issues: assign 2 to 3 points
        - Unclear or with significant errors: assign 0 to 1 points
        
        Note: Both short and long content can score well here if clearly written.
        
    4.  **Content Uniqueness / Non-Templated (0-3 points):** 
        - Original insights or perspective not commonly seen: assign 2 to 3 points
        - Standard but personally expressed thoughts: assign 1 point
        - Generic or templated content: assign 0 points
        
        Note: Originality can be demonstrated in both short and long content.
    
    5.  **Engagement Score (0-50 points):**
        - For tweets with previous scoring data:
          • Significant engagement growth (>50% increase): assign 35 to 50 points
          • Moderate engagement growth (10-50% increase): assign 20 to 34 points
          • Minimal engagement growth (<10% increase): assign 10 to 19 points
          • No change or decrease in engagement: Use the engagement rate scoring below, but maximum 15 points
        
        - For new tweets or tweets without previous data (based on engagement rate):
          • Exceptional engagement rate (>10%): assign 40 to 50 points
          • High engagement rate (5-10%): assign 30 to 39 points
          • Good engagement rate (2-5%): assign 20 to 29 points
          • Average engagement rate (0.5-2%): assign 10 to 19 points
          • Low engagement rate (<0.5%): assign 5 to 9 points
          • New tweet with minimal engagement: assign 15 to 20 points
        
        - NOTE: The engagement rate has been pre-calculated for you. For newer tweets (less than 24 hours old), focus on the quality of early engagement rather than raw numbers.
    
    Important Scoring Instructions:
    - When you see "assign X to Y points", you should choose a specific score within that range. For example, "assign 20 to 25 points" means you should pick a specific value like 21, 22, 23, etc.
    - Each criterion has its own maximum. Add all criteria scores to get the final score (max 100).
    - Always use your judgment to determine where in each range a specific tweet falls.
    
    The total score is the sum of points from these criteria (max 100).
    Calculate the engagement_score (criterion 5, max 50) and content_score (criteria 1-4, max 50) separately.
    ALWAYS provide a numerical score for EACH criterion.
    
    CONTENT LENGTH GUIDELINES:
    - Short, relevant tweets (1-2 sentences mentioning Nuwa AI) should receive a content_score of 15 to 25 points out of 50.
    - Medium-length tweets (3-5 sentences with some details) should receive a content_score of 25 to 35 points out of 50 if relevant and well-written.
    - Long, detailed tweets (6+ sentences with specific insights or technical details) should receive a content_score of 35 to 50 points out of 50 if highly relevant and well-structured.
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
            1. reasoning: A brief explanation of your scoring rationale
            2. engagement_score: The portion of score based on engagement metrics (criterion 5, 0-50 points)
            3. content_score: The portion of score based on content quality (criteria 1-4, 0-50 points)
            
            Focus on accurately calculating content_score and engagement_score. Do NOT calculate the total score - that will be done automatically.
            
            Important Scoring Instructions:
            - When you see "assign X to Y points", you should choose a specific score within that range. For example, "assign 20 to 25 points" means you should pick a specific value like 21, 22, 23, etc.
            - Each criterion has its own maximum. 
            - Always use your judgment to determine where in each range a specific tweet falls.
            
            CONTENT LENGTH GUIDELINES:
            - Short, relevant tweets (1-2 sentences mentioning Nuwa AI) should receive a content_score of 15 to 25 points out of 50.
            - Medium-length tweets (3-5 sentences with some details) should receive a content_score of 25 to 35 points out of 50 if relevant and well-written.
            - Long, detailed tweets (6+ sentences with specific insights or technical details) should receive a content_score of 35 to 50 points out of 50 if highly relevant and well-structured.
            `
        });
        //finalize the score to ensure it falls within the expected range
        if (!scoreResult) {
            throw new Error("Failed to generate score object from AI model.");
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
        
        // The score is already calculated in the schema transform

        return scoreResult;

    } catch (error) {
        console.error("Error generating tweet score:", error);
        throw new Error(`Failed to get tweet score from AI model: ${error instanceof Error ? error.message : String(error)}`);
    }
} 
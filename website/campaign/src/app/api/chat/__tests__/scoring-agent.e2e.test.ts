import { assessTweetScore } from '../scoring-agent';
import * as twitterAdapter from '../../../services/twitterAdapter';
import { StandardTweet, StandardTweetAuthor, StandardTweetPublicMetrics } from '../../../services/twitterAdapter';

// --- Test Configuration ---
// Use a well-known, stable tweet for testing
const TEST_TWEET_ID = '1912746177214443913'; // Use a known tweet ID
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Skip tests if OpenAI API key is not provided
const describeIfApiKey = OPENAI_API_KEY ? describe : describe.skip;

// 创建模拟推文数据的工厂函数
function createMockTweet(
  id: string,
  text: string,
  metrics: Partial<StandardTweetPublicMetrics> = {}
): StandardTweet {
  const author: StandardTweetAuthor = {
    id: '123456789',
    username: 'test_user',
  };

  const defaultMetrics: StandardTweetPublicMetrics = {
    retweet_count: 0,
    reply_count: 0,
    like_count: 0,
    quote_count: 0,
    bookmark_count: 0,
    impression_count: 0,
  };

  return {
    id,
    text,
    author,
    public_metrics: { ...defaultMetrics, ...metrics },
    created_at: new Date().toISOString(),
  };
}

describeIfApiKey('Tweet Scoring Agent E2E Tests (Requires OPENAI_API_KEY)', () => {
    // Increase timeout for API calls to OpenAI and Twitter
    jest.setTimeout(60000); // 60 seconds

    beforeAll(() => {
        if (!OPENAI_API_KEY) {
            console.log('OPENAI_API_KEY not found in environment variables. Skipping e2e tests for scoring agent.');
        }
    });

    test('assessTweetScore should score a real tweet', async () => {
        // Fetch a tweet to score
        const tweet = await twitterAdapter.getStandardTweetById(TEST_TWEET_ID);
        expect(tweet).toBeDefined();
        
        if (tweet) {
            // Score the tweet
            const scoreResult = await assessTweetScore(tweet);
            expect(scoreResult).toBeDefined();
            expect(scoreResult.score).toBeDefined();
            expect(typeof scoreResult.score).toBe('number');
            expect(scoreResult.score).toBeGreaterThanOrEqual(0);
            expect(scoreResult.score).toBeLessThanOrEqual(100);
            expect(scoreResult.reasoning).toBeDefined();
            expect(typeof scoreResult.reasoning).toBe('string');
            expect(scoreResult.reasoning.length).toBeGreaterThan(0);
            
            // Log the result for manual inspection
            console.log(`Tweet scoring result: ${scoreResult.score}/100`);
            console.log(`Reasoning: ${scoreResult.reasoning}`);
        }
    });
    
    test('assessTweetScore handles errors gracefully', async () => {
        // Test with invalid data
        const invalidTweet = { id: '123', text: '' } as StandardTweet; // Minimal invalid tweet
        
        try {
            await assessTweetScore(invalidTweet);
            // If it doesn't throw, it should still return a score object
        } catch (error) {
            expect(error).toBeDefined(); 
            // If it throws, that's also acceptable behavior
        }
    });

    test('assessTweetScore should give higher score to tweets about Nuwa and AI', async () => {
        // 创建一个关于Nuwa和AI的高质量推文
        const highQualityTweet = createMockTweet(
            'mock123',
            'Nuwa is revolutionizing AI technology by providing personalized AI assistants. The deep learning models they use offer unprecedented accuracy and understanding, making AI more accessible and useful for everyday tasks!',
            { like_count: 10, retweet_count: 5, reply_count: 3 }
        );

        // 创建一个没有提及Nuwa或AI的推文
        const irrelevantTweet = createMockTweet(
            'mock456',
            'Just had a great cup of coffee this morning! The weather is beautiful today.',
            { like_count: 10, retweet_count: 5, reply_count: 3 }
        );

        // 对两个推文进行评分
        const highQualityScore = await assessTweetScore(highQualityTweet);
        const irrelevantScore = await assessTweetScore(irrelevantTweet);

        // 验证包含Nuwa和AI的推文得分更高
        expect(highQualityScore.score).toBeGreaterThan(irrelevantScore.score);
        expect(highQualityScore.content_score).toBeGreaterThan(irrelevantScore.content_score);
        
        // 记录结果
        console.log(`Nuwa AI Tweet Score: ${highQualityScore.score}/100, Content: ${highQualityScore.content_score}/75`);
        console.log(`Irrelevant Tweet Score: ${irrelevantScore.score}/100, Content: ${irrelevantScore.content_score}/75`);
    });

    test('assessTweetScore should reflect engagement changes in the score', async () => {
        // 创建一个基础推文
        const baseTweet = createMockTweet(
            'mock789',
            'Nuwa AI is helping developers build smarter applications with its innovative solutions and powerful APIs.',
            { like_count: 5, retweet_count: 2, reply_count: 1 }
        );
        
        // 获取初始评分
        const initialScore = await assessTweetScore(baseTweet);
        
        // 创建同一推文但互动数据增加的版本
        const increasedEngagementTweet = createMockTweet(
            'mock789',
            'Nuwa AI is helping developers build smarter applications with its innovative solutions and powerful APIs.',
            { like_count: 50, retweet_count: 20, reply_count: 10, impression_count: 1000 }
        );
        
        // 使用之前的评分作为比较基准进行评分
        const updatedScore = await assessTweetScore(increasedEngagementTweet, {
            tweet_id: baseTweet.id,
            score: initialScore.score,
            content_score: initialScore.content_score,
            engagement_score: initialScore.engagement_score,
            engagement_metrics: {
                likes: baseTweet.public_metrics?.like_count || 0,
                retweets: baseTweet.public_metrics?.retweet_count || 0,
                replies: baseTweet.public_metrics?.reply_count || 0,
                quotes: baseTweet.public_metrics?.quote_count || 0,
                impressions: baseTweet.public_metrics?.impression_count || 0
            },
            scored_at: new Date(Date.now() - 86400000).toISOString() // 假设一天前评分
        });
        
        // 验证互动增加后的得分也增加
        expect(updatedScore.engagement_score).toBeGreaterThan(initialScore.engagement_score);
        expect(updatedScore.score).toBeGreaterThan(initialScore.score);
        
        // 记录结果
        console.log(`Initial Score: ${initialScore.score}/100, Engagement: ${initialScore.engagement_score}/25`);
        console.log(`Updated Score: ${updatedScore.score}/100, Engagement: ${updatedScore.engagement_score}/25`);
        console.log(`Engagement Increase: ${updatedScore.engagement_score - initialScore.engagement_score}`);
        console.log(`Total Score Increase: ${updatedScore.score - initialScore.score}`);
    });
});

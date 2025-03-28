export const FEATURED_AGENTS = [
    'nuwa',
    'gollum',
] as const;

export const TRENDING_AGENTS = [
    'nuwa',
    'gollum',
] as const;

export type FeaturedAgent = typeof FEATURED_AGENTS[number];
export type TrendingAgent = typeof TRENDING_AGENTS[number]; 
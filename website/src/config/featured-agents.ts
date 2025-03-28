export const FEATURED_AGENTS = [
    'nuwa',
    'Gollum',
] as const;

export const TRENDING_AGENTS = [
    'nuwa',
    'Gollum',
] as const;

export type FeaturedAgent = typeof FEATURED_AGENTS[number];
export type TrendingAgent = typeof TRENDING_AGENTS[number]; 
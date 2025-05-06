import { createClient } from '@supabase/supabase-js';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { KnowledgeRecord } from './airtable';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Interface for the knowledge_embeddings table
interface KnowledgeEmbedding {
  id: string;
  airtable_id: string;
  title: string;
  content: string;
  description: string;
  embedding: number[];
  tags: string[];
  last_modified_time: string;
  created_at?: string;
  updated_at?: string;
}

// Extended interface including similarity field for search results
interface KnowledgeEmbeddingWithSimilarity extends Omit<KnowledgeEmbedding, 'embedding'> {
  similarity: number;
}

/**
 * Generate embedding vector for text content
 * @param text The text content to embed
 * @returns Embedding vector
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: text
    });

    return embedding;
  } catch (error) {
    console.error('Error generating embedding for text snippet:', text.slice(0, 50), 'Error:', error);
    throw error;
  }
}

/**
 * Create or update knowledge embedding
 * @param record Airtable knowledge record
 * @returns Returns true if successful, false if failed
 */
export async function upsertKnowledgeEmbedding(record: KnowledgeRecord): Promise<boolean> {
  try {
    if (!record.key || !record.content) {
      console.error('Missing required fields for embedding:', record.airtableId);
      return false;
    }

    // Prepare text content for embedding
    const textToEmbed = [
      record.title || '',
      record.description || '',
      record.content || '',
      record.tags?.join(' ') || '',
    ].filter(Boolean).join('\n\n');

    // Generate embedding vector
    const embedding = await generateEmbedding(textToEmbed);

    // Prepare record for database insertion
    const embeddingRecord: Omit<KnowledgeEmbedding, 'id' | 'created_at' | 'updated_at'> = {
      airtable_id: record.airtableId,
      title: record.title || '',
      content: record.content || '',
      description: record.description || '',
      embedding,
      tags: record.tags || [],
      last_modified_time: record.last_modified_time || new Date().toISOString(),
    };

    // Insert or update record
    const { error } = await supabase
      .from('knowledge_embeddings')
      .upsert(
        { 
          ...embeddingRecord,
          updated_at: new Date().toISOString(),
        },
        { 
          onConflict: 'airtable_id',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error('Error upserting knowledge embedding:', error);
      return false;
    }

    console.log(`Successfully upserted embedding for record: ${record.airtableId}`);
    return true;
  } catch (error) {
    console.error('Error in upsertKnowledgeEmbedding:', error);
    return false;
  }
}

/**
 * Search for relevant knowledge embeddings
 * @param query User query
 * @param limit Maximum number of results to return
 * @param similarityThreshold Minimum similarity threshold
 * @returns Array of relevant knowledge records
 */
export async function searchKnowledgeEmbeddings(
  query: string,
  limit: number = 3,
  similarityThreshold: number = 0.75
): Promise<KnowledgeEmbeddingWithSimilarity[]> {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    
    // Perform vector similarity search
    const { data, error } = await supabase
      .rpc('match_knowledge_embeddings', {
        query_embedding: queryEmbedding,
        match_threshold: similarityThreshold,
        match_count: limit
      });

    if (error) {
      console.error('Error searching knowledge embeddings:', error);
      return [];
    }

    // Transform and return results, excluding embedding field to reduce data volume
    return data.map((item: KnowledgeEmbeddingWithSimilarity) => ({
      id: item.id,
      airtable_id: item.airtable_id,
      title: item.title,
      content: item.content,
      description: item.description,
      tags: item.tags,
      last_modified_time: item.last_modified_time,
      created_at: item.created_at,
      updated_at: item.updated_at,
      similarity: item.similarity,
    }));
  } catch (error) {
    console.error('Error in searchKnowledgeEmbeddings:', error);
    return [];
  }
}

/**
 * Delete knowledge embedding
 * @param airtableId Airtable record ID
 * @returns Returns true if successful, false if failed
 */
export async function deleteKnowledgeEmbedding(airtableId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('knowledge_embeddings')
      .delete()
      .eq('airtable_id', airtableId);

    if (error) {
      console.error('Error deleting knowledge embedding:', error);
      return false;
    }

    console.log(`Successfully deleted embedding for record: ${airtableId}`);
    return true;
  } catch (error) {
    console.error('Error in deleteKnowledgeEmbedding:', error);
    return false;
  }
}

/**
 * Get embedding count
 * @returns Number of embedding records
 */
export async function getEmbeddingCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('knowledge_embeddings')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error getting embedding count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getEmbeddingCount:', error);
    return 0;
  }
} 
import { searchKnowledgeEmbeddings, enhancedSearchKnowledgeEmbeddings } from '../src/app/services/vectorStore';

/**
 * Test vector search functionality with various queries
 */
async function testVectorSearch() {
  console.log('=== Testing Vector Search Functionality ===');
  
  // Test queries - include both English and Chinese variants
  const queries = [
    // English queries
    { query: 'What is Prompt is law?', threshold: 0.75, limit: 3 },
    { query: 'Prompt is law', threshold: 0.75, limit: 3 },
    { query: 'Prompt is law', threshold: 0.3, limit: 3 }, // Lower threshold
    
    // Chinese queries
    { query: '什么是 Prompt is law?', threshold: 0.75, limit: 3 },
    { query: '什么是 Prompt is law?', threshold: 0.4, limit: 3 }, // Lower threshold
    { query: 'Prompt is law 是什么?', threshold: 0.4, limit: 3 },
    
    // Additional variations
    { query: 'prompt engineering', threshold: 0.6, limit: 3 },
    { query: '提示工程', threshold: 0.6, limit: 3 },
  ];
  
  // First test standard search
  console.log('\n🔍 STANDARD SEARCH TEST');
  // Run searches for each query
  for (const { query, threshold, limit } of queries) {
    console.log(`\n--- Testing query: "${query}" (threshold: ${threshold}) ---`);
    
    try {
      const results = await searchKnowledgeEmbeddings(query, limit, threshold);
      
      if (results.length === 0) {
        console.log(`❌ No results found for query: "${query}"`);
      } else {
        console.log(`✅ Found ${results.length} results:`);
        
        results.forEach((result, index) => {
          console.log(`\nResult #${index + 1} (similarity: ${(result.similarity * 100).toFixed(2)}%)`);
          console.log(`Title: ${result.title}`);
          console.log(`Description: ${result.description?.substring(0, 100)}...`);
          console.log(`Tags: ${result.tags?.join(', ') || 'none'}`);
          console.log(`ID: ${result.airtable_id}`);
        });
      }
    } catch (error) {
      console.error(`Error searching for query "${query}":`, error);
    }
  }
  
  // Then test enhanced search
  console.log('\n\n🔍 ENHANCED SEARCH TEST');
  // Test enhanced search with the same queries
  for (const { query, limit } of queries) {
    console.log(`\n--- Testing enhanced query: "${query}" ---`);
    
    try {
      const results = await enhancedSearchKnowledgeEmbeddings(query, limit);
      
      if (results.length === 0) {
        console.log(`❌ No results found for enhanced query: "${query}"`);
      } else {
        console.log(`✅ Found ${results.length} results:`);
        
        results.forEach((result, index) => {
          console.log(`\nResult #${index + 1} (similarity: ${(result.similarity * 100).toFixed(2)}%)`);
          console.log(`Title: ${result.title}`);
          console.log(`Description: ${result.description?.substring(0, 100)}...`);
          console.log(`Tags: ${result.tags?.join(', ') || 'none'}`);
          console.log(`ID: ${result.airtable_id}`);
        });
      }
    } catch (error) {
      console.error(`Error searching for enhanced query "${query}":`, error);
    }
  }
  
  console.log('\n=== Vector Search Testing Complete ===');
}

// Run the test
testVectorSearch()
  .then(() => {
    console.log('Testing completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Testing failed:', error);
    process.exit(1);
  }); 
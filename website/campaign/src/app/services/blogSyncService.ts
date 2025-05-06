import fs from 'fs';
import path from 'path';
import { upsertKnowledgeEmbedding, deleteKnowledgeEmbedding, getAllBlogRecords } from './vectorStore';
import matter from 'gray-matter';
import { glob } from 'glob';
import crypto from 'crypto';

// Blog record interface, compatible with KnowledgeRecord
interface BlogRecord {
  airtableId: string;  // Unique ID generated from file path
  key: string;         // File path as unique key
  title: string;
  content: string;
  description: string;
  last_modified_time: string;
  tags: string[];
}

/**
 * Generate a unique ID from file path
 * @param filePath File path
 * @returns MD5 hash-based unique ID
 */
function generateUniqueId(filePath: string): string {
  // Only use the filename, not the full path, to ensure the same ID in different environments
  const filename = path.basename(filePath);
  
  // Use the filename with a blog: prefix to generate a hash
  return crypto.createHash('md5').update(`blog:${filename}`).digest('hex');
}

/**
 * Parse MDX file content, extract frontmatter and content
 * @param filePath MDX file path
 * @returns Parsed blog record
 */
function parseMdxFile(filePath: string): BlogRecord | null {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    
    // Get file stats for last modified time
    const stats = fs.statSync(filePath);
    
    // Extract tags from frontmatter
    const tags = Array.isArray(data.tag) 
      ? data.tag 
      : (data.tag ? [data.tag] : []);
    
    return {
      airtableId: generateUniqueId(filePath),
      key: filePath,
      title: data.title || path.basename(filePath, path.extname(filePath)),
      content: content,
      description: data.excerpt || '',
      last_modified_time: stats.mtime.toISOString(),
      tags: tags,
    };
  } catch (error) {
    console.error(`Error parsing MDX file ${filePath}:`, error);
    return null;
  }
}

/**
 * Get all blog post file paths
 * @param contentDir Content directory path
 * @returns Array of blog post file paths
 */
function getBlogFilePaths(contentDir: string): string[] {
  const pattern = path.join(contentDir, '**/*.mdx');
  return glob.sync(pattern, { });
}

/**
 * Sync a single blog post to vector database
 * @param record Blog record
 * @returns Success status
 */
async function syncBlogRecord(record: BlogRecord): Promise<boolean> {
  try {
    const success = await upsertKnowledgeEmbedding(record);
    
    if (success) {
      console.log(`Successfully synced blog: ${record.title}`);
      return true;
    } else {
      console.error(`Failed to sync blog: ${record.title}`);
      return false;
    }
  } catch (error) {
    console.error(`Error syncing blog ${record.title}:`, error);
    return false;
  }
}

/**
 * Determines if a blog file needs to be synced based on its modification time
 * @param record Blog record 
 * @param existingRecords Map of existing record IDs to last_modified_time
 * @returns True if the record needs syncing
 */
function needsSync(record: BlogRecord, existingRecords: Map<string, string>): boolean {
  // If the record doesn't exist in the database, it needs to be synced
  if (!existingRecords.has(record.airtableId)) {
    console.log(`Blog "${record.title}" is new, needs sync (ID not found in database)`);
    return true;
  }
  
  // Compare modification times to see if the file has been updated
  const existingModTimeStr = existingRecords.get(record.airtableId) || '';
  const existingModTime = new Date(existingModTimeStr);
  const currentModTime = new Date(record.last_modified_time);
  
  // Format dates for logging
  const existingTimeFormatted = existingModTime.toISOString();
  const currentTimeFormatted = currentModTime.toISOString();
  
  // If the file has been modified after the stored version, it needs syncing
  const needsUpdate = currentModTime > existingModTime;
  
  console.log(`Blog "${record.title}" - DB time: ${existingTimeFormatted}, File time: ${currentTimeFormatted}, Needs update: ${needsUpdate}`);
  
  return needsUpdate;
}

/**
 * Sync all blog posts to vector database
 * @param contentDir Blog content directory
 * @param forceSync Force sync all files regardless of modification time
 * @returns Number of successfully synced posts
 */
export async function syncAllBlogPosts(
  contentDir: string = path.join(process.cwd(), 'website/landing/src/content/blog'),
  forceSync: boolean = false
): Promise<number> {
  try {
    const blogFilePaths = getBlogFilePaths(contentDir);
    console.log(`Found ${blogFilePaths.length} blog files to process`);
    
    if (blogFilePaths.length === 0) {
      return 0;
    }

    // Get existing records from the database for incremental sync
    let existingRecords = new Map<string, string>();
    if (!forceSync) {
      existingRecords = await getAllBlogRecords();
      console.log(`Retrieved ${existingRecords.size} existing knowledge records from database for comparison`);
    } else {
      console.log('Force sync enabled, skipping existing records check');
    }
    
    let successCount = 0;
    let skippedCount = 0;
    let totalCount = 0;

    for (const filePath of blogFilePaths) {
      totalCount++;
      const record = parseMdxFile(filePath);
      
      if (!record) {
        console.error(`Could not parse file: ${filePath}`);
        continue;
      }
      
      console.log(`Processing blog #${totalCount}: ${record.title} (ID: ${record.airtableId})`);
      
      // Check if this file needs to be synced
      if (forceSync || needsSync(record, existingRecords)) {
        const success = await syncBlogRecord(record);
        if (success) {
          successCount++;
        }
      } else {
        console.log(`Skipping unchanged blog: ${record.title}`);
        skippedCount++;
      }
    }

    console.log(`Sync summary: ${successCount} synced, ${skippedCount} skipped, ${totalCount} total blog posts`);
    return successCount;
  } catch (error) {
    console.error('Error in syncAllBlogPosts:', error);
    return 0;
  }
}

/**
 * Delete a blog post from vector database
 * @param filePath Blog file path
 * @returns Success status
 */
export async function deleteBlogPost(filePath: string): Promise<boolean> {
  try {
    const uniqueId = generateUniqueId(filePath);
    const success = await deleteKnowledgeEmbedding(uniqueId);
    
    if (success) {
      console.log(`Successfully deleted blog: ${filePath}`);
      return true;
    } else {
      console.error(`Failed to delete blog: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error deleting blog ${filePath}:`, error);
    return false;
  }
} 
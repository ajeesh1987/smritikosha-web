// /api/memory/generateReelData.js

/**
 * Fetches and constructs the visual flow for a given memory.
 * Each item in the flow includes signed image URL, caption, date, location, and tags.
 */

export async function getReelVisualFlow(memoryId, userId, supabase) {
    // Fetch associated images for the memory
    const { data: images, error } = await supabase
      .from('memory_images')
      .select('*')
      .eq('memory_id', memoryId)
      .eq('user_id', userId);
  
    if (error) {
      console.error('Error fetching memory images:', error);
      throw new Error('Failed to fetch memory images.');
    }
  
    // Map each image into a structured visual object
    const visualFlow = await Promise.all(
      images.map(async (img) => {
        const { data: signed, error: urlError } = await supabase.storage
          .from('memory-images')
          .createSignedUrl(img.image_path, 3600);
  
        if (urlError) {
          console.warn(`Failed to generate signed URL for ${img.image_path}`);
        }
  
        return {
          imageUrl: signed?.signedUrl || '',
          caption: img.description || '',
          date: img.capture_date || null,
          location: img.location || '',
          tags: img.tags?.split(/[, ]+/).filter(Boolean) || []
        };
      })
    );
  
    return visualFlow;
  }
  
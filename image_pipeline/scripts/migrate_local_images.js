const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Helper to load env variables from project root (.env.local)
function loadEnv() {
  const env = {};
  const envPath = path.join(__dirname, '..', '..', '.env.local');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        env[match[1]] = val;
      }
    });
  }
  return env;
}

async function run() {
  console.log("Starting local images migration to Supabase...");
  const env = loadEnv();
  const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const unusedPath = path.join(__dirname, '..', 'data', 'unused_images.json');
  const usedPath = path.join(__dirname, '..', 'data', 'used_images.json');
  
  let unusedImages = [];
  let usedImages = [];
  
  if (fs.existsSync(unusedPath)) {
    try {
      unusedImages = JSON.parse(fs.readFileSync(unusedPath, 'utf8'));
    } catch (e) {
      console.warn("Could not read unused_images.json:", e.message);
    }
  }
  
  if (fs.existsSync(usedPath)) {
    try {
      usedImages = JSON.parse(fs.readFileSync(usedPath, 'utf8'));
    } catch (e) {
      console.warn("Could not read used_images.json:", e.message);
    }
  }
  
  console.log(`Loaded ${unusedImages.length} unused images and ${usedImages.length} used images from local files.`);
  
  // Combine all images
  const allImagesMap = new Map();
  
  // Add unused images first
  unusedImages.forEach(img => {
    if (img.url && img.description) {
      allImagesMap.set(img.url, {
        url: img.url,
        description: img.description,
        words: img.words || [],
        is_used: false
      });
    }
  });
  
  // Add used images (will overwrite or add new)
  usedImages.forEach(img => {
    if (img.url && img.description) {
      allImagesMap.set(img.url, {
        url: img.url,
        description: img.description,
        words: img.words || [],
        is_used: true
      });
    }
  });
  
  const imagesToInsert = Array.from(allImagesMap.values());
  console.log(`Total unique images to migrate: ${imagesToInsert.length}`);
  
  if (imagesToInsert.length === 0) {
    console.log("No images found to migrate.");
    return;
  }
  
  // Insert in chunks of 50 to prevent huge payloads
  const chunkSize = 50;
  let successCount = 0;
  
  for (let i = 0; i < imagesToInsert.length; i += chunkSize) {
    const chunk = imagesToInsert.slice(i, i + chunkSize);
    console.log(`Migrating chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(imagesToInsert.length / chunkSize)} (${chunk.length} items)...`);
    
    // We can use upsert with onConflict: 'url', ignoreDuplicates: true
    const { error } = await supabase
      .from('toeic_images')
      .upsert(chunk, { onConflict: 'url', ignoreDuplicates: true });
      
    if (error) {
      console.error(`Error migrating chunk:`, error.message);
    } else {
      successCount += chunk.length;
    }
  }
  
  console.log(`Successfully migrated ${successCount}/${imagesToInsert.length} images to Supabase!`);
}

run();

const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, Table, TableCell, TableRow, ImageRun, WidthType } = require('docx');
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

// Helper to shuffle array
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Download image as Base64
async function downloadImageAsBase64(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

// Download image as Buffer
async function downloadImage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Upload Base64 to ImgBB
async function uploadToImgBB(base64Data, apiKey) {
  const rawBase64 = base64Data.split(',')[1];
  const body = new URLSearchParams();
  body.append('image', rawBase64);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: body
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ImgBB error ${response.status}: ${errText}`);
  }

  const resJson = await response.json();
  return resJson.data.url;
}

// Extract JSON blocks from text
function extractJsonBlocks(text) {
  let blocks = [];
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];
  } catch (e) {}

  const mdRegex = /```json\s*([\s\S]*?)\s*```/g;
  let match;
  while ((match = mdRegex.exec(text)) !== null) {
    try {
      const cleanJson = match[1].trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed)) blocks = blocks.concat(parsed);
      else if (parsed && typeof parsed === 'object') blocks.push(parsed);
    } catch (e) {
      console.warn("Found a code block but failed to parse it as JSON:", e.message);
    }
  }

  if (blocks.length === 0) {
    const curlyRegex = /\{[\s\S]*?\}/g;
    while ((match = curlyRegex.exec(text)) !== null) {
      try {
        const cleanJson = match[0].trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          blocks.push(parsed);
        }
      } catch (e) {}
    }
  }
  return blocks;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ACTION: UPLOAD
async function runUpload() {
  const env = loadEnv();
  const imgbbApiKey = env['IMGBB_API_KEY'];
  if (!imgbbApiKey) {
    console.error('Missing IMGBB_API_KEY in .env.local. Please add it first.');
    process.exit(1);
  }

  const rawTextPath = path.join(__dirname, '..', 'workspace', 'raw_images.txt');
  const imgbbTextPath = path.join(__dirname, '..', 'workspace', 'imgbb_links.txt');

  if (!fs.existsSync(rawTextPath)) {
    fs.mkdirSync(path.dirname(rawTextPath), { recursive: true });
    fs.writeFileSync(rawTextPath, "https://example.com/raw-image-1.jpg\n");
    console.log(`Created template 'raw_images.txt' in workspace folder. Please add your raw URLs line-by-line and run again.`);
    return;
  }

  const rawContent = fs.readFileSync(rawTextPath, 'utf8');
  const rawList = rawContent.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('http'));

  if (rawList.length === 0) {
    console.log("No new raw image URLs found in 'raw_images.txt'. Please add URLs first.");
    return;
  }

  console.log(`Loaded ${rawList.length} raw image URLs from 'raw_images.txt'. Shuffling...`);
  const shuffledUrls = shuffle(rawList);

  console.log(`Starting ImgBB upload...`);
  const imgbbUrls = [];
  let successCount = 0;

  for (let i = 0; i < shuffledUrls.length; i++) {
    const url = shuffledUrls[i];
    if (url.startsWith('https://i.ibb.co/') || url.startsWith('https://ibb.co/')) {
      console.log(`[${i + 1}/${shuffledUrls.length}] Skipping - Already on ImgBB: ${url}`);
      imgbbUrls.push(url);
      continue;
    }

    console.log(`[${i + 1}/${shuffledUrls.length}] Processing: ${url.substring(0, 60)}...`);
    try {
      const base64Data = await downloadImageAsBase64(url);
      const imgbbUrl = await uploadToImgBB(base64Data, imgbbApiKey);
      console.log(`  -> Uploaded: ${imgbbUrl}`);
      imgbbUrls.push(imgbbUrl);
      successCount++;
      fs.mkdirSync(path.dirname(imgbbTextPath), { recursive: true });
      fs.appendFileSync(imgbbTextPath, imgbbUrl + '\n');
    } catch (err) {
      console.error(`  -> Failed:`, err.message);
    }
    await sleep(1000);
  }

  fs.writeFileSync(rawTextPath, "");
  console.log(`\n--- Completed! Uploaded ${successCount} new images. Links appended to ${imgbbTextPath} ---`);
}

// ACTION: DOCX
async function runDocx() {
  const imgbbPath = path.join(__dirname, '..', 'workspace', 'imgbb_links.txt');
  const docxOutputPath = path.join(__dirname, '..', 'workspace', 'toeic_images_sheet_all.docx');

  if (!fs.existsSync(imgbbPath)) {
    console.error("Missing imgbb_links.txt in workspace folder.");
    return;
  }

  const links = fs.readFileSync(imgbbPath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));

  if (links.length === 0) {
    console.log("No links found in 'imgbb_links.txt' to process.");
    return;
  }

  console.log(`Starting generation of Word Document with ${links.length} embedded images...`);

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "Image URL", bold: true })] })],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "Image Preview", bold: true })] })],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "Description JSON", bold: true })] })],
        }),
      ],
    })
  ];

  for (let i = 0; i < links.length; i++) {
    const url = links[i];
    console.log(`[${i + 1}/${links.length}] Downloading: ${url}`);
    try {
      const imageBuffer = await downloadImage(url);
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: url })] }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imageBuffer,
                      transformation: { width: 200, height: 150 },
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({ children: [new Paragraph({ text: "" })] }),
          ],
        })
      );
      console.log(`  -> Added to table.`);
    } catch (err) {
      console.error(`  -> Failed to add image:`, err.message);
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: url })] }),
            new TableCell({ children: [new Paragraph({ text: `Failed: ${err.message}` })] }),
            new TableCell({ children: [new Paragraph({ text: "" })] }),
          ],
        })
      );
    }
    await sleep(200);
  }

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: "TOEIC Images Bulk Analysis Sheet", heading: "Title", spacing: { after: 200 } }),
        new Paragraph({ text: "Hãy đọc bảng và phân tích toàn bộ hình ảnh dưới đây, trả về một danh sách JSON duy nhất chứa mô tả của tất cả các ảnh.", spacing: { after: 400 } }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
      ],
    }],
  });

  console.log("Generating DOCX file...");
  const buffer = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(docxOutputPath), { recursive: true });
  fs.writeFileSync(docxOutputPath, buffer);
  console.log(`\n--- Completed! Created Word Document at ${docxOutputPath} ---`);
}

// ACTION: PARSE
async function runParse() {
  const pasteFile = path.join(__dirname, '..', 'workspace', 'paste_ai_here.txt');

  if (!fs.existsSync(pasteFile)) {
    fs.mkdirSync(path.dirname(pasteFile), { recursive: true });
    fs.writeFileSync(pasteFile, "Hãy dán kết quả copy từ AI Web Chat vào đây rồi chạy lệnh 'node image_pipeline/scripts/pipeline_cli.js parse'\n");
    console.log("Created 'paste_ai_here.txt' in workspace folder. Please paste your AI chat results there.");
    return;
  }

  const content = fs.readFileSync(pasteFile, 'utf8').trim();
  if (!content || content.includes("Hãy dán kết quả copy từ AI Web Chat")) {
    console.log("File 'paste_ai_here.txt' is empty. Please paste the AI Web Chat response first.");
    return;
  }

  const newBlocks = extractJsonBlocks(content);
  if (newBlocks.length === 0) {
    console.error("Could not find any valid JSON blocks in 'paste_ai_here.txt'.");
    return;
  }

  const env = loadEnv();
  const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase connection credentials in .env.local");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Connecting to Supabase to fetch existing image URLs...");
  const { data: existing, error: fetchErr } = await supabase
    .from('toeic_images')
    .select('url');

  if (fetchErr) {
    console.error("Failed to query existing images from Supabase:", fetchErr.message);
    return;
  }

  const existingUrls = new Set(existing?.map(x => x.url) || []);
  const toInsert = [];
  let addedCount = 0;

  newBlocks.forEach(block => {
    if (block.url && block.description) {
      if (!existingUrls.has(block.url)) {
        toInsert.push({
          url: block.url,
          description: block.description,
          words: block.words || [],
          is_used: false
        });
        addedCount++;
      }
    }
  });

  if (toInsert.length > 0) {
    console.log(`Inserting ${toInsert.length} new images into database...`);
    const { error: insErr } = await supabase
      .from('toeic_images')
      .insert(toInsert);

    if (insErr) {
      console.error("Failed to save new images to database:", insErr.message);
      return;
    }
  } else {
    console.log("No new unique images to insert (all parsed URLs already exist).");
  }

  const imgbbFile = path.join(__dirname, '..', 'workspace', 'imgbb_links.txt');
  if (fs.existsSync(imgbbFile)) {
    const imgbbContent = fs.readFileSync(imgbbFile, 'utf8');
    const imgbbLines = imgbbContent.split('\n').map(line => line.trim()).filter(Boolean);
    const insertedUrls = new Set(toInsert.map(x => x.url));
    const remainingLines = imgbbLines.filter(line => !insertedUrls.has(line));
    fs.writeFileSync(imgbbFile, remainingLines.join('\n') + (remainingLines.length > 0 ? '\n' : ''));
  }

  fs.writeFileSync(pasteFile, "");
  console.log(`\n--- Success! Extracted and saved ${addedCount} described images to Supabase toeic_images table ---`);
}

// CLI Routing
const action = process.argv[2];
if (action === 'upload') {
  runUpload();
} else if (action === 'docx') {
  runDocx();
} else if (action === 'parse') {
  runParse();
} else {
  console.log(`Usage: node image_pipeline/scripts/pipeline_cli.js [action]`);
  console.log(`Available actions:`);
  console.log(`  upload   : Read raw_images.txt, upload to ImgBB and update imgbb_links.txt`);
  console.log(`  docx     : Load imgbb_links.txt and generate toeic_images_sheet_all.docx`);
  console.log(`  parse    : Parse paste_ai_here.txt and merge into data/unused_images.json`);
}

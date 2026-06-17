import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, ImageRun, WidthType } from 'docx';

// Helper to shuffle list of URLs
function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Download image as Base64 helper
async function downloadImageAsBase64(url: string): Promise<string> {
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

// Upload Base64 to ImgBB helper
async function uploadToImgBB(base64Data: string, imgbbApiKey: string): Promise<string> {
  const rawBase64 = base64Data.split(',')[1];
  const body = new URLSearchParams();
  body.append('image', rawBase64);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
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

// Helper to detect image format by magic numbers
function getBufferImageType(buffer: Buffer): 'jpg' | 'png' | 'gif' | 'bmp' | 'webp' | null {
  if (buffer.length < 4) return null;
  
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'png';
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'jpg';
  }
  // GIF: 47 49 46 (GIF87a / GIF89a)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'gif';
  }
  // BMP: 42 4D
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
    return 'bmp';
  }
  // WEBP: RIFF .... WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'webp';
    }
  }
  return null;
}

// Download image helper for docx
async function downloadImage(url: string): Promise<Buffer> {
  // 1. Try downloading directly first to detect format
  let response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }
  let arrayBuffer = await response.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);
  
  let format = getBufferImageType(buffer);
  if (!format) {
    throw new Error('Not a valid image format (corrupted data or HTML error page)');
  }
  
  // 2. If it is WebP, download again through proxy to convert to JPEG
  if (format === 'webp') {
    const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=jpg`;
    response = await fetch(proxiedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to convert WebP to JPG: HTTP error ${response.status}`);
    }
    arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    format = getBufferImageType(buffer);
    if (format !== 'jpg') {
      throw new Error('Failed to convert WebP to JPG format');
    }
  }
  return buffer;
}





export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const isAdmin = user?.user_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const unusedPath = path.join(process.cwd(), 'image_pipeline', 'data', 'unused_images.json');
    let totalUnused = 0;
    if (fs.existsSync(unusedPath)) {
      try {
        const unusedImages = JSON.parse(fs.readFileSync(unusedPath, 'utf8'));
        totalUnused = Array.isArray(unusedImages) ? unusedImages.length : 0;
      } catch (e) {
        totalUnused = 0;
      }
    }

    return NextResponse.json({ totalUnused });
  } catch (error: any) {
    console.error('Server error in pipeline GET endpoint:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate Request using User Session JWT (Admin Gate)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const isAdmin = user?.user_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Parse request payload
    const body = await req.json();
    const { action } = body;

    const unusedPath = path.join(process.cwd(), 'image_pipeline', 'data', 'unused_images.json');
    const usedPath = path.join(process.cwd(), 'image_pipeline', 'data', 'used_images.json');

    // Action: upload_imgbb
    if (action === 'upload_imgbb') {
      const { urls } = body;
      if (!urls || !Array.isArray(urls)) {
        return NextResponse.json({ error: 'Invalid payload: urls is required' }, { status: 400 });
      }

      const imgbbApiKey = process.env.IMGBB_API_KEY;
      if (!imgbbApiKey) {
        return NextResponse.json({ error: 'Server error: IMGBB_API_KEY is not configured on server' }, { status: 500 });
      }

      const uploadResults: { originalUrl: string; imgbbUrl?: string; error?: string }[] = [];

      for (const url of urls) {
        if (!url || typeof url !== 'string') continue;
        if (url.startsWith('https://i.ibb.co/') || url.startsWith('https://ibb.co/')) {
          uploadResults.push({ originalUrl: url, imgbbUrl: url });
          continue;
        }

        try {
          const base64Data = await downloadImageAsBase64(url);
          const imgbbUrl = await uploadToImgBB(base64Data, imgbbApiKey);
          uploadResults.push({ originalUrl: url, imgbbUrl });
        } catch (err: any) {
          uploadResults.push({ originalUrl: url, error: err.message || 'Upload failed' });
        }
      }

      return NextResponse.json({ results: uploadResults });
    }

    // Action: create_docx
    if (action === 'create_docx') {
      const { urls } = body;
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ error: 'Invalid payload: non-empty urls is required' }, { status: 400 });
      }

      // Shuffle the URLs first to distribute topics
      const shuffledUrls = shuffle(urls);

      const tableRows = [
        // Header Row
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

      for (let i = 0; i < shuffledUrls.length; i++) {
        const url = shuffledUrls[i];
        try {
          const imageBuffer = await downloadImage(url);
          tableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: url })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new ImageRun({
                          data: imageBuffer,
                          transformation: {
                            width: 200,
                            height: 150,
                          },
                        } as any),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  children: [new Paragraph({ text: "" })],
                }),
              ],
            })
          );
        } catch (err: any) {
          tableRows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: url })] }),
                new TableCell({ children: [new Paragraph({ text: `Failed to load image: ${err.message}` })] }),
                new TableCell({ children: [new Paragraph({ text: "" })] }),
              ],
            })
          );
        }
      }

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              text: "TOEIC Images Bulk Analysis Sheet",
              heading: "Title",
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: "Hãy đọc bảng và phân tích toàn bộ hình ảnh dưới đây, trả về một danh sách JSON duy nhất chứa mô tả của tất cả các ảnh.",
              spacing: { after: 400 }
            }),
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: tableRows,
            }),
          ],
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': 'attachment; filename="toeic_images_sheet.docx"',
        },
      });
    }

    // Action: import_gemini_descriptions
    if (action === 'import_gemini_descriptions') {
      const { descriptions } = body;
      if (!descriptions || !Array.isArray(descriptions)) {
        return NextResponse.json({ error: 'Invalid payload: descriptions array is required' }, { status: 400 });
      }

      let unusedImages: any[] = [];
      let usedImages: any[] = [];

      if (fs.existsSync(unusedPath)) {
        try {
          unusedImages = JSON.parse(fs.readFileSync(unusedPath, 'utf8'));
        } catch (e) {
          unusedImages = [];
        }
      }
      if (fs.existsSync(usedPath)) {
        try {
          usedImages = JSON.parse(fs.readFileSync(usedPath, 'utf8'));
        } catch (e) {
          usedImages = [];
        }
      }

      const importedList: any[] = [];
      let duplicatesSkipped = 0;

      for (const item of descriptions) {
        if (!item.url || !item.description) continue;
        const existsInUnused = unusedImages.some((img: any) => img.url === item.url);
        const existsInUsed = usedImages.some((img: any) => img.url === item.url);
        
        if (!existsInUnused && !existsInUsed) {
          const newItem = {
            url: item.url,
            description: item.description,
            words: item.words || []
          };
          unusedImages.push(newItem);
          importedList.push(newItem);
        } else {
          duplicatesSkipped++;
        }
      }

      if (importedList.length > 0) {
        fs.mkdirSync(path.dirname(unusedPath), { recursive: true });
        fs.writeFileSync(unusedPath, JSON.stringify(unusedImages, null, 2));
      }

      return NextResponse.json({
        success: true,
        importedCount: importedList.length,
        duplicatesSkipped,
        totalUnused: unusedImages.length
      });
    }

    // Action: auto_fill_missing
    if (action === 'auto_fill_missing') {

      let unusedImages: any[] = [];
      let usedImages: any[] = [];

      if (fs.existsSync(unusedPath)) {
        try {
          unusedImages = JSON.parse(fs.readFileSync(unusedPath, 'utf8'));
        } catch (e) {
          unusedImages = [];
        }
      }
      if (fs.existsSync(usedPath)) {
        try {
          usedImages = JSON.parse(fs.readFileSync(usedPath, 'utf8'));
        } catch (e) {
          usedImages = [];
        }
      }

      if (unusedImages.length === 0) {
        return NextResponse.json({ error: 'Kho ảnh (unused_images.json) trống. Vui lòng nạp thêm ảnh trước.' }, { status: 400 });
      }

      const drawUnusedImage = (skillType: 'speaking' | 'writing') => {
        if (unusedImages.length === 0) return null;
        let pool = unusedImages;
        if (skillType === 'writing') {
          pool = unusedImages.filter((img) => img.words && img.words.length > 0);
          if (pool.length === 0) pool = unusedImages;
        }
        const idx = Math.floor(Math.random() * pool.length);
        const selected = pool[idx];
        
        // Remove from unused
        const mainIdx = unusedImages.findIndex((img) => img.url === selected.url);
        if (mainIdx !== -1) {
          unusedImages.splice(mainIdx, 1);
        }
        
        // Add to used
        const existsInUsed = usedImages.some(img => img.url === selected.url);
        if (!existsInUsed) {
          usedImages.push(selected);
        }
        
        return selected;
      };

      // Fetch all custom tests from Supabase using bypass token auth client
      const { data: tests, error: fetchErr } = await supabase.from('custom_tests').select('*');
      if (fetchErr) {
        return NextResponse.json({ error: `Lỗi tải đề thi từ database: ${fetchErr.message}` }, { status: 500 });
      }

      let totalUpdatedTests = 0;
      const updatedDetails: string[] = [];

      for (const test of tests) {
        let speakingData = test.speaking_data;
        let writingData = test.writing_data;
        let modified = false;

        if (speakingData && typeof speakingData === 'string') {
          try { speakingData = JSON.parse(speakingData); } catch (e) {}
        }
        if (writingData && typeof writingData === 'string') {
          try { writingData = JSON.parse(writingData); } catch (e) {}
        }

        // Speaking Part 2
        if (speakingData && Array.isArray(speakingData)) {
          for (const part of speakingData) {
            if (part.part === 2 && Array.isArray(part.questions)) {
              for (const q of part.questions) {
                const hasNoImg = !q.image || q.image.trim() === '' || q.image.includes('placeholder');
                if (hasNoImg) {
                  const drawn = drawUnusedImage('speaking');
                  if (drawn) {
                    q.image = drawn.url;
                    q.description = drawn.description;
                    q.sampleAnswer = drawn.description;
                    modified = true;
                  }
                }
              }
            }
          }
        }

        // Writing Part 1
        if (writingData && Array.isArray(writingData)) {
          for (const part of writingData) {
            if (part.part === 1 && Array.isArray(part.questions)) {
              for (const q of part.questions) {
                const hasNoImg = !q.image || q.image.trim() === '' || q.image.includes('placeholder');
                if (hasNoImg) {
                  const drawn = drawUnusedImage('writing');
                  if (drawn) {
                    q.image = drawn.url;
                    q.description = drawn.description;
                    q.words = drawn.words || [];
                    q.sampleAnswer = drawn.description;
                    modified = true;
                  }
                }
              }
            }
          }
        }

        if (modified) {
          const { error: updErr } = await supabase
            .from('custom_tests')
            .update({
              speaking_data: speakingData,
              writing_data: writingData
            })
            .eq('id', test.id);

          if (updErr) {
            console.error(`Failed to update test ${test.id}:`, updErr.message);
          } else {
            totalUpdatedTests++;
            updatedDetails.push(test.title || test.id);
          }
        }
      }

      if (totalUpdatedTests > 0) {
        fs.writeFileSync(unusedPath, JSON.stringify(unusedImages, null, 2));
        fs.writeFileSync(usedPath, JSON.stringify(usedImages, null, 2));
      }

      return NextResponse.json({
        success: true,
        updatedCount: totalUpdatedTests,
        updatedDetails,
        remainingUnused: unusedImages.length
      });
    }

    return NextResponse.json({ error: 'Action not found' }, { status: 400 });

  } catch (error: any) {
    console.error('Server error in pipeline api:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

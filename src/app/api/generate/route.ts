import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Helper to generate sample answer from description (text-only call, cheap and reliable)
async function generateSampleAnswerFromDescription(
  description: string,
  questionType: 'describe_picture' | 'write_sentence_picture',
  words: string[],
  apiKey: string,
  baseUrl: string
): Promise<string> {
  const prompt = questionType === 'write_sentence_picture'
    ? `You are a professional TOEIC Writing designer.
Based on this image description: "${description}"
Write ONE high-scoring sample sentence in English that contains BOTH of these words: ${JSON.stringify(words)}.
Ensure the sentence is grammatically correct and logically describes the scene.
Return ONLY the raw sample sentence. No explanations, no JSON wrapping, no quotes.`
    : `You are a professional TOEIC Speaking coach.
Based on this image description: "${description}"
Write a high-scoring spoken description of the image in English suitable for a 45-second TOEIC Speaking Part 2 response (around 60-80 words).
Return ONLY the raw spoken description. No explanations, no JSON wrapping, no quotes.`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Failed text API call`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error("Failed to generate sample answer from description:", error);
    return questionType === 'write_sentence_picture'
      ? `A sample sentence using ${words.join(' and ')}.`
      : `Based on the picture, ${description}`;
  }
}

async function analyzeImage(
  imageUrl: string,
  questionType: 'describe_picture' | 'write_sentence_picture',
  apiKey: string,
  baseUrl: string
): Promise<{ words?: string[]; description: string; sampleAnswer: string }> {
  const systemPrompt = `You are a professional TOEIC test content designer.
Your task is to analyze the provided image and generate metadata for a TOEIC exam question.

Return ONLY a valid JSON object. Do not include any markdown wrapping like \`\`\`json or \`\`\` around the JSON code, just the raw JSON text.

JSON Schema:
${questionType === 'write_sentence_picture' 
  ? `{
      "words": ["noun_or_verb_1", "noun_or_verb_2"], // Exactly 2 simple lowercase English words/phrases clearly visible and relevant to the image, suitable for a TOEIC Writing Part 1 question (e.g. one noun and one verb, or a preposition and a noun, etc., which the candidate must use in one sentence to describe the image).
      "description": "[A detailed description of the image in English]",
      "sampleAnswer": "[A high-scoring sample sentence in English using both words that describes the image]"
    }`
  : `{
      "description": "[A detailed description of the image in English]",
      "sampleAnswer": "[A high-scoring spoken description of the image in English, suitable for a 45-second TOEIC Speaking Part 2 response]"
    }`
}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image for a TOEIC ${questionType === 'write_sentence_picture' ? 'Writing Part 1' : 'Speaking Part 2'} question.`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to analyze image: ${errorText}`);
  }

  const data = await response.json();
  let textResponse = data.choices?.[0]?.message?.content || '';
  textResponse = textResponse.trim();
  if (textResponse.startsWith('```')) {
    textResponse = textResponse.replace(/^```(json)?/, '');
    textResponse = textResponse.replace(/```$/, '');
    textResponse = textResponse.trim();
  }

  return JSON.parse(textResponse);
}

async function syncTestImages(parsedTest: any, apiKey: string, baseUrl: string): Promise<any> {
  const unusedPath = path.join(process.cwd(), 'image_pipeline', 'data', 'unused_images.json');
  const usedPath = path.join(process.cwd(), 'image_pipeline', 'data', 'used_images.json');
  const fallbackPath = path.join(process.cwd(), 'image_pipeline', 'data', 'images_to_process.json');

  let unusedImages: any[] = [];
  let usedImages: any[] = [];

  // Read unused images
  if (fs.existsSync(unusedPath)) {
    try {
      unusedImages = JSON.parse(fs.readFileSync(unusedPath, 'utf8'));
    } catch (err) {
      console.error("Failed to read unused_images.json:", err);
    }
  } else if (fs.existsSync(fallbackPath)) {
    // Fallback to images_to_process.json if unused_images.json doesn't exist yet
    try {
      unusedImages = JSON.parse(fs.readFileSync(fallbackPath, 'utf8')).filter(
        (img: any) => img.url && img.description && img.description.trim() !== ""
      );
    } catch (err) {
      console.error("Failed to read fallback images_to_process.json:", err);
    }
  }

  // Read used images
  if (fs.existsSync(usedPath)) {
    try {
      usedImages = JSON.parse(fs.readFileSync(usedPath, 'utf8'));
    } catch (err) {
      console.error("Failed to read used_images.json:", err);
    }
  }

  const drawnImagesForThisSession: any[] = [];

  // Helper to draw an image and move it from unused to used
  const drawUnusedImage = (skillType: 'speaking' | 'writing') => {
    if (unusedImages.length === 0) return null;
    let pool = unusedImages;
    if (skillType === 'writing') {
      pool = unusedImages.filter((img: any) => img.words && img.words.length > 0);
      if (pool.length === 0) pool = unusedImages;
    }
    const idx = Math.floor(Math.random() * pool.length);
    const selected = pool[idx];
    
    // Remove from unused list
    const mainIdx = unusedImages.findIndex((img: any) => img.url === selected.url);
    if (mainIdx !== -1) {
      unusedImages.splice(mainIdx, 1);
    }
    
    drawnImagesForThisSession.push(selected);
    return selected;
  };

  // Collect all Speaking Part 2 image questions
  if (parsedTest.speaking) {
    const imageQuestions: any[] = [];
    parsedTest.speaking.forEach((part: any) => {
      if (part.part === 2 && part.questions) {
        part.questions.forEach((q: any) => {
          imageQuestions.push(q);
        });
      }
    });

    if (imageQuestions.length > 0) {
      await Promise.all(
        imageQuestions.map(async (q) => {
          // If image is empty, grab from pool
          if (!q.image || q.image.trim() === '') {
            const drawn = drawUnusedImage('speaking');
            if (drawn) {
              q.image = drawn.url;
              q.description = drawn.description;
              q.sampleAnswer = await generateSampleAnswerFromDescription(drawn.description, 'describe_picture', [], apiKey, baseUrl);
            } else {
              q.description = q.description || '';
              q.sampleAnswer = q.sampleAnswer || '';
            }
            return;
          }
          // Vision AI fallback for manually provided image URL
          try {
            const analysis = await analyzeImage(q.image, 'describe_picture', apiKey, baseUrl);
            q.description = analysis.description || '';
            q.sampleAnswer = analysis.sampleAnswer || '';
          } catch (error) {
            console.error(`Failed to analyze speaking image ${q.image}:`, error);
            q.description = q.description || "A scene showing people or objects in a workspace or public setting.";
            q.sampleAnswer = q.sampleAnswer || "In this picture, there are people gathered...";
          }
        })
      );
    }
  }

  // Collect all Writing Part 1 image questions
  if (parsedTest.writing) {
    const imageQuestions: any[] = [];
    parsedTest.writing.forEach((part: any) => {
      if (part.part === 1 && part.questions) {
        part.questions.forEach((q: any) => {
          imageQuestions.push(q);
        });
      }
    });

    if (imageQuestions.length > 0) {
      await Promise.all(
        imageQuestions.map(async (q) => {
          // If image is empty, grab from pool
          if (!q.image || q.image.trim() === '') {
            const drawn = drawUnusedImage('writing');
            if (drawn) {
              q.image = drawn.url;
              q.description = drawn.description;
              q.words = drawn.words || [];
              q.sampleAnswer = await generateSampleAnswerFromDescription(drawn.description, 'write_sentence_picture', drawn.words || [], apiKey, baseUrl);
            } else {
              q.words = q.words || [];
              q.description = q.description || '';
              q.sampleAnswer = q.sampleAnswer || '';
            }
            return;
          }
          // Vision AI fallback for manually provided image URL
          try {
            const analysis = await analyzeImage(q.image, 'write_sentence_picture', apiKey, baseUrl);
            q.words = analysis.words || ["people", "work"];
            q.description = analysis.description || '';
            q.sampleAnswer = analysis.sampleAnswer || '';
          } catch (error) {
            console.error(`Failed to analyze writing image ${q.image}:`, error);
            q.words = q.words && q.words.length > 0 ? q.words : ["people", "work"];
            q.description = q.description || "A workplace scene with people working.";
            q.sampleAnswer = q.sampleAnswer || "The people are working together at their desks.";
          }
        })
      );
    }
  }

  // Write changes back to disk
  if (drawnImagesForThisSession.length > 0) {
    usedImages.push(...drawnImagesForThisSession);
    try {
      fs.writeFileSync(unusedPath, JSON.stringify(unusedImages, null, 2));
      fs.writeFileSync(usedPath, JSON.stringify(usedImages, null, 2));
      console.log(`Successfully moved ${drawnImagesForThisSession.length} images from unused to used.`);
    } catch (err) {
      console.error("Failed to update unused/used image files:", err);
    }
  }

  return parsedTest;
}

async function generateSingleTest(
  skill: 'speaking' | 'writing',
  topics: string,
  apiKey: string,
  baseUrl: string
): Promise<any> {
  const systemPrompt = `You are a professional TOEIC test designer.
Your task is to generate a high-quality TOEIC ${skill === 'speaking' ? 'Speaking' : 'Writing'} test in JSON format.
The generated questions must strictly adhere to the official TOEIC S&W structure. All prompts, questions, reading texts, and tables must be in ENGLISH.

Important:
1. Return ONLY a valid JSON object. Do not include any markdown wrapping like \`\`\`json or \`\`\` around the JSON code, just the raw JSON text.
2. For image fields in speaking Q3-4 or writing Q1-5, leave the "image" field as an empty string "" and for writing Q1-5 leave the "words" field as an empty array [] (we will automatically inject high-quality curated images and generate matching keywords/descriptions on the server side using Vision AI).

JSON Schema to follow:
For '${skill}':
${skill === 'speaking' ? `{
  "id": "toeic_speaking_test_unique_id",
  "title": "TOEIC Speaking Test - [Title]",
  "speaking": [
    {
      "part": 1,
      "partTitle": "Part 1: Read a Text Aloud",
      "instructions": "In this part of the test, you will read aloud the text on the screen...",
      "questions": [
        { "id": "sp_q1", "type": "read_aloud", "text": "[80-word paragraph]", "prepTime": 45, "respTime": 45 },
        { "id": "sp_q2", "type": "read_aloud", "text": "[80-word paragraph]", "prepTime": 45, "respTime": 45 }
      ]
    },
    {
      "part": 2,
      "partTitle": "Part 2: Describe a Picture",
      "instructions": "In this part of the test, you will describe the picture on your screen...",
      "questions": [
        { "id": "sp_q3", "type": "describe_picture", "image": "", "prepTime": 45, "respTime": 45 },
        { "id": "sp_q4", "type": "describe_picture", "image": "", "prepTime": 45, "respTime": 45 }
      ]
    },
    {
      "part": 3,
      "partTitle": "Part 3: Respond to Questions",
      "instructions": "In this part of the test, you will answer three questions...",
      "questions": [
        { "id": "sp_q5", "type": "respond_to_questions", "text": "Question 5 text", "prepTime": 0, "respTime": 15 },
        { "id": "sp_q6", "type": "respond_to_questions", "text": "Question 6 text", "prepTime": 0, "respTime": 15 },
        { "id": "sp_q7", "type": "respond_to_questions", "text": "Question 7 text", "prepTime": 0, "respTime": 30 }
      ]
    },
    {
      "part": 4,
      "partTitle": "Part 4: Respond to Questions Using Information Provided",
      "instructions": "In this part of the test, you will answer three questions based on the schedule or information...",
      "referenceInfo": "[A clean text-based schedule or agenda with dates, locations, sessions, times, and speakers]",
      "questions": [
        { "id": "sp_q8", "type": "respond_using_info", "text": "Question 8 text (usually about date/time of first session)", "prepTime": 0, "respTime": 15 },
        { "id": "sp_q9", "type": "respond_using_info", "text": "Question 9 text (usually checking a misconception - 'I heard X is at time Y, is that right?')", "prepTime": 0, "respTime": 15 },
        { "id": "sp_q10", "type": "respond_using_info", "text": "Question 10 text (usually asking for all sessions related to a person or topic)", "prepTime": 0, "respTime": 30 }
      ]
    },
    {
      "part": 5,
      "partTitle": "Part 5: Express an Opinion",
      "instructions": "In this part of the test, you will give your opinion about a specific topic...",
      "questions": [
        { "id": "sp_q11", "type": "express_opinion", "text": "Opinion prompt statement", "prepTime": 45, "respTime": 60 }
      ]
    }
  ]
}` : `{
  "id": "toeic_writing_test_unique_id",
  "title": "TOEIC Writing Test - [Title]",
  "writing": [
    {
      "part": 1,
      "partTitle": "Part 1: Write a Sentence Based on a Picture",
      "instructions": "In this part of the test, you will write ONE sentence that is based on the picture...",
      "questions": [
        { "id": "wr_q1", "type": "write_sentence_picture", "image": "", "words": [], "prepTime": 0, "respTime": 480 },
        { "id": "wr_q2", "type": "write_sentence_picture", "image": "", "words": [], "prepTime": 0, "respTime": 480 },
        { "id": "wr_q3", "type": "write_sentence_picture", "image": "", "words": [], "prepTime": 0, "respTime": 480 },
        { "id": "wr_q4", "type": "write_sentence_picture", "image": "", "words": [], "prepTime": 0, "respTime": 480 },
        { "id": "wr_q5", "type": "write_sentence_picture", "image": "", "words": [], "prepTime": 0, "respTime": 480 }
      ]
    },
    {
      "part": 2,
      "partTitle": "Part 2: Respond to a Written Request",
      "instructions": "In this part of the test, you will show how well you can write a response to an email...",
      "questions": [
        { "id": "wr_q6", "type": "respond_written_request", "text": "From: [Name]\\nTo: [Name]\\nSubject: [Subject]\\n\\n[Email content asking for a resolution or suggestion]", "prepTime": 0, "respTime": 600 },
        { "id": "wr_q7", "type": "respond_written_request", "text": "From: [Name]\\nTo: [Name]\\nSubject: [Subject]\\n\\n[Email content asking for suggestions or plans]", "prepTime": 0, "respTime": 600 }
      ]
    },
    {
      "part": 3,
      "partTitle": "Part 3: Write an Opinion Essay",
      "instructions": "In this part of the test, you will write an essay in response to a prompt...",
      "questions": [
        { "id": "wr_q8", "type": "opinion_essay", "text": "Opinion essay prompt", "prepTime": 0, "respTime": 1800 }
      ]
    }
  ]
}`}`;

  const userMessage = `Please generate a new TOEIC ${skill} test.
${topics ? `Focus topics/themes: ${topics}` : 'Ensure it has common office, business, scheduling, travel, or work-life balance themes standard in TOEIC tests.'}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${skill}): ${errorText}`);
  }

  const data = await response.json();
  let textResponse = data.choices?.[0]?.message?.content || '';

  // Robust JSON extraction
  textResponse = textResponse.trim();
  if (textResponse.startsWith('```')) {
    textResponse = textResponse.replace(/^```(json)?/, '');
    textResponse = textResponse.replace(/```$/, '');
    textResponse = textResponse.trim();
  }

  let parsedTest;
  try {
    parsedTest = JSON.parse(textResponse);
  } catch (parseError) {
    console.error(`Failed to parse Gemini generated ${skill} test:`, textResponse);
    throw new Error(`Failed to parse generated ${skill} test as JSON.`);
  }

  // Synchronize and analyze images using Vision AI
  const syncedTest = await syncTestImages(parsedTest, apiKey, baseUrl);
  return syncedTest;
}

export async function POST(req: Request) {
  try {
    const { skill, topics, action, testData } = await req.json();

    const apiKey = req.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY || '';
    const baseUrl = req.headers.get('x-gemini-base-url') || process.env.GEMINI_BASE_URL || 'http://localhost:8081/v1';

    if (action === 'sync_images') {
      if (!testData) {
        return NextResponse.json({ error: 'No testData provided for sync_images' }, { status: 400 });
      }
      const synced = await syncTestImages(testData, apiKey, baseUrl);
      return NextResponse.json(synced);
    }

    if (skill === 'speaking' || skill === 'writing') {
      const test = await generateSingleTest(skill, topics, apiKey, baseUrl);
      return NextResponse.json(test);
    } else if (skill === 'full') {
      // Parallel execution to generate both parts
      const [speakingTest, writingTest] = await Promise.all([
        generateSingleTest('speaking', topics, apiKey, baseUrl),
        generateSingleTest('writing', topics, apiKey, baseUrl)
      ]);

      const timestamp = Date.now();
      const cleanTitleSuffix = speakingTest.title 
        ? speakingTest.title.replace(/^TOEIC Speaking Test\s*-\s*/, '') 
        : (topics || 'Practice');

      const combinedTest = {
        id: `toeic_sw_full_${timestamp}`,
        title: `TOEIC S&W Full Test - ${cleanTitleSuffix}`,
        description: "",
        speaking: speakingTest.speaking || [],
        writing: writingTest.writing || []
      };

      return NextResponse.json(combinedTest);
    } else {
      return NextResponse.json({ error: 'Invalid skill type requested' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Server error in /api/generate:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

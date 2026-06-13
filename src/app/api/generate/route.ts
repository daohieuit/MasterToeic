import { NextResponse } from 'next/server';

const CURED_IMAGES = [
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800', // Presentation / Meeting
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', // Team collaboration
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', // Modern workspace
  'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800', // Meeting / Presentation
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800', // Warehouse logistics
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', // Construction engineer
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800', // Office lobby reception
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', // Cafe street terrace
  'https://images.unsplash.com/photo-1579154204601-01588f351167?w=800'  // Laboratory science
];

function getRandomImages(count: number): string[] {
  const shuffled = [...CURED_IMAGES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
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
2. For image fields in speaking Q3-4 or writing Q1-5, leave the "image" field as an empty string "" (we will automatically inject high-quality curated images on the server side).

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
        { "id": "wr_q1", "type": "write_sentence_picture", "image": "", "words": ["word1", "word2"], "prepTime": 0, "respTime": 480 },
        { "id": "wr_q2", "type": "write_sentence_picture", "image": "", "words": ["word3", "word4"], "prepTime": 0, "respTime": 480 },
        { "id": "wr_q3", "type": "write_sentence_picture", "image": "", "words": ["word5", "word6"], "prepTime": 0, "respTime": 480 },
        { "id": "wr_q4", "type": "write_sentence_picture", "image": "", "words": ["word7", "word8"], "prepTime": 0, "respTime": 480 },
        { "id": "wr_q5", "type": "write_sentence_picture", "image": "", "words": ["word9", "word10"], "prepTime": 0, "respTime": 480 }
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
      model: 'gemini-3.5-flash',
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

  // Auto-inject high-quality curated images
  if (skill === 'speaking' && parsedTest.speaking) {
    const images = getRandomImages(2);
    let imgIdx = 0;
    parsedTest.speaking.forEach((part: any) => {
      if (part.part === 2 && part.questions) {
        part.questions.forEach((q: any) => {
          q.image = images[imgIdx++];
        });
      }
    });
  } else if (skill === 'writing' && parsedTest.writing) {
    const images = getRandomImages(5);
    let imgIdx = 0;
    parsedTest.writing.forEach((part: any) => {
      if (part.part === 1 && part.questions) {
        part.questions.forEach((q: any) => {
          q.image = images[imgIdx++];
        });
      }
    });
  }

  return parsedTest;
}

export async function POST(req: Request) {
  try {
    const { skill, topics } = await req.json();

    const apiKey = req.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY || '';
    const baseUrl = req.headers.get('x-gemini-base-url') || process.env.GEMINI_BASE_URL || 'http://localhost:8081/v1';

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

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Vui lòng đăng nhập để sử dụng tính năng này.', isUnauthorized: true }, { status: 403 });
    }
    const token = authHeader.split(' ')[1];
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized: Phiên đăng nhập không hợp lệ.', isUnauthorized: true }, { status: 403 });
      }

      const { data: profile } = await supabase.from('profiles').select('can_use_ai_grading').eq('id', user.id).single();
      
      if (!profile || !profile.can_use_ai_grading) {
        return NextResponse.json({ error: 'Forbidden: Tính năng chấm điểm bằng AI chỉ dành cho tài khoản được cấp quyền.', isUnauthorized: true }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Server Configuration Error: Thiếu kết nối cơ sở dữ liệu.' }, { status: 500 });
    }

    const { question, answer, type, details } = await req.json();

    const isBlank = !answer || 
                    answer.trim() === '' || 
                    answer === '(No response provided)' || 
                    answer === '(No speech recorded)' ||
                    answer.trim() === '(No speech recorded)' ||
                    answer.trim() === '(No response provided)';

    if (isBlank) {
      return NextResponse.json({
        score: 0,
        grammarErrors: [],
        feedback: 'Không có câu trả lời. Bạn nhận 0 điểm cho câu hỏi này.',
        pronunciationFeedback: null,
        sampleAnswer: ''
      });
    }

    // Prioritize credentials from request headers (for Admin/users who set it in browser)
    // Fall back to environment variables
    const apiKey = req.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY || '';
    const baseUrl = req.headers.get('x-gemini-base-url') || process.env.GEMINI_BASE_URL || 'http://localhost:8081/v1';

    // Construct the prompt for the TOEIC S&W Examiner
    const isSpeaking = type.startsWith('sp_') || ['read_aloud', 'describe_picture', 'respond_to_questions', 'respond_using_info', 'express_opinion'].includes(type);
    
    let evaluationCriteria = '';
    if (isSpeaking) {
      if (type === 'read_aloud') {
        evaluationCriteria = `
        - PHÁT ÂM (Pronunciation): Rõ ràng, chuẩn xác, tròn vành rõ chữ. Đặc biệt chú ý âm cuối (ending sounds) như -s, -es, -ed, -t, -k.
        - NGỮ ĐIỆU & TRỌNG ÂM (Intonation & Stress): Kỹ thuật PIPE. Nhấn mạnh từ mang nội dung chính (Content words), hạ giọng cuối câu trần thuật, lên giọng cuối câu hỏi Yes/No, ngắt nghỉ đúng cụm nghĩa.
        - ĐỘ TRÔI CHẢY (Fluency): Nhịp điệu trôi chảy, tự nhiên quan trọng hơn là đọc quá nhanh.
        `;
      } else if (type === 'describe_picture') {
        evaluationCriteria = `
        - TỪ VỰNG & GIỚI TỪ: Sử dụng tốt giới từ chỉ vị trí (in the background, on the right, next to...).
        - NGỮ PHÁP: Sử dụng đúng thì hiện tại tiếp diễn (is V-ing) để tả hành động của người/vật trong tranh.
        - BỐ CỤC MIÊU TẢ: Trật tự logic (Đi từ tổng quát -> tả người -> tả vật -> tả quang cảnh xung quanh).
        `;
      } else if (type === 'respond_to_questions') {
        evaluationCriteria = `
        - TRẢ LỜI TRỰC TIẾP (Relevance): Đi thẳng vào trọng tâm câu hỏi ngay từ câu đầu tiên, không nói vòng vo.
        - ĐỘ CHI TIẾT & ĐỘ DÀI: Với câu hỏi 15s (Q5, Q6), phải nói được ít nhất 2-3 câu hoàn chỉnh. Với câu hỏi 30s (Q7), phải đưa ra lý do (Reasons) và ví dụ (Examples) chi tiết.
        - ĐỘ TRÔI CHẢY: Không có khoảng thời gian chết (dead air), sử dụng từ câu giờ tự nhiên (Well, to be honest..., Generally speaking...).
        `;
      } else if (type === 'respond_using_info') {
        evaluationCriteria = `
        - TÍNH CHÍNH XÁC CỦA THÔNG TIN: Phải tìm đúng thông tin trong bảng lịch trình được cung cấp. Trả lời sai thông tin nhận 0 điểm trực tiếp cho phần nội dung.
        - NGỮ PHÁP & CẤU TRÚC: Phải trả lời thành câu hoàn chỉnh đầy đủ cấu trúc ngữ pháp và giới từ thích hợp (on Monday, at 9 AM, in Room 101), tuyệt đối không đọc rời rạc kiểu liệt kê.
        `;
      } else if (type === 'express_opinion') {
        evaluationCriteria = `
        - LUẬN ĐIỂM RÕ RÀNG: Khẳng định quan điểm cá nhân ngay từ câu mở đầu (I agree with..., In my opinion...).
        - TÍNH LIÊN KẾT (Cohesion): Lập luận chặt chẽ, nối các ý mạch lạc bằng các từ liên kết (First of all, Secondly, For example...).
        - ĐỘ TRÔI CHẢY (Fluency): Giữ nhịp điệu nói tự nhiên từ đầu đến cuối, hạn chế tối đa việc ậm ừ (um, ah).
        `;
      } else {
        evaluationCriteria = 'Phát âm, Ngữ pháp, Từ vựng, Tính liên kết, tính hoàn thiện của câu trả lời nói.';
      }
    } else {
      if (type === 'write_sentence_picture') {
        evaluationCriteria = `
        - VIẾT DUY NHẤT MỘT CÂU (Crucial Rule): Không được viết thành 2 câu riêng biệt (tức là không được có dấu chấm ở giữa câu). Ghép ý bắt buộc phải dùng liên từ (and, but, so...) hoặc đại từ quan hệ (who, which...).
        - DẤU CÂU & VIẾT HOA (Crucial Rule): Bắt buộc phải viết hoa chữ cái đầu tiên của câu và kết thúc bằng một dấu chấm (.). Nếu thiếu dấu chấm hoặc viết hoa sai, trừ điểm rất nặng.
        - TỪ KHÓA BẮT BUỘC: Sử dụng đúng và đủ 2 từ khóa đề bài yêu cầu. Được phép chia thì động từ, số ít/nhiều nhưng giữ nguyên từ loại (không tự ý chuyển danh từ thành tính từ...).
        - ĐÚNG TRỌNG TÂM TRANH: Miêu tả đúng sự thật trong tranh, không tự ý suy diễn.
        - NGỮ PHÁP CHUẨN: Đầy đủ chủ ngữ, động từ được chia chính xác.
        `;
      } else if (type === 'respond_written_request') {
        evaluationCriteria = `
        - ĐÁP ỨNG ĐỦ YÊU CẦU ĐỀ BÀI: Trả lời đầy đủ TẤT CẢ các yêu cầu nhỏ ghi trong đề bài (Ví dụ: đưa ra 2 gợi ý và đặt 1 câu hỏi). Thiếu bất kỳ phần nào sẽ bị trừ điểm trực tiếp.
        - NGỮ PHÁP & TỪ VỰNG: Sử dụng ngữ pháp đa dạng (kết hợp câu đơn, câu ghép, câu phức).
        - VĂN PHONG (Tone): Phù hợp với đối tượng nhận thư (Trang trọng đối với khách hàng/đối tác, thân mật hơn với đồng nghiệp).
        - LIÊN KẾT (Cohesion): Ý tưởng mạch lạc, liên kết bằng từ nối (First, Moreover, In addition, However...).
        `;
      } else if (type === 'opinion_essay') {
        evaluationCriteria = `
        - BỐ CỤC 3 PHẦN: Đầy đủ Mở bài (nêu rõ quan điểm) - Thân bài (các luận điểm phân tích) - Kết bài (tóm tắt kết luận).
        - LÝ LẼ & VÍ DỤ: Đưa ra lý lẽ logic thuyết phục cùng ví dụ thực tế minh họa cho quan điểm của mình.
        - ĐỘ DÀI (Crucial Rule): Bài viết tối thiểu 300 từ. Nếu ngắn hơn 300 từ, sẽ bị trừ điểm rất nặng.
        - NGỮ PHÁP NÂNG CAO: Sử dụng cấu trúc câu điều kiện, câu bị động, mệnh đề quan hệ và từ vựng học thuật phong phú.
        `;
      } else {
        evaluationCriteria = 'Cách tổ chức bài viết, lập luận bảo vệ ý kiến, từ vựng và ngữ pháp.';
      }
    }

    const systemPrompt = `You are a certified TOEIC ${isSpeaking ? 'Speaking' : 'Writing'} Examiner.
Your task is to grade the user's response strictly based on official TOEIC S&W rubrics, find grammatical/lexical errors, write comments/corrections, and provide a high-scoring sample answer.

Crucial Instructions for Grading Strictness:
- If the response is blank, represents silence, contains only non-verbal placeholders, or is equivalent to "(No speech recorded)" or "(No response provided)", the score must be exactly 0.
- For Writing Part 1 (Write a Sentence Based on a Picture): The response MUST be exactly ONE sentence. If there are two or more sentences (separated by periods, question marks, exclamation marks, or semicolons acting as sentence splitters), or if it lacks any of the two required keywords, or if it does not begin with a capital letter, or if it does not end with a period '.', you MUST penalize the score heavily. Specifically:
  * More than one sentence: Max score 50/100.
  * Lacks either keyword: Max score 50/100.
  * Does not start with a capitalized letter: Max score 80/100.
  * Does not end with a period '.': Max score 80/100.
  * Does not match the picture context (irrelevant): Max score 40/100.
- For picture-based questions (Writing Part 1 "write_sentence_picture" and Speaking Part 2 "describe_picture"):
  * You will be provided with the actual image. Keep in mind that a single picture can have many valid descriptions.
  * The AI's original reference description might only focus on one aspect of the image (e.g. Person A). If the user describes a different aspect of the image (e.g. Person B, or the background objects, or the room itself) and their description is factually true and accurate regarding the actual image, you MUST mark it as correct and not penalize them.
  * Do not strictly compare the user's response to the reference description. As long as the user's response accurately describes something that is actually visible in the image, it is relevant and correct (lenient grading).
- For Writing Part 2 (Respond to a Written Request): The response must cover ALL requested tasks in the prompt. If any task/requirement is missing, deduct points directly (each missing task drops the max possible score by 25 points).
- For Writing Part 3 (Write an Opinion Essay): The essay MUST be at least 300 words. If it is shorter, apply a heavy penalty (e.g., if it is less than 300 words, the max score is 60/100; if less than 200 words, the max score is 40/100; if less than 100 words, the max score is 20/100).
- For Speaking Part 1 (Read a Text Aloud): Grade strictly on Pronunciation (especially ending sounds like -s, -es, -ed, -t, -k) and Intonation (using PIPE technique: content words emphasized, lowered voice at the end of statements, raised voice for Yes/No questions, correct phrasing pauses).
- For Speaking Part 2 (Describe a Picture): Evaluate use of position prepositions (e.g. in the background, on the right, next to) and present continuous tense (is V-ing).
- For Speaking Part 3 (Respond to Questions): For 15s questions, must have at least 2-3 complete sentences. For 30s questions, must include reasons and examples.
- For Speaking Part 4 (Respond using Info): The information provided in the answer must be 100% correct based on the reference schedule. Any incorrect information results in an automatic content score of 0, meaning the overall score for this question cannot exceed 30/100.
- For Speaking Part 5 (Express Opinion): Must state position clearly at the beginning and use clear transitions/connectors (First of all, Secondly, For example).

Additional Output Requirements:
1. Provide all feedback and explanations in VIETNAMESE (tiếng Việt).
2. The user's response and the sample answers must remain in ENGLISH (tiếng Anh).
3. Estimate a score on a scale of 0 to 100 for this specific question (which will be scaled to 200).
4. Return ONLY a valid JSON object. Do not include any markdown wrapping like \`\`\`json or \`\`\` around the JSON code, just the raw JSON text.

JSON Structure:
{
  "score": number, // 0-100
  "subscores": {
    "pronunciation": number, // 0-100 (only for Speaking questions)
    "fluency": number, // 0-100 (only for Speaking questions)
    "taskCompletion": number, // 0-100 (only for Writing questions)
    "grammar": number, // 0-100 (both)
    "vocabulary": number, // 0-100 (both)
    "cohesion": number // 0-100 (both)
  },
  "grammarErrors": [
    {
      "original": "original text with error",
      "correction": "corrected text",
      "explanation": "explanation of the error in Vietnamese"
    }
  ],
  "feedback": "Detailed overall feedback, strengths, and weaknesses in Vietnamese.",
  "pronunciationFeedback": "Feedback on speech recognition text quality/grammar in Vietnamese (only if Speaking). Use null if not applicable.",
  "sampleAnswer": "A high-scoring model response (in English) that gets full marks for this question."
}`;

    const userMessage = `
--- QUESTION DETAILS ---
Type: ${type}
Question/Prompt: ${question}
${details?.image ? `Image URL: ${details.image}` : ''}
${details?.imageDescription ? `Reference AI Image Description: ${details.imageDescription}` : ''}
${details?.words ? `Required Words: ${details.words.join(', ')}` : ''}
${details?.referenceInfo ? `Reference Information:\n${details.referenceInfo}` : ''}

--- USER'S RESPONSE ---
${answer}

Please evaluate the user's response according to: ${evaluationCriteria}.`;

    const requestMessages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (details?.image && (type === 'describe_picture' || type === 'write_sentence_picture')) {
      requestMessages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: userMessage
          },
          {
            type: 'image_url',
            image_url: {
              url: details.image
            }
          }
        ]
      });
    } else {
      requestMessages.push({
        role: 'user',
        content: userMessage
      });
    }

    // Make API request to gemini-web2api with fallback logic
    const models = [
      'gemini-3.5-flash',
      'gemini-3.5-pro',
      'gemini-3.0-flash',
      'gemini-3.0-pro',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ];

    let response;
    let data;
    let success = false;
    let lastError = '';

    for (const model of models) {
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: model,
            messages: requestMessages
          }),
        });

        if (response.ok) {
          data = await response.json();
          success = true;
          console.log(`Successfully evaluated using model: ${model}`);
          break; // Thoát vòng lặp khi thành công
        } else {
          const errorText = await response.text();
          console.warn(`Model ${model} failed with status ${response.status}: ${errorText}`);
          lastError = `Status ${response.status}: ${errorText}`;
          // Tiếp tục thử model tiếp theo
        }
      } catch (err: any) {
        console.warn(`Fetch error for model ${model}:`, err);
        lastError = err.message || String(err);
        // Tiếp tục thử model tiếp theo
      }
    }

    if (!success || !data) {
      return NextResponse.json({ error: `Tất cả các model đều gặp lỗi hoặc hết hạn mức. Lỗi cuối cùng: ${lastError}` }, { status: 502 });
    }

    let textResponse = data.choices?.[0]?.message?.content || '';

    // Robust JSON extraction
    textResponse = textResponse.trim();
    if (textResponse.startsWith('```')) {
      // Remove starting ```json or ```
      textResponse = textResponse.replace(/^```(json)?/, '');
      // Remove ending ```
      textResponse = textResponse.replace(/```$/, '');
      textResponse = textResponse.trim();
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(textResponse);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', textResponse);
      // Fallback response structure
      parsedResult = {
        score: 50,
        subscores: {
          pronunciation: 50,
          fluency: 50,
          taskCompletion: 50,
          grammar: 50,
          vocabulary: 50,
          cohesion: 50
        },
        grammarErrors: [],
        feedback: `Không thể phân tích phản hồi tự động từ AI. Nhận xét thô:\n${textResponse}`,
        pronunciationFeedback: null,
        sampleAnswer: "Vui lòng xem lại yêu cầu đề bài."
      };
    }

    return NextResponse.json(parsedResult);
  } catch (error: any) {
    console.error('Server error in /api/eval:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';
import * as fs from 'fs';
import * as path from 'path';

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function transformSpeaking(data: any[]) {
  if (!Array.isArray(data)) return data;
  return data.map((part) => {
    const newPart: any = { part: part.part };
    
    // Speaking Part 3
    if (part.part === 3) {
      if (part.situation) {
        newPart.situation = part.situation;
      } else {
        newPart.situation = "Imagine that a Canadian marketing firm is doing research in your country. You have agreed to participate in a telephone interview.";
      }
    }

    // Speaking Part 4
    if (part.part === 4) {
      if (part.prompt) newPart.referenceInfo = part.prompt;
      else if (part.referenceInfo) newPart.referenceInfo = part.referenceInfo;
    }

    if (Array.isArray(part.questions)) {
      newPart.questions = part.questions.map((q: any) => {
        const newQ: any = {};
        
        if (part.part === 2) {
          if (q.image !== undefined) newQ.image = q.image;
          if (q.description !== undefined) newQ.description = q.description;
        } else {
          // Normalize text field for non-image parts
          if (q.questionText) newQ.text = q.questionText;
          else if (q.text) newQ.text = q.text;
        }
        
        if (q.sampleAnswer) newQ.sampleAnswer = q.sampleAnswer;
        return newQ;
      });
    }
    return newPart;
  });
}

function transformWriting(data: any[]) {
  if (!Array.isArray(data)) return data;
  return data.map((part) => {
    const newPart: any = { part: part.part };
    
    if (Array.isArray(part.questions)) {
      newPart.questions = part.questions.map((q: any) => {
        const newQ: any = {};
        
        if (part.part === 1) {
          if (q.image !== undefined) newQ.image = q.image;
          if (q.description !== undefined) newQ.description = q.description;
          if (q.words !== undefined) newQ.words = q.words;
        } else {
          // Normalize text
          if (q.emailText) newQ.text = q.emailText;
          else if (q.topicText) newQ.text = q.topicText;
          else if (q.text) newQ.text = q.text;
          
          if (part.part === 2) {
            // Direction
            if (q.direction) newQ.direction = q.direction;
            else if (q.questionText) newQ.direction = q.questionText;
          }
        }
        
        if (q.sampleAnswer) newQ.sampleAnswer = q.sampleAnswer;
        
        return newQ;
      });
    }
    return newPart;
  });
}

async function migrate() {
  console.log("Fixing example_test.json first...");
  const examplePath = path.join(process.cwd(), 'example_test.json');
  if (fs.existsSync(examplePath)) {
    const example = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
    example.speaking_data = transformSpeaking(example.speaking_data);
    example.writing_data = transformWriting(example.writing_data);
    fs.writeFileSync(examplePath, JSON.stringify(example, null, 2));
    console.log("Fixed example_test.json");
  }

  console.log("Fetching tests from Supabase...");
  const { data, error } = await supabase.from('custom_tests').select('*');
  
  if (error) {
    console.error("Error fetching tests:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("No tests found to update.");
    return;
  }
  
  const sqlQueries: string[] = [];
  
  for (const test of data) {
    let sData = test.speaking_data;
    let wData = test.writing_data;
    
    if (typeof sData === 'string') {
      try { sData = JSON.parse(sData); } catch(e) {}
    }
    if (typeof wData === 'string') {
      try { wData = JSON.parse(wData); } catch(e) {}
    }
    
    const newSData = transformSpeaking(sData);
    const newWData = transformWriting(wData);
    
    const { error: updateErr } = await supabase
      .from('custom_tests')
      .update({
        speaking_data: newSData,
        writing_data: newWData
      })
      .eq('id', test.id);
      
    if (updateErr) {
      console.error(`Failed to update test ${test.id}:`, updateErr.message);
    } else {
      console.log(`Updated test ${test.id} (${test.title || 'Untitled'})`);
    }
  }
  
  console.log("Migration complete!");
}

migrate();

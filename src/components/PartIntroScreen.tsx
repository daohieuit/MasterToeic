import React from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';

interface PartIntroScreenProps {
  partTitle: string;
  onStart: () => void;
  language?: 'en' | 'vi';
}

export default function PartIntroScreen({ partTitle, onStart, language = 'en' }: PartIntroScreenProps) {
  // Always use English for the test directions to maintain TOEIC authenticity
  const getDirections = (title: string) => {
    const t = title.toLowerCase();
    
    // Speaking Parts
    if (t.includes('part 1') && t.includes('read')) {
      return (
        <>
          <p><strong>Directions:</strong> In this part of the test, you will read aloud the text on the screen. You will have 45 seconds to prepare. Then you will have 45 seconds to read the text aloud.</p>
        </>
      );
    }
    if (t.includes('part 2') && t.includes('describe')) {
      return (
        <>
          <p><strong>Directions:</strong> In this part of the test, you will describe the picture on your screen in as much detail as you can. You will have 45 seconds to prepare your response. Then you will have 30 seconds to speak about the picture.</p>
        </>
      );
    }
    if (t.includes('part 3') && t.includes('respond to questions') && !t.includes('information')) {
      return (
        <>
          <p><strong>Directions:</strong> In this part of the test, you will answer three questions. You will have 3 seconds to prepare after you hear each question. You will have 15 seconds to respond to Questions 5 and 6, and 30 seconds to respond to Question 7.</p>
        </>
      );
    }
    if (t.includes('part 4') && t.includes('information provided')) {
      return (
        <>
          <p><strong>Directions:</strong> In this part of the test, you will answer three questions based on the information provided. You will have 45 seconds to read the information before the questions begin. You will have 3 seconds to prepare after you hear each question. You will have 15 seconds to respond to Questions 8 and 9, and 30 seconds to respond to Question 10.</p>
        </>
      );
    }
    if (t.includes('part 5') && t.includes('express an opinion')) {
      return (
        <>
          <p><strong>Directions:</strong> In this part of the test, you will give your opinion about a specific topic. Be sure to say as much as you can in the time allowed. You will have 30 seconds to prepare. Then you will have 60 seconds to speak.</p>
        </>
      );
    }
    
    // Writing Parts
    if (t.includes('part 1') && t.includes('picture')) {
      return (
        <>
          <p><strong>Directions:</strong> In this part of the test, you will write ONE sentence that is based on a picture. With each picture, you will be given TWO words or phrases that you must use in your sentence. You can change the forms of the words and you can use the words in any order. You will have 8 minutes to complete this part of the test.</p>
        </>
      );
    }
    if (t.includes('part 2') && t.includes('written request')) {
      return (
        <>
          <p><strong>Directions:</strong> In this part of the test, you will show how well you can write a response to an e-mail. Your response will be scored on the quality and variety of your sentences, vocabulary, and organization. You will have 10 minutes to read and answer each e-mail.</p>
        </>
      );
    }
    if (t.includes('part 3') && t.includes('opinion essay')) {
      return (
        <>
          <p><strong>Directions:</strong> In this part of the test, you will write an essay in response to a question that asks you to state, explain, and support your opinion on an issue. Typically, an effective essay will contain a minimum of 300 words. You will have 30 minutes to plan, write, and revise your essay.</p>
        </>
      );
    }

    // Default Fallback
    return <p><strong>Directions:</strong> Please read the instructions carefully before beginning this section.</p>;
  };

  return (
    <div className="fade-in" style={{ 
      display: 'flex', 
      flex: 1, 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: '24px', 
      background: 'var(--background)' 
    }}>
      <div className="card-sharp" style={{ 
        width: '100%', 
        maxWidth: '700px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px', 
        borderColor: 'var(--accent)' 
      }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <div style={{ padding: '12px', background: 'var(--background-secondary)', border: '1px solid var(--border)' }}>
            <BookOpen size={28} style={{ color: 'var(--text-primary)' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              SECTION INTRODUCTION
            </span>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              {partTitle}
            </h2>
          </div>
        </div>

        <div style={{ 
          color: 'var(--text-secondary)', 
          lineHeight: '1.7', 
          fontSize: '1.05rem',
          background: 'var(--background-secondary)',
          padding: '20px',
          border: '1px solid var(--border)'
        }}>
          {getDirections(partTitle)}
        </div>

        <button 
          className="btn-accent" 
          onClick={onStart}
          style={{ 
            width: '100%', 
            justifyContent: 'center', 
            padding: '16px', 
            fontSize: '1.1rem', 
            fontWeight: 'bold', 
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Start Section <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

import React, { useEffect } from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import { DEFAULT_SPEAKING_PARTS, DEFAULT_WRITING_PARTS } from '../utils/constants';

interface PartIntroScreenProps {
  partTitle: string;
  onStart: () => void;
  language?: 'en' | 'vi';
}

export default function PartIntroScreen({ partTitle, onStart, language = 'en' }: PartIntroScreenProps) {
  // Request microphone permission early for Speaking parts to save permission and avoid interrupts
  useEffect(() => {
    const t = partTitle.toLowerCase();
    const isSpeaking = t.includes('speaking') || 
                       (t.includes('part 1') && t.includes('read')) ||
                       (t.includes('part 2') && t.includes('describe')) ||
                       (t.includes('part 3') && t.includes('respond to questions') && !t.includes('information')) ||
                       (t.includes('part 4') && t.includes('information provided')) ||
                       (t.includes('part 5') && t.includes('express an opinion'));

    if (isSpeaking && typeof window !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          // Release microphone immediately
          stream.getTracks().forEach(track => track.stop());
        })
        .catch((err) => {
          console.warn('Microphone pre-grant request failed/denied:', err);
        });
    }
  }, [partTitle]);

  // Always use English for the test directions to maintain TOEIC authenticity
  const getDirections = (title: string) => {
    const t = title.toLowerCase();
    
    // Speaking Parts
    if (t.includes('part 1') && t.includes('read')) {
      return <p><strong>Directions:</strong> {DEFAULT_SPEAKING_PARTS[1].instructions.replace('In this part of the test, ', '')}</p>;
    }
    if (t.includes('part 2') && t.includes('describe')) {
      return <p><strong>Directions:</strong> {DEFAULT_SPEAKING_PARTS[2].instructions.replace('In this part of the test, ', '')}</p>;
    }
    if (t.includes('part 3') && t.includes('respond to questions') && !t.includes('information')) {
      return <p><strong>Directions:</strong> {DEFAULT_SPEAKING_PARTS[3].instructions.replace('In this part of the test, ', '')}</p>;
    }
    if (t.includes('part 4') && t.includes('information provided')) {
      return <p><strong>Directions:</strong> {DEFAULT_SPEAKING_PARTS[4].instructions.replace('In this part of the test, ', '')}</p>;
    }
    if (t.includes('part 5') && t.includes('express an opinion')) {
      return <p><strong>Directions:</strong> {DEFAULT_SPEAKING_PARTS[5].instructions.replace('In this part of the test, ', '')}</p>;
    }
    
    // Writing Parts
    if (t.includes('part 1') && t.includes('picture')) {
      return <p><strong>Directions:</strong> {DEFAULT_WRITING_PARTS[1].instructions.replace('In this part of the test, ', '')}</p>;
    }
    if (t.includes('part 2') && t.includes('written request')) {
      return <p><strong>Directions:</strong> {DEFAULT_WRITING_PARTS[2].instructions.replace('In this part of the test, ', '')}</p>;
    }
    if (t.includes('part 3') && t.includes('opinion essay')) {
      return <p><strong>Directions:</strong> {DEFAULT_WRITING_PARTS[3].instructions.replace('In this part of the test, ', '')}</p>;
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

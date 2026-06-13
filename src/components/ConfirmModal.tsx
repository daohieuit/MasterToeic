import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '24px'
    }} className="fade-in">
      <div className="card-sharp" style={{
        maxWidth: '400px',
        width: '100%',
        backgroundColor: 'var(--background)',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', backgroundColor: 'var(--accent-light)', borderRadius: '8px', color: 'var(--accent)' }}>
            <AlertTriangle size={24} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h3>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {message}
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button 
            className="btn-secondary" 
            onClick={onCancel}
            style={{ padding: '10px 16px', fontSize: '0.9rem', fontWeight: '500' }}
          >
            {cancelText}
          </button>
          <button 
            className="btn-accent" 
            onClick={onConfirm}
            style={{ padding: '10px 16px', fontSize: '0.9rem', fontWeight: '500' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

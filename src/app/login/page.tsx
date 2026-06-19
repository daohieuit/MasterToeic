'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/utils/supabase';
import { Shield, Key, Mail, Lock, User, ArrowLeft, Loader, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { language, theme } = useApp();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Redirect if user is already logged in
  useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          router.push('/');
        }
      });
    }
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg(language === 'vi' ? 'Supabase chưa được cấu hình biến môi trường!' : 'Supabase is not configured!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        // Validation
        if (password !== confirmPassword) {
          setErrorMsg(language === 'vi' ? 'Mật khẩu xác nhận không khớp!' : 'Passwords do not match!');
          setLoading(false);
          return;
        }

        const role = username.trim().toLowerCase() === 'admin' ? 'admin' : 'user';

        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
              role: role
            },
            emailRedirectTo: `${window.location.origin}/login`
          }
        });

        if (error) throw error;
        
        setSuccessMsg(
          language === 'vi' 
            ? 'Đăng ký thành công! Vui lòng kiểm tra hộp thư của bạn để xác nhận tài khoản (nếu được yêu cầu).' 
            : 'Registration successful! Please check your email for confirmation (if required).'
        );
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Success redirect
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const t = {
    vi: {
      loginTitle: 'Đăng nhập',
      signUpTitle: 'Đăng ký tài khoản',
      usernameLabel: 'Tên hiển thị (Username)',
      emailLabel: 'Địa chỉ Email',
      passLabel: 'Mật khẩu',
      confirmPassLabel: 'Xác nhận Mật khẩu',
      loginBtn: 'Đăng Nhập',
      signUpBtn: 'Đăng Ký Tài Khoản',
      haveAccount: 'Đã có tài khoản? Đăng nhập',
      needAccount: 'Chưa có tài khoản? Đăng ký ngay',
      back: 'Quay lại Trang chủ',
      dbNotConfigured: 'Hệ thống lưu trữ đám mây Supabase chưa được cấu hình. Vui lòng liên hệ Admin để điền biến môi trường NEXT_PUBLIC_SUPABASE_URL.',
      loadingText: 'Đang xử lý...'
    },
    en: {
      loginTitle: 'Student Login',
      signUpTitle: 'Create Account',
      usernameLabel: 'Username',
      emailLabel: 'Email Address',
      passLabel: 'Password',
      confirmPassLabel: 'Confirm Password',
      loginBtn: 'Sign In',
      signUpBtn: 'Create Account',
      haveAccount: 'Already have an account? Sign In',
      needAccount: "Don't have an account? Sign Up",
      back: 'Back to Dashboard',
      dbNotConfigured: 'Supabase cloud database is not configured. Please contact the Admin to configure variables.',
      loadingText: 'Processing...'
    }
  }[language];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--background)', padding: '16px' }} className="fade-in">
      <div className="card-sharp" style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Back Link */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> {t.back}
        </Link>

        {/* Database Warning */}
        {!supabase && (
          <div style={{ display: 'flex', gap: '8px', background: 'var(--accent-light)', border: '1px solid var(--accent)', padding: '12px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
            <AlertCircle size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span>{t.dbNotConfigured}</span>
          </div>
        )}

        {/* Header */}
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
            {isSignUp ? t.signUpTitle : t.loginTitle}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            MASTER TOEIC - Sync history across all devices.
          </p>
        </div>

        {/* Auth form */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div style={{ color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid var(--accent)', padding: '10px', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ color: 'var(--success)', background: 'var(--success-light)', border: '1px solid var(--success)', padding: '10px', fontSize: '0.85rem' }}>
              {successMsg}
            </div>
          )}

          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '6px' }}>{t.usernameLabel}</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  required={isSignUp}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '6px' }}>{t.emailLabel}</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@domain.com"
                style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '6px' }}>{t.passLabel}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '10px 36px 10px 36px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '6px' }}>{t.confirmPassLabel}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required={isSignUp}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 36px 10px 36px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-accent" 
            disabled={loading || !supabase} 
            style={{ justifyContent: 'center', padding: '12px', fontWeight: 'bold', marginTop: '8px' }}
          >
            {loading ? (
              <>
                <Loader className="pulse-border" size={16} style={{ marginRight: '8px' }} />
                {t.loadingText}
              </>
            ) : (
              isSignUp ? t.signUpBtn : t.loginBtn
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        {supabase && (
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline', textAlign: 'center' }}
          >
            {isSignUp ? t.haveAccount : t.needAccount}
          </button>
        )}

      </div>
    </div>
  );
}

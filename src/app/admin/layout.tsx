'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  LayoutDashboard, 
  Settings, 
  FileText, 
  ArrowLeft, 
  AlertTriangle,
  Loader 
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, isAdmin, user } = useApp();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Allow session initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setCheckingAuth(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user !== null) {
      setCheckingAuth(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: user?.id avoids re-render loops on object reference changes
  }, [user?.id]);

  // Loading state
  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--background)' }}>
        <Loader className="pulse-border spin" size={32} style={{ color: 'var(--accent)', marginBottom: '16px' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {language === 'vi' ? 'Đang xác thực quyền truy cập...' : 'Verifying permissions...'}
        </p>
      </div>
    );
  }

  // Denied Access screen wrapper
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--background)', padding: '16px' }}>
        <div className="card-sharp" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', borderRadius: '0px' }}>
          <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent)' }}>
            <AlertTriangle size={24} /> {language === 'vi' ? 'Không có quyền truy cập' : 'Access Denied'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>
            {language === 'vi' ? 'Bạn cần tài khoản có quyền Quản trị viên (Admin) để truy cập trang này.' : 'You need an Administrator account to access this page.'}
          </p>
          <Link href="/" className="btn-primary" style={{ justifyContent: 'center', textDecoration: 'none', borderRadius: '0px' }}>
            <ArrowLeft size={16} /> Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // Admin menu links
  const navItems = [
    {
      label: language === 'vi' ? 'Tạo đề bằng AI' : 'AI Generator',
      path: '/admin',
      icon: LayoutDashboard
    },
    {
      label: language === 'vi' ? 'Kho ảnh & Pipeline' : 'Image Pipeline',
      path: '/admin/tests',
      icon: Settings
    },
    {
      label: language === 'vi' ? 'Quản lý đề thi' : 'Manage Tests',
      path: '/admin/manage-tests',
      icon: FileText
    }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      
      {/* Unified Admin Nav Header */}
      <header 
        style={{ 
          height: '64px', 
          background: 'var(--background-secondary)', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '0 5%'
        }}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Logo & Branding */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              fontFamily: 'var(--font-space-grotesk), sans-serif', 
              fontWeight: 800, 
              letterSpacing: '0.08em',
              fontSize: '1.1rem',
              textTransform: 'uppercase'
            }}>
              <span style={{ color: 'var(--text-primary)' }}>MASTER</span>
              <span style={{ color: 'var(--accent)', marginLeft: '4px' }}>TOEIC</span>
              <span style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '0.7rem', 
                fontWeight: 600, 
                marginLeft: '8px', 
                borderLeft: '1px solid var(--border)', 
                paddingLeft: '8px' 
              }}>
                ADMIN
              </span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', height: '64px', alignItems: 'center', gap: '4px' }}>
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  style={{
                    height: '64px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 16px',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <Icon size={14} />
                  <span className="desktop-only">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Return button */}
          <div>
            <Link 
              href="/" 
              className="btn-secondary" 
              style={{ 
                textDecoration: 'none', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '6px 12px',
                fontSize: '0.8rem',
                borderRadius: '0px'
              }}
            >
              <ArrowLeft size={14} />
              <span>{language === 'vi' ? 'Về trang chủ' : 'User Mode'}</span>
            </Link>
          </div>

        </div>
      </header>

      {/* Page Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

    </div>
  );
}

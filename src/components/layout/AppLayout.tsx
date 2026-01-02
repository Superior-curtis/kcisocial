import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showHeader?: boolean;
  showNav?: boolean;
  showSearch?: boolean;
  showCreate?: boolean;
  disableTheme?: boolean;  // For Profile pages that shouldn't show app theme
  noBackground?: boolean;  // For pages with custom backgrounds (e.g., Profile)
}

export function AppLayout({ 
  children, 
  title,
  showHeader = true, 
  showNav = true,
  showSearch = true,
  showCreate = true,
  disableTheme = false,
  noBackground = false,
}: AppLayoutProps) {
  const { user, isImpersonating } = useAuth();
  const hasTheme = !disableTheme && user?.appTheme;
  const headerHeight = showHeader ? 'mt-14' : '';
  const impersonationBarHeight = isImpersonating ? 'mt-[33px]' : '';
  
  return (
    <div className={`min-h-screen relative overflow-hidden ${noBackground || hasTheme ? '' : 'bg-background'}`}>
      {hasTheme && (
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${user.appTheme})`,
            zIndex: -10,
          }}
        />
      )}
      
      {showHeader && <Header title={title} showSearch={showSearch} showCreate={showCreate} />}
      
      <main className={`
        w-full max-w-2xl mx-auto
        ${headerHeight} 
        ${impersonationBarHeight}
        ${showNav ? 'mb-16' : ''}
        ${hasTheme ? 'relative' : ''}
      `}>
        <div className={hasTheme ? 'bg-background/90 backdrop-blur-sm min-h-screen' : ''}>
          {children}
        </div>
      </main>
      
      {showNav && <BottomNav />}
    </div>
  );
}

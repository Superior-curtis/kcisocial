import { Home, MessageCircle, Users, Megaphone, User, Shield, Sparkles } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  
  const baseItems = [
    { to: '/feed', icon: Home, label: 'Home' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: '/clubs', icon: Users, label: 'Clubs' },
    { to: '/official', icon: Megaphone, label: 'Official' },
    { to: '/ai-chat', icon: Sparkles, label: 'AI' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const navItems = user?.role === 'admin' 
    ? [
        { to: '/feed', icon: Home, label: 'Home' },
        { to: '/messages', icon: MessageCircle, label: 'Messages' },
        { to: '/clubs', icon: Users, label: 'Clubs' },
        { to: '/admin', icon: Shield, label: 'Admin' },
        { to: '/ai-chat', icon: Sparkles, label: 'AI' },
        { to: '/profile', icon: User, label: 'Profile' },
      ]
    : baseItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'relative p-2 rounded-xl transition-all duration-200',
                isActive && 'bg-primary/10'
              )}>
                <Icon 
                  className={cn(
                    'w-6 h-6 transition-all duration-200',
                    isActive && 'scale-110'
                  )} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium mt-0.5 transition-all duration-200',
                isActive ? 'opacity-100' : 'opacity-70'
              )}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

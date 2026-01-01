import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { Sparkles, Users, MessageCircle, Heart } from 'lucide-react';

export default function Auth() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/feed');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = async () => {
    await login();
    if (isAuthenticated) {
      navigate('/feed');
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        backgroundImage: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url('/kcis-campus.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Animated icons */}
        <div className="absolute -top-20 -left-20 animate-float">
          <Heart className="w-16 h-16 text-primary/20" />
        </div>
        <div className="absolute -top-16 -right-16 animate-float" style={{ animationDelay: '1s' }}>
          <MessageCircle className="w-20 h-20 text-accent/20" />
        </div>
        <div className="absolute -bottom-12 left-10 animate-float" style={{ animationDelay: '1.5s' }}>
          <Users className="w-14 h-14 text-primary/20" />
        </div>

        {/* Main content */}
        <div className="text-center space-y-8 animate-fade-in-up">
          {/* Logo with sparkle effect */}
          <div className="relative inline-block">
            <Sparkles className="absolute -top-6 -right-6 w-8 h-8 text-yellow-400 animate-pulse" />
            <Sparkles className="absolute -top-8 -right-2 w-6 h-6 text-yellow-300 animate-pulse" style={{ animationDelay: '0.3s' }} />
            <h1 className="text-7xl font-bold bg-gradient-to-r from-yellow-200 via-white to-blue-200 bg-clip-text text-transparent animate-gradient drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
              Welcome
            </h1>
            <Sparkles className="absolute -bottom-4 -left-4 w-6 h-6 text-blue-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
            <Sparkles className="absolute -bottom-6 left-2 w-5 h-5 text-blue-400 animate-pulse" style={{ animationDelay: '0.7s' }} />
          </div>

          {/* Subtitle with gradient */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Kang Chiao International School
            </h2>
            <p className="text-xl text-gray-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-fade-in" style={{ animationDelay: '0.3s' }}>
              Student Social Platform
            </p>
          </div>

          {/* Login button */}
          <div className="pt-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button
              variant="default"
              size="lg"
              className="w-full max-w-sm gap-3 h-16 text-lg font-semibold shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:shadow-[0_0_50px_rgba(59,130,246,0.7)] transition-all duration-300 hover:scale-110 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </Button>
          </div>

          {/* Footer note */}
          <p className="text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.5s' }}>
            Use your <span className="font-semibold text-foreground">@kcis.com.tw</span> email
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}

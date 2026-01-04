import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Sparkles, Users, MessageCircle, Heart, Key } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Auth() {
  const { login, loginWithEmail, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [email, setEmail] = useState('admin@kcis.com.tw');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

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

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only allow this specific email
    if (email !== 'admin@kcis.com.tw') {
      return;
    }
    
    setLoggingIn(true);
    try {
      // Try to login with email/password
      await loginWithEmail(email, password);
      setShowDevLogin(false);
      navigate('/feed');
    } catch (error: any) {
      console.log('Login error:', error?.code, error?.message);
      
      // If user not found or invalid credential, try to create with email/password
      if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/user-not-found') {
        try {
          const { createUserWithEmailAndPassword } = await import('firebase/auth');
          const { auth } = await import('@/lib/firebase');
          const result = await createUserWithEmailAndPassword(auth, email, password);
          console.log('Account created with email/password:', result.user.uid);
          setShowDevLogin(false);
        } catch (createError: any) {
          console.error('Failed to create account:', createError?.code, createError?.message);
          // If creation fails because user exists (from Google Auth), user needs to set password in Firebase Console
          if (createError?.code === 'auth/email-already-in-use') {
            alert('This email already exists from Google Sign-in. Please set a password in Firebase Console:\n\n1. Go to Firebase Console → Authentication → Users\n2. Find admin@kcis.com.tw\n3. Click "Set Password"\n4. Enter: adminad');
          }
        }
      }
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        backgroundImage: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url('/profile-bg-2.jpg'), url('/profile-bg-2.svg')",
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
          {/* Title with sparkle effect */}
          <div className="relative inline-block">
            <Sparkles className="absolute -top-6 -right-6 w-8 h-8 text-yellow-400 animate-pulse" />
            <Sparkles className="absolute -top-8 -right-2 w-6 h-6 text-yellow-300 animate-pulse" style={{ animationDelay: '0.3s' }} />
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-yellow-200 via-white to-blue-200 bg-clip-text text-transparent animate-gradient drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
              Campus Media
            </h1>
            <Sparkles className="absolute -bottom-4 -left-4 w-6 h-6 text-blue-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
            <Sparkles className="absolute -bottom-6 left-2 w-5 h-5 text-blue-400 animate-pulse" style={{ animationDelay: '0.7s' }} />
          </div>

          {/* Subtitle with gradient */}
          <div className="space-y-2">
            <p className="text-xl text-gray-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-fade-in" style={{ animationDelay: '0.3s' }}>
              Student-built community (testing)
            </p>
          </div>

          <div className="pt-4 animate-fade-in" style={{ animationDelay: '0.35s' }}>
            <Alert className="bg-background/40 backdrop-blur-sm border-border/40">
              <AlertDescription className="text-xs text-muted-foreground">
                僅供測試用途，並非學校官方網站。
              </AlertDescription>
            </Alert>
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
            This is a test build • See <button className="underline hover:opacity-80" onClick={() => navigate('/terms')}>Terms of Service</button>
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

      {/* Maintenance Button */}
      <button
        onClick={() => setShowMaintenance(true)}
        className="fixed bottom-6 right-6 z-50 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-full p-3 border border-white/20 transition-all duration-300 hover:scale-110 shadow-lg"
        title="Maintenance"
      >
        <Key className="w-5 h-5" />
      </button>

      {/* Maintenance Dialog */}
      <Dialog open={showMaintenance} onOpenChange={setShowMaintenance}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Maintenance</DialogTitle>
            <DialogDescription>
              Administrator access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Button 
              onClick={() => {
                setShowMaintenance(false);
                setShowDevLogin(true);
              }} 
              className="w-full"
            >
              Developer Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Developer Login Dialog */}
      <Dialog open={showDevLogin} onOpenChange={setShowDevLogin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Developer Login</DialogTitle>
            <DialogDescription>
              Login with email and password
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDevLogin} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@kcis.com.tw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loggingIn}
                readOnly
                defaultValue="admin@kcis.com.tw"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loggingIn}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loggingIn}>
              {loggingIn ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

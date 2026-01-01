import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { Users, MessageSquare, BookOpen, School } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/feed');
    }
  }, [user, navigate]);

  return (
    <div 
      className="min-h-screen flex flex-col bg-cover bg-center relative"
      style={{
        backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('/kcis-campus.jpg')",
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-background/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <School className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-foreground">KCISocial</span>
          </div>
          <Button variant="outline" onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-4xl text-center space-y-8">
          {/* Main Title */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-lg">
              KCIS Student Community
            </h1>
            <p className="text-lg md:text-xl text-gray-100 max-w-2xl mx-auto drop-shadow">
              Connect with classmates, join clubs, and stay updated with school activities
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 max-w-3xl mx-auto">
            <div className="bg-card border border-border/50 rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Join Clubs</h3>
              <p className="text-sm text-muted-foreground">
                Discover and connect with clubs
              </p>
            </div>

            <div className="bg-card border border-border/50 rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Chat & Share</h3>
              <p className="text-sm text-muted-foreground">
                Message friends and share updates
              </p>
            </div>

            <div className="bg-card border border-border/50 rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Stay Informed</h3>
              <p className="text-sm text-muted-foreground">
                Get school announcements
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-8">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="px-8 h-12 text-base"
            >
              Sign in with KCIS Account
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-sm text-muted-foreground pt-4">
            For KCIS students only • Sign in with your @kcis.com.tw account
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

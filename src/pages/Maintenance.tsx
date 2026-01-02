import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Wrench, AlertCircle } from 'lucide-react';

interface MaintenanceProps {
  message?: string;
  estimatedEndTime?: Date;
}

export default function Maintenance({ message = 'We are currently performing maintenance', estimatedEndTime }: MaintenanceProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Admin can access the site during maintenance
    if (!isLoading && user?.role === 'admin') {
      navigate('/feed');
    }
  }, [user, isLoading, navigate]);

  const formatTime = (date: Date | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md text-center space-y-8">
        {/* Maintenance Icon */}
        <div className="flex justify-center animate-bounce">
          <div className="relative">
            <Wrench className="w-24 h-24 text-white drop-shadow-lg" />
            <AlertCircle className="absolute -bottom-2 -right-2 w-8 h-8 text-yellow-300 animate-pulse" />
          </div>
        </div>

        {/* Main Text */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg">
            Under Maintenance
          </h1>
          <p className="text-xl text-white/90 drop-shadow">
            {message}
          </p>
        </div>

        {/* Message Section */}
        {message && message !== 'We are currently performing maintenance' && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <p className="text-white/80 text-sm leading-relaxed">
              {message}
            </p>
          </div>
        )}

        {/* Estimated Time */}
        {estimatedEndTime && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-center gap-3 text-white mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Estimated Completion Time</span>
            </div>
            <p className="text-2xl font-bold text-yellow-300">
              {formatTime(estimatedEndTime)}
            </p>
            <p className="text-white/60 text-xs mt-2">
              We'll be back online soon!
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="space-y-3 pt-6">
          <p className="text-white/70 text-sm">
            Thank you for your patience while we improve KCISocial.
          </p>
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

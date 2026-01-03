import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import Feed from "./pages/Feed";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import AIChat from "./pages/AIChat";
import Clubs from "./pages/Clubs";
import Official from "./pages/Official";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Settings from "./pages/Settings";
import ClubDetail from "./pages/ClubDetail";
import MusicHall from "./pages/MusicHall";
import MusicHallList from "./pages/MusicHallList";
import NotificationsPage from "./pages/Notifications";
import HelpCenter from "./pages/HelpCenter";
import AdminPanel from "./pages/AdminPanel";
import Maintenance from "./pages/Maintenance";
import NotFound from "./pages/NotFound";
import Videos from "./pages/Videos";
import { UserRole } from "@/types";
import { getSystemSettings } from "@/lib/firestore";

const queryClient = new QueryClient();

const ProtectedRoute = ({ element, roles }: { element: JSX.Element; roles?: UserRole[] }) => {
  const { isAuthenticated, isLoading, hasPermission, user } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState<any>(null);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const settings = await getSystemSettings();
        setMaintenanceMode(settings.maintenanceMode);
        setMaintenanceData(settings);
      } catch (err) {
        console.error('Failed to check maintenance mode:', err);
      } finally {
        setCheckingMaintenance(false);
      }
    };

    checkMaintenance();
    // Check every 10 seconds
    const interval = setInterval(checkMaintenance, 10000);
    return () => clearInterval(interval);
  }, []);

  if (checkingMaintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  // Show maintenance page for non-admin users
  if (maintenanceMode && user?.role !== 'admin') {
    return (
      <Maintenance 
        message={maintenanceData?.maintenanceMessage}
        estimatedEndTime={maintenanceData?.estimatedEndTime}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Checking access...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  if (roles && !hasPermission(roles)) {
    return <Feed />;
  }

  return element;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/feed" element={<ProtectedRoute element={<Feed />} />} />
            <Route path="/messages" element={<ProtectedRoute element={<Messages />} />} />
            <Route path="/messages/:uid" element={<ProtectedRoute element={<Chat />} />} />
            <Route path="/ai-chat" element={<ProtectedRoute element={<AIChat />} />} />
            <Route path="/clubs" element={<ProtectedRoute element={<Clubs />} />} />
            <Route path="/clubs/:clubId" element={<ProtectedRoute element={<ClubDetail />} />} />
            <Route path="/clubs/:clubId/music" element={<ProtectedRoute element={<MusicHall />} />} />
            <Route path="/music-hall" element={<ProtectedRoute element={<MusicHallList />} />} />
            <Route path="/music-hall/:roomId" element={<ProtectedRoute element={<MusicHall />} />} />
            <Route path="/official" element={<ProtectedRoute element={<Official />} />} />
            <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
            <Route path="/profile/:uid" element={<ProtectedRoute element={<UserProfile />} />} />
            <Route path="/settings" element={<ProtectedRoute element={<Settings />} />} />
            <Route path="/notifications" element={<ProtectedRoute element={<NotificationsPage />} />} />
            <Route path="/help" element={<ProtectedRoute element={<HelpCenter />} />} />
            <Route path="/videos" element={<ProtectedRoute element={<Videos />} />} />
            <Route path="/admin" element={<ProtectedRoute element={<AdminPanel />} roles={["admin"]} />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

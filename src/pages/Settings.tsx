import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, Moon, Bell, Lock, HelpCircle, Info, LogOut, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { uploadMedia } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [notifications, setNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appTheme, setAppTheme] = useState(user?.appTheme || '');
  const [uploadingTheme, setUploadingTheme] = useState(false);
  const themeFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (user?.id) {
      getDoc(doc(firestore, 'users', user.id)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setNotifications(data.notificationsEnabled ?? true);
          setPrivateAccount(data.isPrivate ?? false);
          setAppTheme(data.appTheme || '');
        }
      });
    }
  }, [user?.id]);

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    localStorage.setItem('darkMode', checked.toString());
  };

  const handleNotificationsToggle = async (checked: boolean) => {
    setNotifications(checked);
    if (user?.id) {
      setLoading(true);
      try {
        await setDoc(doc(firestore, 'users', user.id), { notificationsEnabled: checked }, { merge: true });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrivateToggle = async (checked: boolean) => {
    setPrivateAccount(checked);
    if (user?.id) {
      setLoading(true);
      try {
        await setDoc(doc(firestore, 'users', user.id), { isPrivate: checked }, { merge: true });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      await logout();
      navigate('/');
    }
  };

  const handleThemeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.id) {
      toast({ title: 'You need to be logged in', variant: 'destructive' });
      return;
    }

    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Image too large (max 10MB)', variant: 'destructive' });
      return;
    }

    setUploadingTheme(true);
    try {
      const url = await uploadMedia(file, 'themes', user.id);
      setAppTheme(url);
      await updateDoc(doc(firestore, 'users', user.id), { appTheme: url });
      toast({ title: 'App theme uploaded!', description: 'Refresh to see changes' });
    } catch (err) {
      console.error('Theme upload error:', err);
      toast({ title: 'Failed to upload theme', description: String(err), variant: 'destructive' });
    } finally {
      setUploadingTheme(false);
    }
  };

  const handleRemoveTheme = async () => {
    if (!user?.id) return;
    try {
      setAppTheme('');
      await updateDoc(doc(firestore, 'users', user.id), { appTheme: '' });
      toast({ title: 'Theme removed', description: 'Refresh to see changes' });
    } catch (err) {
      console.error('Remove theme error:', err);
      toast({ title: 'Failed to remove theme', variant: 'destructive' });
    }
  };

  return (
    <AppLayout title="Settings" showSearch={false} showCreate={false}>
      <div className="animate-fade-in">
        {/* Account Settings */}
        <div className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Account
          </h2>
          
          <div className="space-y-1">
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Info className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Account Information</div>
                  <div className="text-sm text-muted-foreground">{user?.email}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div className="p-4 border-t border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Preferences
          </h2>
          
          <div className="space-y-4">
            {/* App Theme Upload */}
            <div className="p-3 rounded-lg bg-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <ImageIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <Label className="font-medium">App Theme Background</Label>
                  <div className="text-sm text-muted-foreground">Personalize your app appearance</div>
                </div>
              </div>
              
              <input
                type="file"
                accept="image/*"
                ref={themeFileInputRef}
                onChange={handleThemeUpload}
                className="hidden"
              />
              
              {appTheme ? (
                <div className="space-y-2">
                  <img src={appTheme} alt="App theme preview" className="w-full h-32 object-cover rounded-lg" />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => themeFileInputRef.current?.click()}
                      disabled={uploadingTheme}
                      className="flex-1"
                    >
                      {uploadingTheme ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Change Theme
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveTheme}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => themeFileInputRef.current?.click()}
                  disabled={uploadingTheme}
                  className="w-full"
                >
                  {uploadingTheme ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload App Theme
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Moon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="dark-mode" className="font-medium cursor-pointer">
                    Dark Mode
                  </Label>
                  <div className="text-sm text-muted-foreground">Toggle dark theme</div>
                </div>
              </div>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={handleDarkModeToggle}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="notifications" className="font-medium cursor-pointer">
                    Notifications
                  </Label>
                  <div className="text-sm text-muted-foreground">Push notifications</div>
                </div>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={handleNotificationsToggle}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="p-4 border-t border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Privacy & Security
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="private" className="font-medium cursor-pointer">
                    Private Account
                  </Label>
                  <div className="text-sm text-muted-foreground">Only followers can see your posts</div>
                </div>
              </div>
              <Switch
                id="private"
                checked={privateAccount}
                onCheckedChange={handlePrivateToggle}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="p-4 border-t border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Support
          </h2>
          
          <div className="space-y-1">
            <button 
              onClick={() => navigate('/help')}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Help Center</div>
                  <div className="text-sm text-muted-foreground">Get help and support</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>

        {/* App Info */}
        <div className="p-4 text-center text-sm text-muted-foreground border-t border-border">
          <p>KCIS Social v1.0.0</p>
          <p className="mt-1">© 2025 KCIS Media</p>
        </div>
      </div>
    </AppLayout>
  );
}

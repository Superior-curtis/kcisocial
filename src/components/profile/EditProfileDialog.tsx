import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { uploadMedia as uploadMediaToCloud } from '@/lib/storage';
import { Loader2, Upload } from 'lucide-react';
import type { OnlineStatus } from '@/types';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [profileBackground, setProfileBackground] = useState(user?.profileBackground || '');
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>(user?.onlineStatus || 'online');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.id) {
      toast({ title: 'You need to be logged in', variant: 'destructive' });
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast({ title: 'Please select an image or video', variant: 'destructive' });
      return;
    }

    // Keep uploads reasonable to avoid long waits
    const maxSize = isVideo ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: 'File too large', description: `Max ${isVideo ? '25MB video' : '10MB image'}`, variant: 'destructive' });
      return;
    }

    setUploadingBg(true);
    try {
      const url = await uploadMediaToCloud(file, 'profiles', user.id);
      console.log('Background uploaded to:', url);
      setProfileBackground(url);
      toast({ title: 'Background uploaded successfully!' });
    } catch (err) {
      console.error('Background upload error:', err);
      toast({ title: 'Failed to upload background', description: String(err), variant: 'destructive' });
    } finally {
      setUploadingBg(false);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const userRef = doc(firestore, 'users', user.id);
      
      // Build update object, only including fields that have values
      const updateData: any = {
        name: name.trim(),
        bio: bio.trim(),
        onlineStatus: onlineStatus,
      };
      
      // Only update avatar if provided
      if (avatar.trim()) {
        updateData.photoURL = avatar.trim();
      }
      
      // Only update background if provided
      if (profileBackground.trim()) {
        updateData.profileBackground = profileBackground.trim();
        console.log('Saving profileBackground:', profileBackground.length, 'bytes');
      }
      
      console.log('Update data:', {
        ...updateData,
        profileBackground: updateData.profileBackground ? `[${updateData.profileBackground.length} bytes]` : undefined,
      });
      
      await updateDoc(userRef, updateData);

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      onOpenChange(false);
      
      // Reload page to reflect changes
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error("Failed to update profile", error);
      toast({
        title: "Update failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                type="url"
              />
            </div>
            <div className="grid gap-2">
              <Label>Profile Background (Image/Video/GIF)</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*,video/*"
                  ref={bgFileInputRef}
                  onChange={handleBackgroundUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => bgFileInputRef.current?.click()}
                  disabled={uploadingBg}
                  className="flex-1"
                >
                  {uploadingBg ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Background
                    </>
                  )}
                </Button>
              </div>
              {profileBackground && (
                <div className="relative mt-2">
                  {profileBackground.startsWith('data:video/') ? (
                    <video src={profileBackground} className="w-full h-32 object-cover rounded-lg" controls />
                  ) : (
                    <img src={profileBackground} alt="Background preview" className="w-full h-32 object-cover rounded-lg" />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setProfileBackground('')}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="onlineStatus">Online Status Visibility</Label>
              <Select value={onlineStatus} onValueChange={(value) => setOnlineStatus(value as OnlineStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>Online (Show when active)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="offline">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>Offline (Always show as offline)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="hidden">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      <span>Hidden (Don't show status)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploadingBg}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

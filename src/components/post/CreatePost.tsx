import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { createPost } from "@/lib/firestore";
import { rewritePostContent } from "@/lib/ai";
import { toast } from "@/hooks/use-toast";
import { Image as ImageIcon, X, Loader2, Sparkles } from "lucide-react";

interface CreatePostProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePost({ open, onOpenChange }: CreatePostProps) {
  const { user, hasPermission } = useAuth();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [asOfficial, setAsOfficial] = useState(false);

  const canOfficial = hasPermission(["admin", "official"]);
  const canAnnouncement = hasPermission(["admin", "teacher", "official"]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Limit to 1 media file to prevent Firestore document size overflow
    if (media.length >= 1) {
      toast({ title: "Max 1 media file per post", variant: 'destructive' });
      return;
    }

    Array.from(files).forEach((file) => {
      if (media.length >= 1) return; // Skip if already have 1 file
      
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        toast({ title: "Unsupported file type", description: "Please select images or videos only", variant: "destructive" });
        return;
      }
      
      // Uploads go to Cloudinary/Storage; Firestore only stores URLs
      // Images: 20MB max; Videos: 50MB max
      const maxSize = isVideo ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({ 
          title: "File too large", 
          description: isVideo ? "Videos must be under 50MB. Try compressing or shorter clip." : "Images must be under 20MB.", 
          variant: "destructive" 
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMedia((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const onPost = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Log in to create a post." });
      return;
    }
    if (!content.trim() && media.length === 0) {
      toast({ title: "Add some content", description: "Post cannot be empty." });
      return;
    }
    setBusy(true);
    setUploadProgress(0);
    try {
      const authorType: "user" | "club" | "official" = asOfficial && canOfficial ? "official" : "user";
      const type: "post" | "announcement" | "official" = asOfficial && canOfficial ? "official" : isAnnouncement && canAnnouncement ? "announcement" : "post";
      
      // Create post with progress tracking
      await createPost(
        { authorId: user.id, authorType, content: content.trim(), media: media.length > 0 ? media : undefined, type },
        (progress) => setUploadProgress(progress)
      );
      
      // Wait 1 second to ensure Firestore write completes before showing UI
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setContent("");
      setMedia([]);
      setIsAnnouncement(false);
      setAsOfficial(false);
      onOpenChange(false);
      toast({ title: "Posted!" });
    } catch (e) {
      const error = e as Error;
      let message = error.message;
      
      // Handle Firestore document size limit errors
      if (error.message.includes("1048487") || error.message.includes("larger than")) {
        message = "Media file is too large for Firestore. Try a shorter or lower quality video.";
      }
      
      toast({ title: "Could not post", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const improveWithAI = async () => {
    if (!content.trim()) return;
    const res = await rewritePostContent(content);
    setContent(res.improved);
    toast({ title: "AI suggestion applied" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create post</DialogTitle>
          <DialogDescription>Share with the KCIS community</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            placeholder="Share something with your KCIS community..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
          />

          {media.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {media.map((mediaItem, idx) => (
                <div key={idx} className="relative group">
                  {mediaItem.startsWith('data:video/') ? (
                    <video src={mediaItem} className="w-full h-32 object-cover rounded-lg" controls />
                  ) : (
                    <img src={mediaItem} alt={`Upload ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                  )}
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("media-upload")?.click()}
              disabled={busy}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Add Media
            </Button>
            <input
              id="media-upload"
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 select-none">
              <input
                type="checkbox"
                className="accent-primary"
                checked={isAnnouncement}
                onChange={(e) => setIsAnnouncement(e.target.checked)}
                disabled={!canAnnouncement || asOfficial}
              />
              <span>Announcement</span>
            </label>
            {canOfficial && (
              <label className="flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={asOfficial}
                  onChange={(e) => setAsOfficial(e.target.checked)}
                />
                <span>Official</span>
              </label>
            )}
          </div>

          {busy && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Uploading media...</span>
                <span className="text-primary font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div 
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={improveWithAI} disabled={!content.trim() || busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              AI
            </Button>
            <Button className="flex-1" onClick={onPost} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadProgress > 0 && uploadProgress < 100 ? `${Math.round(uploadProgress)}%` : "Posting..."}
                </>
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

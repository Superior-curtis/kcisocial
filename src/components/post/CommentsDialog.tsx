import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listenToComments, addComment, uploadMedia } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Image as ImageIcon, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CommentItem {
  id: string;
  authorId: string;
  content: string;
  imageUrl?: string;
  mediaType?: string;
  createdAt: Date;
}

export function CommentsDialog({ open, onOpenChange, postId }: { open: boolean; onOpenChange: (v: boolean) => void; postId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Popular emojis
  const emojis = ["😊", "😂", "❤️", "👍", "🎉", "😍", "🔥", "✨", "💯", "👏", "😎", "🙌"];

  useEffect(() => {
    if (!open) return;
    const unsub = listenToComments(postId, (rows) => {
      setComments(
        rows.map((r: any) => ({
          id: r.id,
          authorId: r.authorId,
          content: r.content,
          imageUrl: r.imageUrl,
          mediaType: r.mediaType,
          createdAt: r.createdAt?.toDate?.() ?? new Date(),
        }))
      );
    });
    return () => unsub();
  }, [open, postId]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast({ title: 'Please select an image or video', variant: 'destructive' });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 15MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      console.log('Uploading comment media:', file.name, file.type, file.size);
      const url = await uploadMedia(file, 'comments');
      console.log('Upload successful:', url);
      setImageUrl(url);
      setMediaType(file.type);
      toast({ title: 'Media uploaded successfully' });
    } catch (err) {
      console.error('Comment media upload error:', err);
      toast({ title: 'Failed to upload media', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!user || (!text.trim() && !imageUrl)) return;
    try {
      await addComment({ 
        postId, 
        authorId: user.id, 
        content: text.trim(),
        imageUrl: imageUrl || undefined,
        mediaType: mediaType || undefined,
      });
      setText("");
      setImageUrl(null);
      setMediaType(null);
    } catch (err) {
      toast({ title: 'Failed to post comment', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
          <DialogDescription>Join the conversation</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <span>{c.authorId === user?.id ? "You" : c.authorId}</span>
                <span>·</span>
                <span>{formatDistanceToNow(c.createdAt, { addSuffix: true })}</span>
              </div>
              {c.content && <div className="mt-1">{c.content}</div>}
              {c.imageUrl && (
                c.mediaType?.startsWith('video') ? (
                  <video 
                    controls
                    src={c.imageUrl}
                    className="mt-2 rounded-lg max-h-64 w-full object-cover"
                  />
                ) : (
                  <img 
                    src={c.imageUrl} 
                    alt="Comment attachment" 
                    className="mt-2 rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition"
                    onClick={() => window.open(c.imageUrl, '_blank')}
                  />
                )
              )}
            </div>
          ))}
          {comments.length === 0 && (
            <div className="text-center text-muted-foreground text-sm">No comments yet</div>
          )}
        </div>
        
        {/* Image preview */}
        {imageUrl && (
          <div className="relative inline-block">
            {mediaType?.startsWith('video') ? (
              <video src={imageUrl} className="rounded-lg max-h-32" controls />
            ) : (
              <img src={imageUrl} alt="Preview" className="rounded-lg max-h-32 object-cover" />
            )}
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={() => {
                setImageUrl(null);
                setMediaType(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {/* Emoji picker */}
        <div className="flex gap-1 flex-wrap">
          {emojis.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-lg hover:scale-110 transition"
              onClick={() => setText((prev) => prev + emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !!imageUrl}
            title="Add image"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Input 
            placeholder="Write a comment" 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button onClick={submit} disabled={(!text.trim() && !imageUrl) || !user || uploading}>
            {uploading ? 'Uploading...' : 'Post'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

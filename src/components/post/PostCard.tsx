import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, BadgeCheck, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Post } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { toggleLike, toggleSavePost, deletePost } from '@/lib/firestore';
import { toast } from '@/hooks/use-toast';
import { CommentsDialog } from '@/components/post/CommentsDialog';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const { user } = useAuth();
  const [openComments, setOpenComments] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLiked(post.isLiked || false);
    setLikesCount(post.likesCount);
  }, [post.id, post.isLiked, post.likesCount]);

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Log in to like posts." });
      return;
    }

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    if (nextLiked) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }

    try {
      await toggleLike(post.id, user.id);
    } catch (error) {
      console.error("Toggle like failed", error);
      setIsLiked(!nextLiked);
      setLikesCount((prev) => (nextLiked ? Math.max(0, prev - 1) : prev + 1));
      toast({ title: "Could not update like", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Log in to save posts." });
      return;
    }

    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      await toggleSavePost(post.id, user.id);
      toast({ 
        title: nextSaved ? "Post saved" : "Post unsaved", 
        description: nextSaved ? "Added to your saved posts" : "Removed from saved posts" 
      });
    } catch (error) {
      console.error("Toggle save failed", error);
      setIsSaved(!nextSaved);
      toast({ title: "Could not update saved", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.author.displayName}`,
          text: post.content,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error("Share failed", error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link copied", description: "Post link copied to clipboard" });
      } catch (error) {
        toast({ title: "Could not copy link", variant: "destructive" });
      }
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    
    const isAdmin = user.role === 'admin';
    const isOwner = post.authorId === user.id;
    
    if (!isAdmin && !isOwner) {
      toast({ title: "Permission denied", description: "You can only delete your own posts.", variant: "destructive" });
      return;
    }
    
    const message = isAdmin && !isOwner ? 'Delete this post as admin?' : 'Delete this post?';
    if (!confirm(message)) return;
    
    setIsDeleting(true);
    try {
      await deletePost(post.id, user.id);
      toast({ title: "Post deleted", description: "Post has been removed" });
    } catch (error) {
      console.error("Delete failed", error);
      toast({ title: "Could not delete post", description: (error as Error).message, variant: "destructive" });
      setIsDeleting(false);
    }
  };

  const handleUserClick = () => {
    navigate(`/profile/${post.author.id}`);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'teacher': return 'bg-warning/10 text-warning';
      case 'admin': return 'bg-destructive/10 text-destructive';
      case 'official': return 'bg-primary/10 text-primary';
      case 'club': return 'bg-success/10 text-success';
      default: return '';
    }
  };

  const nextMedia = () => {
    if (post.images && post.images.length > 1) {
      setCurrentMediaIndex((prev) => (prev + 1) % post.images!.length);
    }
  };

  const prevMedia = () => {
    if (post.images && post.images.length > 1) {
      setCurrentMediaIndex((prev) => (prev - 1 + post.images!.length) % post.images!.length);
    }
  };

  const isVideo = (url: string) => {
    return url.startsWith('data:video/') || url.match(/\.(mp4|webm|ogg)$/i);
  };

  if (isDeleting) return null;

  return (
    <article className="bg-card border-b border-border/50 animate-fade-in">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleUserClick}>
          <Avatar className="w-10 h-10 ring-2 ring-primary/20">
            <AvatarImage src={post.author.avatar} alt={post.author.displayName} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {post.author.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm">{post.author.username}</span>
              {post.author.isVerified && (
                <BadgeCheck className="w-4 h-4 text-primary fill-primary/20" />
              )}
              {post.author.role !== 'student' && (
                <span className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize',
                  getRoleBadgeColor(post.author.role)
                )}>
                  {post.author.role}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(post.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>
        
        {user && (user.id === post.authorId || user.role === 'admin') && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-destructive" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Deleting...' : (user.role === 'admin' && user.id !== post.authorId) ? 'Delete (Admin)' : 'Delete Post'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {user && user.id !== post.authorId && user.role !== 'admin' && (
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Post Media (Images/Videos) */}
      {((post.images && post.images.length > 0) || (post.media && post.media.length > 0)) ? (
        <div className="relative aspect-square bg-muted group">
          {isVideo((post.images || post.media)?.[currentMediaIndex] || '') ? (
            <video
              key={currentMediaIndex}
              src={(post.images || post.media)?.[currentMediaIndex]}
              className="w-full h-full object-cover"
              controls
              playsInline
            />
          ) : (
            <img
              src={(post.images || post.media)?.[currentMediaIndex]}
              alt="Post content"
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Navigation Buttons for Multiple Images */}
          {(post.images || post.media)!.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={prevMedia}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={nextMedia}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
              
              {/* Dots Indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {(post.images || post.media)?.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentMediaIndex(idx)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      idx === currentMediaIndex ? "bg-white w-4" : "bg-white/60"
                    )}
                  />
                ))}
              </div>
            </>
          )}
          
          {/* Double-tap like animation */}
          {isAnimating && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart className="w-24 h-24 text-primary-foreground fill-primary animate-heart-beat drop-shadow-lg" />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 p-6 text-center border-b border-border/50">
          <p className="text-sm text-muted-foreground italic">No media attached</p>
        </div>
      )}

      {/* Post Content */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{post.content}</p>
      </div>

      {/* Post Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={handleLike}
              className={cn(isLiked && 'text-destructive')}
            >
              <Heart 
                className={cn(
                  'w-6 h-6 transition-all duration-200',
                  isLiked && 'fill-current animate-scale-in'
                )} 
              />
            </Button>
            <Button 
              variant="ghost" 
              size="icon-sm"
              onClick={() => setOpenComments(true)}
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon-sm"
              onClick={handleShare}
            >
              <Send className="w-6 h-6" />
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon-sm"
            onClick={handleSave}
          >
            <Bookmark 
              className={cn(
                'w-6 h-6 transition-all duration-200',
                isSaved && 'fill-current'
              )} 
            />
          </Button>
        </div>

        {/* Likes Count */}
        <p className="font-semibold text-sm mb-2">
          {likesCount.toLocaleString()} likes
        </p>

        {/* Caption */}
        <div className="text-sm">
          <span className="font-semibold mr-2">{post.author.username}</span>
          <span className="text-foreground">{post.content}</span>
        </div>

        {/* Comments Preview */}
        {post.commentsCount > 0 && (
          <button
            className="text-sm text-muted-foreground mt-2 hover:text-foreground transition-colors"
            onClick={() => setOpenComments(true)}
          >
            View all {post.commentsCount} comments
          </button>
        )}
      </div>

      <CommentsDialog open={openComments} onOpenChange={setOpenComments} postId={post.id} />
    </article>
  );
}

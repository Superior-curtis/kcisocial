import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Grid3X3, Bookmark, LogOut, BadgeCheck, Heart, MessageCircle, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Post } from '@/types';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PostCard } from '@/components/post/PostCard';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [saved, setSaved] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  const isVideo = (url: string) => {
    if (!url) return false;
    return url.includes('video') || /\.(mp4|webm|ogg|mov)$/i.test(url);
  };

  // Real-time listener for user posts
  useEffect(() => {
    if (!user?.id) return;
    
    setLoading(true);
    const q = query(
      collection(firestore, 'posts'),
      where('authorId', '==', user.id),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userPosts: Post[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Ensure author data exists
        const post: Post = {
          id: doc.id,
          ...data,
          author: data.author || { 
            id: data.authorId || user?.id || '', 
            displayName: user?.displayName || 'Unknown', 
            username: user?.username || 'unknown', 
            email: user?.email || '', 
            role: 'student', 
            avatar: user?.avatar || '', 
            bio: '', 
            followersCount: 0, 
            followingCount: 0, 
            postsCount: 0, 
            isVerified: false, 
            createdAt: new Date() 
          },
          createdAt: data.createdAt?.toDate?.() || new Date()
        } as Post;
        userPosts.push(post);
      });
      setPosts(userPosts);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.id]);

  // Real-time listener for saved posts
  useEffect(() => {
    if (!user?.id) return;
    
    const q = query(
      collection(firestore, 'saved'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postIds = snapshot.docs.map(doc => doc.data().postId);
      if (postIds.length === 0) {
        setSaved([]);
        return;
      }
      
      // Fetch actual posts in batches (Firestore 'in' limit is 10)
      const savedPosts: Post[] = [];
      for (let i = 0; i < postIds.length; i += 10) {
        const batch = postIds.slice(i, i + 10);
        const postsQuery = query(
          collection(firestore, 'posts'),
          where('__name__', 'in', batch)
        );
        const postsSnapshot = await getDocs(postsQuery);
        postsSnapshot.forEach(doc => {
          const data = doc.data();
          savedPosts.push({ 
            id: doc.id, 
            ...data,
            author: data.author || { id: data.authorId, displayName: 'Unknown', username: 'unknown', email: '', role: 'student', avatar: '', bio: '', followersCount: 0, followingCount: 0, postsCount: 0, isVerified: false, createdAt: new Date() },
            createdAt: data.createdAt?.toDate?.() || new Date()
          } as Post);
        });
      }
      setSaved(savedPosts);
    });
    
    return () => unsubscribe();
  }, [user?.id]);

  if (!user) {
    return null;
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'teacher': return { label: 'Teacher', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
      case 'admin': return { label: 'Administrator', className: 'bg-red-600/10 text-red-600 border-red-600/20' };
      case 'official': return { label: 'Verified', className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
      case 'club': return { label: 'Club', className: 'bg-green-500/10 text-green-500 border-green-500/20' };
      default: return { label: 'Student', className: 'bg-secondary text-secondary-foreground border-border' };
    }
  };

  const roleBadge = getRoleBadge(user.role);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'hidden': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'hidden': return 'Status Hidden';
      default: return 'Status Hidden';
    }
  };

  // Debug: Log profile background value
  // Debug log - show only first 50 chars of background to avoid console spam
  console.log('Profile - user.profileBackground:', user?.profileBackground?.substring(0, 50) + '...');

  return (
    <AppLayout title={user.username} showSearch={false} showCreate={false} noBackground={true} disableTheme={true}>
      {user ? (
        <>
          {/* Profile Background - Full screen behind everything */}
          <div className="fixed inset-0 w-full h-full" style={{ zIndex: -20 }}>
            {user.profileBackground ? (
              isVideo(user.profileBackground) ? (
                <>
                  <video 
                    src={user.profileBackground} 
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                  />
                  <div className="absolute inset-0 bg-black/40"></div>
                </>
              ) : (
                <div 
                  className="absolute inset-0 w-full h-full"
                  style={{
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${user.profileBackground})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              )
            ) : (
              <div 
                className="absolute inset-0 w-full h-full"
                style={{
                  backgroundImage: "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url('/roadimg.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              />
            )}
          </div>
          {/* Content overlay on background */}
          <div className="animate-fade-in relative z-0">
            {/* Profile Header with semi-transparent background */}
            <div className="p-4 sm:p-6 bg-background/70 backdrop-blur-sm">
          <div className="flex items-start gap-3 sm:gap-6 mb-4 sm:mb-6">
            <div className="relative">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 ring-2 sm:ring-4 ring-primary/20 shadow-lg">
                <AvatarImage src={user.avatar} alt={user.displayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg sm:text-2xl font-bold">
                  {user.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-background rounded-full px-2 py-0.5 border border-border">
                <div className={cn('w-2 h-2 rounded-full', getStatusColor(user.onlineStatus))}></div>
                <span className="text-[10px] font-medium">{getStatusLabel(user.onlineStatus)}</span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg sm:text-xl font-bold truncate">{user.displayName}</h1>
                {user.isVerified && (
                  <BadgeCheck className="w-5 h-5 text-primary fill-primary/20 flex-shrink-0" />
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <span className={cn(
                  'text-xs font-medium px-2 py-1 rounded-full border',
                  roleBadge.className
                )}>
                  {roleBadge.label}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground">{user.bio}</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-around py-3 sm:py-4 border-y border-border/50">
            <button className="text-center hover:opacity-70 transition-opacity">
              <div className="text-base sm:text-lg font-bold">{user.postsCount}</div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </button>
            <button className="text-center hover:opacity-70 transition-opacity">
              <div className="text-base sm:text-lg font-bold">{user.followersCount}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </button>
            <button className="text-center hover:opacity-70 transition-opacity">
              <div className="text-base sm:text-lg font-bold">{user.followingCount}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-3 sm:mt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setEditDialogOpen(true)}>
              Edit Profile
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-border bg-background/80">
          <button 
            onClick={() => setActiveTab('posts')}
            className={cn(
              "flex-1 py-3 flex items-center justify-center gap-2",
              activeTab === 'posts' 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground transition-colors"
            )}
          >
            <Grid3X3 className="w-5 h-5" />
            <span className="text-sm font-medium">Posts</span>
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={cn(
              "flex-1 py-3 flex items-center justify-center gap-2",
              activeTab === 'saved' 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground transition-colors"
            )}
          >
            <Bookmark className="w-5 h-5" />
            <span className="text-sm font-medium">Saved</span>
          </button>
        </div>
        
        {/* Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="aspect-square bg-muted animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : activeTab === 'posts' ? (
          posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {posts.map((post) => (
                <div 
                  key={post.id} 
                  className="aspect-square bg-muted relative group cursor-pointer overflow-hidden"
                  onClick={() => {
                    setSelectedPost(post);
                    setPostDialogOpen(true);
                  }}
                >
                  {(post.images && post.images.length > 0) || (post.media && post.media.length > 0) ? (
                    <>
                      {isVideo(post.images?.[0] || post.media?.[0] || '') ? (
                        <div className="relative w-full h-full bg-black">
                          <video 
                            src={post.images?.[0] || post.media?.[0] || ''}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                            <VideoIcon className="w-12 h-12 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={post.images?.[0] || post.media?.[0] || ''} 
                          alt="Post" 
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                        <div className="flex items-center gap-1">
                          <Heart className="w-5 h-5 fill-white" />
                          <span className="font-semibold">{post.likesCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-5 h-5 fill-white" />
                          <span className="font-semibold">{post.commentsCount}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4 relative group">
                      <div className="text-center space-y-2">
                        <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="text-xs text-muted-foreground line-clamp-3">{post.content}</p>
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                        <div className="flex items-center gap-1">
                          <Heart className="w-5 h-5 fill-white" />
                          <span className="font-semibold">{post.likesCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-5 h-5 fill-white" />
                          <span className="font-semibold">{post.commentsCount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          saved.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No saved posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {saved.map((post) => (
                <div 
                  key={post.id} 
                  className="aspect-square bg-muted relative group cursor-pointer overflow-hidden"
                  onClick={() => {
                    setSelectedPost(post);
                    setPostDialogOpen(true);
                  }}
                >
                  {(post.images && post.images.length > 0) || (post.media && post.media.length > 0) ? (
                    <>
                      {isVideo(post.images?.[0] || post.media?.[0] || '') ? (
                        <div className="relative w-full h-full bg-black">
                          <video 
                            src={post.images?.[0] || post.media?.[0] || ''}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                            <VideoIcon className="w-12 h-12 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={post.images?.[0] || post.media?.[0] || ''} 
                          alt="Post" 
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                        <div className="flex items-center gap-1">
                          <Heart className="w-5 h-5 fill-white" />
                          <span className="font-semibold">{post.likesCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-5 h-5 fill-white" />
                          <span className="font-semibold">{post.commentsCount}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4 relative group">
                      <div className="text-center space-y-2">
                        <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="text-xs text-muted-foreground line-clamp-3">{post.content}</p>
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                        <div className="flex items-center gap-1">
                          <Heart className="w-5 h-5 fill-white" />
                          <span className="font-semibold">{post.likesCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-5 h-5 fill-white" />
                          <span className="font-semibold">{post.commentsCount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                    <div className="flex items-center gap-1">
                      <Heart className="w-5 h-5 fill-white" />
                      <span className="font-semibold">{post.likesCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-5 h-5 fill-white" />
                      <span className="font-semibold">{post.commentsCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        
        {/* Logout Button */}
        <div className="p-4 bg-background/85">
          <Button 
            variant="outline" 
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={async () => {
              await logout();
              navigate('/auth');
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>
          </div>
        </>
      ) : (
        <div className="animate-fade-in relative z-10">
          <div className="p-6 bg-background/85 backdrop-blur-md">
            <div className="text-center py-12 text-muted-foreground">
              <p>Loading profile...</p>
            </div>
          </div>
        </div>
      )}
      
      <EditProfileDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      
      {/* Post Detail Dialog */}
      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto p-0" aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>Post Details</DialogTitle>
            </DialogHeader>
          </VisuallyHidden>
          {selectedPost && <PostCard post={selectedPost} />}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

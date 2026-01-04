import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BadgeCheck, Grid3X3, Bookmark, Heart, MessageCircle, Image as ImageIcon, MessageSquare, ArrowLeft, UserPlus, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserProfile, getUserPosts, isFollowing, toggleFollow } from '@/lib/firestore';
import { User, Post } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function UserProfile() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!uid) return;
    
    setLoading(true);
    setError(null);
    
    Promise.all([
      getUserProfile(uid).catch(err => {
        console.error('Failed to fetch user profile:', err);
        throw err;
      }),
      getUserPosts(uid).catch(err => {
        console.error('Failed to fetch user posts:', err);
        return [];
      })
    ]).then(([profile, userPosts]) => {
      setUser(profile);
      setPosts(userPosts || []);
      setLoading(false);
    }).catch(err => {
      console.error('Profile load error:', err);
      setError('Failed to load user profile');
      setLoading(false);
    });
  }, [uid]);

  useEffect(() => {
    if (!currentUser?.id || !uid || uid === currentUser.id) return;
    
    isFollowing(currentUser.id, uid).then((following) => {
      setIsFollowingUser(following);
    });
  }, [currentUser?.id, uid]);

  const handleToggleFollow = async () => {
    if (!currentUser?.id || !uid) return;
    setFollowLoading(true);
    try {
      await toggleFollow(currentUser.id, uid);
      setIsFollowingUser(!isFollowingUser);
      toast({ title: isFollowingUser ? "Unfollowed" : "Following", duration: 2000 });
    } catch (err) {
      console.error('Error toggling follow:', err);
      toast({ title: "Failed to update follow status", variant: 'destructive' });
    } finally {
      setFollowLoading(false);
    }
  };

  if (!user && loading) {
    return (
      <AppLayout title="Profile" showSearch={false} showCreate={false}>
        <div className="p-6 text-center text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  if (error || !user) {
    return (
      <AppLayout title="Profile" showSearch={false} showCreate={false}>
        <div className="p-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/feed')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center text-muted-foreground py-12">
            <p className="mb-4">{error || 'User not found'}</p>
          </div>
        </div>
      </AppLayout>
    );
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
  const isOwnProfile = currentUser?.id === uid;

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
      case 'hidden': return '';
      default: return '';
    }
  };

  const profileBackground = user.profileBackground || '/roadimg.png';

  return (
    <AppLayout title={user.username} showSearch={false} showCreate={false} disableTheme={true} noBackground={true}>
      <div className="animate-fade-in relative overflow-hidden">
        {/* Profile Background with Auth-style overlay */}
        <>
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: profileBackground.startsWith('data:video/') 
                ? 'none'
                : `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${profileBackground}), url(/profile-bg-2.svg)`,
              backgroundAttachment: "scroll",
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(8px)",
            }}
          />
          {profileBackground.startsWith('data:video/') && (
            <>
              <video 
                src={profileBackground} 
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay 
                loop 
                muted 
                playsInline
                style={{
                  filter: "blur(8px)",
                }}
              />
              <div className="absolute inset-0 bg-black/50"></div>
            </>
          )}
        </>
        
        {/* Profile Header */}
        <div className={cn("p-6 relative z-10", "bg-background/80 backdrop-blur-sm")}>
          <div className="flex items-start gap-6 mb-6">
            <div className="relative">
              <Avatar className="w-20 h-20 ring-4 ring-primary/20 shadow-lg">
                <AvatarImage src={user.avatar} alt={user.displayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {user.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {user.onlineStatus && user.onlineStatus !== 'hidden' && (
                <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-background rounded-full px-2 py-0.5 border border-border">
                  <div className={cn('w-2 h-2 rounded-full', getStatusColor(user.onlineStatus))}></div>
                  {getStatusLabel(user.onlineStatus) && (
                    <span className="text-[10px] font-medium">{getStatusLabel(user.onlineStatus)}</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold truncate">{user.displayName}</h1>
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
              
              <p className="text-sm text-muted-foreground">{user.bio || "No bio yet"}</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-around py-4 border-y border-border/50">
            <div className="text-center">
              <div className="text-lg font-bold">{user.postsCount}</div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{user.followersCount}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{user.followingCount}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </div>
          </div>
          
          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex gap-2 mt-4">
              <Button 
                variant="secondary" 
                className="flex-1"
                onClick={() => navigate(`/messages/${uid}`)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Button>
              <Button 
                variant={isFollowingUser ? "outline" : "default"}
                onClick={handleToggleFollow}
                disabled={followLoading}
              >
                {isFollowingUser ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          )}
          
          {isOwnProfile && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/profile')}
              >
                View My Profile
              </Button>
            </div>
          )}
        </div>
        
        {/* Posts Grid */}
        <div className="border-t border-border">
          <div className="p-3 flex items-center gap-2 text-primary">
            <Grid3X3 className="w-5 h-5" />
            <span className="text-sm font-medium">Posts</span>
          </div>
        </div>
        
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
        ) : posts.length === 0 ? (
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
              >
                {(post.images && post.images.length > 0) || (post.media && post.media.length > 0) ? (
                  <>
                    <img 
                      src={post.images?.[0] || post.media?.[0] || ''} 
                      alt="Post" 
                      className="w-full h-full object-cover"
                    />
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
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

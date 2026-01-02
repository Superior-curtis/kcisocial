import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, Info, Grid3X3, ArrowLeft, Heart, MessageCircle, Image as ImageIcon, MessageSquare, Send, Paperclip, Plus, Trash2, Crown, X, UserPlus } from 'lucide-react';
import { getDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getClubPosts, listenToClubMessages, createClubMessage, publishClubPost, uploadMedia, getClubMembers, kickMember, promoteMember, getUserProfile, inviteToClub, type UserRecord } from '@/lib/firestore';
import { Post, Message } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface Club {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  coverImage?: string;
  members: string[];
  admins: string[];
  createdBy: string;
  isApproved: boolean;
  postingPermission?: 'everyone' | 'admins-only';
}

export default function ClubDetail() {
  const { clubId } = useParams<{ clubId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postMedia, setPostMedia] = useState<string | null>(null);
  const [postMediaType, setPostMediaType] = useState<string | null>(null);
  const [postUploading, setPostUploading] = useState(false);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const [shareToFeed, setShareToFeed] = useState(true);
  const [creatingPost, setCreatingPost] = useState(false);
  const [members, setMembers] = useState<UserRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMemberForAction, setSelectedMemberForAction] = useState<string | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'kick' | 'promote'>('kick');
  const [joiningClub, setJoiningClub] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedUserToInvite, setSelectedUserToInvite] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [invitingUser, setInvitingUser] = useState(false);

  const isClubAdmin = user && club && (club.admins?.includes(user.id) || club.createdBy === user.id || user.role === 'admin');
  const isMember = user && club?.members?.includes(user.id);
  const canPost = user && club && (isClubAdmin || (isMember && club.postingPermission !== 'admins-only'));

  useEffect(() => {
    if (!clubId) return;

    const loadClub = async () => {
      try {
        const clubDoc = await getDoc(doc(firestore, 'clubs', clubId));
        if (clubDoc.exists()) {
          setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
        }
      } catch (error) {
        console.error('Failed to load club', error);
      } finally {
        setLoading(false);
      }
    };

    loadClub();
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    getClubPosts(clubId).then(setPosts).catch((err) => console.error('Failed to load club posts', err));
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    const unsubscribe = listenToClubMessages(clubId, setMessages);
    return () => unsubscribe();
  }, [clubId]);

  useEffect(() => {
    if (!clubId || activeTab !== 'members') return;
    
    const loadMembers = async () => {
      setLoadingMembers(true);
      try {
        const memberList = await getClubMembers(clubId);
        setMembers(memberList);
      } catch (err) {
        console.error('Failed to load club members:', err);
        toast({ title: 'Failed to load members', variant: 'destructive' });
      } finally {
        setLoadingMembers(false);
      }
    };
    
    loadMembers();
  }, [clubId, activeTab]);

  useEffect(() => {
    if (!clubId || activeTab !== 'applications' || !isClubAdmin) return;
    loadApplications();
  }, [clubId, activeTab, isClubAdmin]);

  const handleKickMember = async (memberId: string) => {
    if (!clubId || !user) return;
    try {
      await kickMember(clubId, memberId, user.id);
      setMembers(members.filter(m => m.id !== memberId));
      setActionDialogOpen(false);
      setSelectedMemberForAction(null);
      toast({ title: 'Member removed from club' });
    } catch (err) {
      console.error('Failed to kick member:', err);
      toast({ title: 'Failed to remove member', variant: 'destructive' });
    }
  };

  const handlePromoteMember = async (memberId: string) => {
    if (!clubId || !user) return;
    try {
      await promoteMember(clubId, memberId, user.id);
      // Reload club to update admins list
      const clubDoc = await getDoc(doc(firestore, 'clubs', clubId));
      if (clubDoc.exists()) {
        setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
      }
      setActionDialogOpen(false);
      setSelectedMemberForAction(null);
      toast({ title: 'Member promoted to admin' });
    } catch (err) {
      console.error('Failed to promote member:', err);
      toast({ title: 'Failed to promote member', variant: 'destructive' });
    }
  };

  const handleJoinLeaveClub = async () => {
    if (!clubId || !user) return;
    setJoiningClub(true);
    try {
      const { joinClub, leaveClub } = await import('@/lib/firestore');
      if (isMember) {
        await leaveClub(clubId, user.id);
      } else {
        await joinClub(clubId, user.id);
      }
      // Reload club
      const clubDoc = await getDoc(doc(firestore, 'clubs', clubId));
      if (clubDoc.exists()) {
        setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
      }
      toast({ title: isMember ? 'Left club' : 'Joined club' });
    } catch (err) {
      console.error('Failed to join/leave club:', err);
      toast({ title: 'Failed to update membership', variant: 'destructive' });
    } finally {
      setJoiningClub(false);
    }
  };

  const handleDeleteClub = async () => {
    if (!clubId || !user || !club) return;
    
    if (!confirm(`Are you sure you want to delete "${club.name}"? This cannot be undone.`)) {
      return;
    }

    setJoiningClub(true);
    try {
      const { deleteClub } = await import('@/lib/firestore');
      await deleteClub(clubId, user.id);
      toast({ title: 'Club deleted successfully' });
      navigate('/clubs');
    } catch (err) {
      console.error('Failed to delete club:', err);
      toast({ title: 'Failed to delete club', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setJoiningClub(false);
    }
  };

  const loadApplications = async () => {
    if (!clubId) return;
    setLoadingApps(true);
    try {
      const { getClubApplications } = await import('@/lib/firestore');
      const apps = await getClubApplications(clubId);
      setApplications(apps.filter(app => app.status === 'pending'));
    } catch (err) {
      console.error('Failed to load applications:', err);
      toast({ title: 'Failed to load applications', variant: 'destructive' });
    } finally {
      setLoadingApps(false);
    }
  };

  const handleApproveApplication = async (applicationId: string, userId: string) => {
    if (!clubId || !user) return;
    try {
      const { approveClubApplication } = await import('@/lib/firestore');
      await approveClubApplication(applicationId, clubId, user.id);
      setApplications(applications.filter(app => app.id !== applicationId));
      toast({ title: 'Application approved!' });
      // Reload club
      const clubDoc = await getDoc(doc(firestore, 'clubs', clubId));
      if (clubDoc.exists()) {
        setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
      }
    } catch (err) {
      console.error('Failed to approve application:', err);
      toast({ title: 'Failed to approve application', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleDenyApplication = async (applicationId: string) => {
    if (!clubId || !user) return;
    try {
      const { denyClubApplication } = await import('@/lib/firestore');
      await denyClubApplication(applicationId, clubId, user.id);
      setApplications(applications.filter(app => app.id !== applicationId));
      toast({ title: 'Application denied' });
    } catch (err) {
      console.error('Failed to deny application:', err);
      toast({ title: 'Failed to deny application', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleOpenInviteDialog = async () => {
    setInviteDialogOpen(true);
    // Load available users to invite (exclude current members)
    setLoadingAllUsers(true);
    try {
      const { getAllUsers } = await import('@/lib/firestore');
      const allUsersData = await getAllUsers();
      // Filter out current club members
      const availableUsers = allUsersData.filter(
        (u: UserRecord) => !club?.members?.includes(u.id) && u.id !== user?.id
      );
      setAllUsers(availableUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      toast({ title: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoadingAllUsers(false);
    }
  };

  const handleInviteUser = async (userId: string) => {
    if (!clubId || !user) return;
    setInvitingUser(true);
    try {
      await inviteToClub(clubId, userId, user.id);
      toast({ title: 'User invited successfully!' });
      setSelectedUserToInvite(null);
      // Reload available users
      const { getAllUsers } = await import('@/lib/firestore');
      const allUsersData = await getAllUsers();
      const availableUsers = allUsersData.filter(
        (u: UserRecord) => !club?.members?.includes(u.id) && u.id !== user?.id
      );
      setAllUsers(availableUsers);
    } catch (err) {
      console.error('Failed to invite user:', err);
      toast({ title: 'Failed to invite user', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setInvitingUser(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !clubId) return;
    if (!newMessage.trim() && !mediaUrl) return;
    
    // Check if user is a member
    if (!isMember) {
      toast({ title: 'You must join the club to send messages', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      await createClubMessage(clubId, user.id, newMessage, mediaUrl || undefined, mediaType || undefined);
      setNewMessage('');
      setMediaUrl(null);
      setMediaType(null);
    } catch (err) {
      console.error(err);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      alert('Please select an image or video');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('File too large (max 20MB)');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMedia(file, 'club-messages');
      setMediaUrl(url);
      setMediaType(file.type);
    } catch (err) {
      console.error(err);
      alert('Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const handlePostAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast({ title: 'Please select an image or video', variant: 'destructive' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 20MB per file', variant: 'destructive' });
      return;
    }
    
    setPostUploading(true);
    try {
      const url = await uploadMedia(file, 'club-posts');
      setPostMedia(url);
      setPostMediaType(file.type);
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to upload media', variant: 'destructive' });
    } finally {
      setPostUploading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !clubId || !club) return;
    if (!postContent.trim() && !postMedia) {
      toast({ title: 'Please enter post content or add an image/video', variant: 'destructive' });
      return;
    }

    setCreatingPost(true);
    try {
      await publishClubPost({
        clubId,
        authorId: user.id,
        content: postContent,
        media: postMedia ? [postMedia] : undefined,
        alsoPushToFeed: shareToFeed,
      });
      
      toast({ title: 'Post created successfully!' });
      setPostContent('');
      setPostMedia(null);
      setPostMediaType(null);
      setShareToFeed(true);
      setPostDialogOpen(false);
      
      // Refresh posts
      getClubPosts(clubId).then(setPosts).catch((err) => console.error('Failed to reload club posts', err));
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to create post', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setCreatingPost(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Club" showCreate={false}>
        <div className="p-6 text-center text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  if (!club) {
    return (
      <AppLayout title="Club" showCreate={false}>
        <div className="p-6 text-center text-muted-foreground">Club not found</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={club.name} showSearch={false} showCreate={false}>
      <div className="animate-fade-in">
        {/* Back Button */}
        <div className="p-4 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => navigate('/clubs')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clubs
          </Button>
        </div>

        {/* Cover Image */}
        {club.coverImage && (
          <div className="relative w-full h-48 bg-gradient-to-br from-primary/20 to-accent">
            <img 
              src={club.coverImage} 
              alt={club.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {!club.coverImage && (
          <div className="relative w-full h-48 bg-gradient-to-br from-primary/20 to-accent" />
        )}

        {/* Club Info */}
        <div className="p-6 -mt-16 relative">
          <Avatar className="w-24 h-24 ring-4 ring-background shadow-xl">
            <AvatarImage src={club.avatar} alt={club.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
              {club.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="mt-4">
            <h1 className="text-2xl font-bold">{club.name}</h1>
            <p className="text-muted-foreground mt-2">{club.description}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm">{club.members?.length || 0} members</span>
            </div>
            {!club.isApproved && (
              <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full border border-warning/20">
                Pending Approval
              </span>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-4 space-y-2">
            <Button 
              className="w-full"
              onClick={handleJoinLeaveClub}
              disabled={joiningClub}
              variant={isMember ? 'outline' : 'default'}
            >
              <Users className="w-4 h-4 mr-2" />
              {joiningClub ? 'Loading...' : (isMember ? 'Leave Club' : 'Join Club')}
            </Button>

            {isClubAdmin && (
              <Button
                className="w-full"
                variant="destructive"
                onClick={handleDeleteClub}
                disabled={joiningClub}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Club
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="border-t border-border">
          <TabsList className="w-full justify-start rounded-none border-b h-12">
            <TabsTrigger value="posts" className="gap-2">
              <Grid3X3 className="w-4 h-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
            {isClubAdmin && (
              <TabsTrigger value="applications" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Applications
              </TabsTrigger>
            )}
            <TabsTrigger value="about" className="gap-2">
              <Info className="w-4 h-4" />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-0">
            {canPost && (
              <div className="p-4 border-b border-border">
                <Button onClick={() => setPostDialogOpen(true)} className="w-full" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Club Post
                </Button>
              </div>
            )}
            
            {posts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No posts yet</p>
                {canPost && <p className="text-sm mt-2">Be the first to post!</p>}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.map((post) => (
                  <div 
                    key={post.id} 
                    className="aspect-square bg-muted relative group cursor-pointer overflow-hidden"
                  >
                    {post.images && post.images.length > 0 ? (
                      <>
                        <img 
                          src={post.images[0]} 
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
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="p-0">
            <div className="flex flex-col h-[calc(100vh-20rem)]">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${isMine ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}>
                        {msg.mediaUrl && (
                          msg.mediaType?.startsWith('video') ? (
                            <video src={msg.mediaUrl} controls className="rounded-lg mb-2 max-h-64 w-full" />
                          ) : (
                            <img src={msg.mediaUrl} alt="message media" className="rounded-lg mb-2 max-h-64 w-full object-cover" loading="lazy" />
                          )
                        )}
                        {msg.content && <div>{msg.content}</div>}
                        <div className="text-[10px] opacity-70 mt-1 text-right">{formatDistanceToNow(msg.createdAt, { addSuffix: true })}</div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground mt-10 text-sm">No messages yet. Start the conversation!</div>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2 border-t border-border/50">
                {!isMember && (
                  <div className="text-center text-muted-foreground text-sm py-3">
                    Join the club to send messages
                  </div>
                )}
                {isMember && (
                  <>
                    {mediaUrl && (
                      <div className="relative inline-block">
                        {mediaType?.startsWith('video') ? (
                          <video src={mediaUrl} className="max-h-40 rounded-lg" controls />
                        ) : (
                          <img src={mediaUrl} alt="attachment" className="max-h-40 rounded-lg" loading="lazy" />
                        )}
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-7 w-7"
                          onClick={() => {
                            setMediaUrl(null);
                            setMediaType(null);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <Paperclip className="w-5 h-5 text-muted-foreground hover:text-foreground transition" />
                        <input type="file" accept="image/*,video/*" onChange={handleAttach} className="hidden" disabled={uploading} />
                      </label>
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        disabled={sending || uploading}
                      />
                      <Button size="icon" onClick={handleSendMessage} disabled={sending || uploading || (!newMessage.trim() && !mediaUrl)}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Admins ({club.admins?.length || 0})
                </h3>
                {isClubAdmin && (
                  <Button
                    onClick={handleOpenInviteDialog}
                    size="sm"
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite Member
                  </Button>
                )}
              </div>
              <div className="space-y-3 mb-6">
                {club.admins && club.admins.length > 0 ? (
                  members.filter(m => club.admins?.includes(m.id)).map((admin) => (
                    <div key={admin.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-accent/30">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={admin.photoURL} alt={admin.displayName} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {admin.displayName?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {admin.displayName || admin.username}
                          <Crown className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div className="text-sm text-muted-foreground">@{admin.username}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm py-2">No admins yet</div>
                )}
              </div>

              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Members ({club.members?.length || 0})
              </h3>
              {loadingMembers ? (
                <div className="text-center text-muted-foreground py-8">Loading members...</div>
              ) : members.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No members yet</div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => {
                    const isAdmin = club.admins?.includes(member.id) || club.createdBy === member.id;
                    const isCurrentUserCreator = club.createdBy === user?.id;
                    const canManage = isCurrentUserCreator || (club.admins?.includes(user?.id || '') && !isAdmin);
                    
                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${member.id}`)}>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.profileImageUrl} alt={member.displayName} />
                            <AvatarFallback>{member.displayName?.charAt(0)?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm flex items-center gap-2">
                              {member.displayName || member.username}
                              {isAdmin && <Crown className="w-4 h-4 text-yellow-500" />}
                            </p>
                            <p className="text-xs text-muted-foreground">@{member.username}</p>
                          </div>
                        </div>
                        
                        {isClubAdmin && canManage && member.id !== user?.id && (
                          <div className="flex gap-2">
                            {!isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedMemberForAction(member.id);
                                  setActionType('promote');
                                  setActionDialogOpen(true);
                                }}
                              >
                                <Crown className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedMemberForAction(member.id);
                                setActionType('kick');
                                setActionDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="applications" className="mt-0">
            {!isClubAdmin ? (
              <div className="p-6 text-center">
                <p className="text-muted-foreground">Only club admins can view applications</p>
              </div>
            ) : (
              <div>
                <div className="p-4 border-b border-border">
                  <Button 
                    onClick={loadApplications} 
                    variant="outline" 
                    disabled={loadingApps}
                    className="w-full"
                  >
                    {loadingApps ? 'Loading...' : 'Refresh Applications'}
                  </Button>
                </div>
                
                {loadingApps ? (
                  <div className="p-6 text-center text-muted-foreground">Loading applications...</div>
                ) : applications.length === 0 ? (
                  <div className="p-6 text-center">
                    <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No pending applications</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {applications.map((app) => (
                      <div 
                        key={app.id} 
                        className="flex items-center justify-between p-4 border border-border rounded-lg bg-card"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {app.userInfo?.avatar ? (
                            <img 
                              src={app.userInfo.avatar} 
                              alt={app.userInfo.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{app.userInfo?.name || 'Unknown User'}</p>
                            <p className="text-xs text-muted-foreground">
                              Applied {app.createdAt ? formatDistanceToNow(app.createdAt, { addSuffix: true }) : 'recently'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveApplication(app.id, app.userId)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDenyApplication(app.id)}
                          >
                            Deny
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-0">
            <div className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                About
              </h3>
              <p className="text-foreground whitespace-pre-wrap">{club.description}</p>
              
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm font-medium">Recently</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Total Members</span>
                  <span className="text-sm font-medium">{club.members?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={cn(
                    "text-sm font-medium",
                    club.isApproved ? "text-success" : "text-warning"
                  )}>
                    {club.isApproved ? 'Approved' : 'Pending'}
                  </span>
                </div>
                
                {isClubAdmin && (
                  <>
                    <div className="pt-4">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Settings
                      </h4>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <div className="space-y-0.5">
                        <Label htmlFor="posting-permission" className="text-sm font-medium">
                          Posting Permission
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {club.postingPermission === 'admins-only' 
                            ? 'Only admins can create posts' 
                            : 'All members can create posts'}
                        </p>
                      </div>
                      <Switch
                        id="posting-permission"
                        checked={club.postingPermission === 'admins-only'}
                        onCheckedChange={async (checked) => {
                          if (!clubId || !user) return;
                          try {
                            const { updateClub } = await import('@/lib/firestore');
                            await updateClub(clubId, user.id, {
                              postingPermission: checked ? 'admins-only' : 'everyone'
                            });
                            setClub({ ...club, postingPermission: checked ? 'admins-only' : 'everyone' });
                            toast({ title: `Posting permission updated to: ${checked ? 'Admins only' : 'Everyone'}` });
                          } catch (err) {
                            console.error(err);
                            toast({ 
                              title: 'Failed to update posting permission', 
                              description: (err as Error).message, 
                              variant: 'destructive' 
                            });
                          }
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Post Dialog */}
        <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Club Post</DialogTitle>
              <DialogDescription>
                Post as {club.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="postContent">Content</Label>
                <Textarea
                  id="postContent"
                  placeholder="What's happening in the club?"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  rows={6}
                  className="mt-1.5"
                />
              </div>

              {/* Media Preview */}
              {postMedia && (
                <div className="relative w-full rounded-lg overflow-hidden bg-muted">
                  {postMediaType?.startsWith('video/') ? (
                    <video
                      src={postMedia}
                      className="w-full h-64 object-cover"
                      controls
                    />
                  ) : (
                    <img
                      src={postMedia}
                      alt="Preview"
                      className="w-full h-64 object-cover"
                    />
                  )}
                  <button
                    onClick={() => {
                      setPostMedia(null);
                      setPostMediaType(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}

              {/* Upload Button */}
              <div>
                <input
                  ref={postFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handlePostAttach}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => postFileInputRef.current?.click()}
                  disabled={postUploading}
                  className="w-full"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {postUploading ? 'Uploading...' : postMedia ? 'Change Media' : 'Add Image/Video'}
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="shareToFeed"
                  checked={shareToFeed}
                  onCheckedChange={setShareToFeed}
                />
                <Label htmlFor="shareToFeed" className="cursor-pointer">
                  Also share to main feed
                </Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setPostDialogOpen(false)} disabled={creatingPost}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePost} disabled={creatingPost || (!postContent.trim() && !postMedia)}>
                  {creatingPost ? 'Creating...' : 'Create Post'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Member Action Dialog */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'kick' ? 'Remove Member' : 'Promote to Admin'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'kick' 
                  ? 'Are you sure you want to remove this member from the club?' 
                  : 'Promote this member to club admin status?'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant={actionType === 'kick' ? 'destructive' : 'default'}
                onClick={() => {
                  if (selectedMemberForAction) {
                    if (actionType === 'kick') {
                      handleKickMember(selectedMemberForAction);
                    } else {
                      handlePromoteMember(selectedMemberForAction);
                    }
                  }
                }}
              >
                {actionType === 'kick' ? 'Remove' : 'Promote'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invite Member Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invite Member to {club?.name}</DialogTitle>
              <DialogDescription>
                Select a user to invite to join this club
              </DialogDescription>
            </DialogHeader>
            
            {loadingAllUsers ? (
              <div className="text-center py-6 text-muted-foreground">
                Loading available users...
              </div>
            ) : allUsers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No available users to invite
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {allUsers.map((inviteUser) => (
                  <div
                    key={inviteUser.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={inviteUser.profileImageUrl || inviteUser.avatar} alt={inviteUser.displayName} />
                        <AvatarFallback>{inviteUser.displayName?.charAt(0)?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{inviteUser.displayName || inviteUser.username}</p>
                        <p className="text-xs text-muted-foreground">@{inviteUser.username}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleInviteUser(inviteUser.id)}
                      disabled={invitingUser}
                      size="sm"
                    >
                      {invitingUser ? 'Inviting...' : 'Invite'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
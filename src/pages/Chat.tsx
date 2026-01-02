import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile, listenToConversationMessages, sendMessage, uploadMedia, toggleFollow, isFollowing, listenToGroupMessages, sendGroupMessage, markMessageAsRead, leaveGroupChat, deleteGroupChat, getGroupInfo, removeGroupMember } from "@/lib/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Paperclip, X, Sparkles, UserPlus, UserCheck, LogOut, Trash2, Users, Phone, Mic, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import VideoCall from "@/components/VideoCall";
import VoiceMessageRecorder from "@/components/VoiceMessageRecorder";
import AnonymousWall from "@/components/AnonymousWall";

export default function Chat() {
  const { uid: otherId } = useParams<{ uid: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [otherUserName, setOtherUserName] = useState<string>("");
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  
  // Check if this is a group chat
  const queryParams = new URLSearchParams(location.search);
  const isGroupChat = queryParams.get('group') === 'true';
  const isAnonymousWall = otherId === 'anonymous';

  // Handle anonymous wall display
  if (isAnonymousWall) {
    return (
      <AppLayout title="Messages" showCreate={false}>
        <div className="flex flex-col h-screen">
          {/* Header */}
          <div className="border-b p-4 flex items-center gap-3">
            <button onClick={() => navigate('/messages')} className="hover:opacity-70">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">Anonymous Wall</h1>
          </div>
          {/* Anonymous Wall Component */}
          <AnonymousWall compact={true} />
        </div>
      </AppLayout>
    );
  }

  useEffect(() => {
    if (!user || !otherId) return;
    
    // Different listeners for group vs individual chats
    let unsub: (() => void) | null = null;
    
    if (isGroupChat) {
      unsub = listenToGroupMessages(otherId, (rows) => setMessages(rows));
    } else {
      unsub = listenToConversationMessages(user.id, otherId, (rows) => setMessages(rows));
    }
    
    return () => unsub?.();
  }, [user?.id, otherId, isGroupChat]);

  useEffect(() => {
    if (!otherId) return;
    
    if (isGroupChat) {
      // For group chats, fetch group info
      (async () => {
        try {
          const { getGroupInfo } = await import('@/lib/firestore');
          const groupInfo = await getGroupInfo(otherId);
          if (groupInfo) {
            setOtherUserName(groupInfo.name || `Group (${groupInfo.memberCount} members)`);
          } else {
            setOtherUserName(`Group (${otherId?.split('-').length} members)`);
          }
        } catch (err) {
          console.error('Failed to load group info:', err);
          setOtherUserName(`Group (${otherId?.split('-').length} members)`);
        }
      })();
      return;
    }
    
    getUserProfile(otherId)
      .then((u) => {
        if (u) {
          setOtherUserName(u.displayName || u.username || otherId);
          setOtherUserProfile(u);
        } else {
          setOtherUserName('Unknown User');
          console.error('User profile not found:', otherId);
        }
      })
      .catch((error) => {
        console.error('Error loading user profile:', error);
        setOtherUserName('Unknown User');
      });
  }, [otherId, isGroupChat]);

  useEffect(() => {
    if (!user || !otherId) return;
    isFollowing(user.id, otherId).then((following) => {
      setIsFollowingUser(following);
    });
  }, [user?.id, otherId]);

  const handleToggleFollow = async () => {
    if (!user || !otherId) return;
    setFollowingLoading(true);
    try {
      await toggleFollow(user.id, otherId);
      setIsFollowingUser(!isFollowingUser);
      toast({ title: isFollowingUser ? "Unfollowed" : "Following", duration: 2000 });
    } catch (err) {
      console.error('Error toggling follow:', err);
      toast({ title: "Failed to update follow status", variant: 'destructive' });
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !otherId || !isGroupChat) return;
    if (!window.confirm('Leave this group chat?')) return;
    
    setGroupActionLoading(true);
    try {
      await leaveGroupChat(otherId, user.id);
      toast({ title: "Left group chat", duration: 2000 });
      navigate('/messages');
    } catch (err) {
      console.error('Error leaving group:', err);
      toast({ title: "Failed to leave group", variant: 'destructive' });
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!user || !otherId || !isGroupChat) return;
    if (!window.confirm('Delete this group chat? This action cannot be undone.')) return;
    
    setGroupActionLoading(true);
    try {
      await deleteGroupChat(otherId, user.id);
      toast({ title: "Group chat deleted", duration: 2000 });
      navigate('/messages');
    } catch (err) {
      console.error('Error deleting group:', err);
      toast({ title: "Failed to delete group", variant: 'destructive' });
    } finally {
      setGroupActionLoading(false);
    }
  };

  const loadGroupMembers = async () => {
    if (!otherId || !isGroupChat) return;
    
    setMembersLoading(true);
    try {
      const { getGroupInfo } = await import('@/lib/firestore');
      const info = await getGroupInfo(otherId);
      if (info) {
        setGroupInfo(info);
        
        // Load all member profiles
        const memberProfiles = [];
        for (const memberId of info.members) {
          try {
            const profile = await getUserProfile(memberId);
            if (profile) {
              memberProfiles.push(profile);
            }
          } catch (err) {
            console.warn('Failed to load member:', memberId);
          }
        }
        setGroupMembers(memberProfiles);
      }
    } catch (err) {
      console.error('Failed to load group members:', err);
      toast({ title: 'Failed to load members', variant: 'destructive' });
    } finally {
      setMembersLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !otherId || !isGroupChat) return;
    if (!window.confirm('Remove this member from the group?')) return;
    
    setMembersLoading(true);
    try {
      const { removeGroupMember } = await import('@/lib/firestore');
      await removeGroupMember(otherId, memberId, user.id);
      toast({ title: 'Member removed', duration: 2000 });
      // Reload members list
      await loadGroupMembers();
    } catch (err) {
      console.error('Error removing member:', err);
      toast({ title: 'Failed to remove member', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  // Mark messages as read when viewing chat
  useEffect(() => {
    if (!user || !messages.length || isGroupChat) return;
    
    // Mark all unread messages from the other user as read
    const unreadMessages = messages.filter(m => 
      m.senderId === otherId && 
      m.receiverId === user.id && 
      !m.isRead
    );
    
    unreadMessages.forEach(msg => {
      markMessageAsRead(msg.id).catch(err => 
        console.error('Failed to mark message as read:', err)
      );
    });
  }, [messages, user?.id, otherId, isGroupChat]);

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      alert("Please select an image, video, or GIF");
      return;
    }
    // Limit to 5MB for videos, 1.5MB for images
    const maxSize = isVideo ? 5 * 1024 * 1024 : 1.5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(isVideo ? "Video too large (max 5MB, ~2m30s)" : "File too large (max 1.5MB)");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMedia(file, "messages");
      setMediaUrl(url);
      setMediaType(file.type);
    } catch (err) {
      console.error(err);
      alert("Failed to upload media");
    } finally {
      setUploading(false);
    }
  };

  const send = async () => {
    if (!user || !otherId || (!text.trim() && !mediaUrl)) return;
    
    const messageText = text.trim();
    
    // Check for /gpt command - extract everything after '/gpt ' for text correction
    const gptMatch = messageText.match(/\/gpt\s+(.+)$/i);
    if (gptMatch && gptMatch[1]) {
      const textToCorrect = gptMatch[1].trim();
      
      // Clear input immediately to prevent double send
      setText('');
      const currentMediaUrl = mediaUrl;
      const currentMediaType = mediaType;
      setMediaUrl(null);
      setMediaType(null);
      
      // Show loading toast
      toast({ title: 'Correcting text with AI...', duration: 1000 });
      
      // Call GPT for correction
      try {
        const { correctText } = await import('@/lib/openai');
        const correctedText = await correctText(textToCorrect);
        
        // Send corrected message to appropriate destination
        if (isGroupChat) {
          await sendGroupMessage(otherId, user.id, correctedText, currentMediaUrl || undefined, currentMediaType || undefined);
        } else {
          await sendMessage({ 
            senderId: user.id, 
            receiverId: otherId, 
            content: correctedText, 
            mediaUrl: currentMediaUrl || undefined, 
            mediaType: currentMediaType || undefined
          });
        }
        
        toast({ title: 'Text corrected and sent!', duration: 2000 });
      } catch (err) {
        console.error('Error correcting text:', err);
        toast({ title: 'Failed to correct text', description: String(err), variant: 'destructive' });
        // Restore text on error
        setText(messageText);
      }
      return; // IMPORTANT: Return to prevent double send
    }
    
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      senderId: user.id,
      receiverId: isGroupChat ? '' : otherId,
      conversationId: otherId,
      content: messageText,
      mediaUrl,
      mediaType,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, tempMessage]);
    setText("");
    setMediaUrl(null);
    setMediaType(null);
    try {
      if (isGroupChat) {
        await sendGroupMessage(otherId, user.id, messageText, mediaUrl || undefined, mediaType || undefined);
      } else {
        await sendMessage({ senderId: user.id, receiverId: otherId, content: messageText, mediaUrl, mediaType });
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      alert("Failed to send message");
    }
  };

  const title = useMemo(() => otherUserName || "Chat", [otherUserName]);

  return (
    <AppLayout title={title} showCreate={false}>
      <div className="flex flex-col h-[calc(100vh-3.5rem-5rem)]">
        {/* Recipient Info Header */}
        <div className="border-b border-border/50 p-4 flex items-center justify-between">
          <button 
            onClick={() => !isGroupChat && otherId && navigate(`/profile/${otherId}`)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            disabled={isGroupChat}
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherUserProfile?.profileImageUrl} alt={otherUserName} />
                <AvatarFallback>{otherUserName?.charAt(0)?.toUpperCase()}</AvatarFallback>
              </Avatar>
              {!isGroupChat && otherUserProfile?.onlineStatus && otherUserProfile.onlineStatus !== 'hidden' && (
                <div className={cn(
                  'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background',
                  otherUserProfile.onlineStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
                )}></div>
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">{otherUserName}</p>
              {!isGroupChat && (
                <p className="text-xs text-muted-foreground">
                  {otherUserProfile?.onlineStatus === 'online' ? 'Online' : 
                   otherUserProfile?.onlineStatus === 'offline' ? 'Offline' : 
                   `${otherUserProfile?.followersCount || 0} followers`}
                </p>
              )}
            </div>
          </button>
          {isGroupChat ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowMembersDialog(true);
                  loadGroupMembers();
                }}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                Members
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeaveGroup}
                disabled={groupActionLoading}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Leave
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteGroup}
                disabled={groupActionLoading}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleFollow}
              disabled={followingLoading}
              className="gap-2"
            >
              {isFollowingUser ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Follow
                </>
              )}
            </Button>
          )}
        </div>
        
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
                  {m.mediaUrl && (
                    m.mediaType?.startsWith('video') ? (
                      <video src={m.mediaUrl} controls className="rounded-lg mb-2 max-h-64 w-full" />
                    ) : (
                      <img src={m.mediaUrl} alt="message media" className="rounded-lg mb-2 max-h-64 w-full object-cover" loading="lazy" />
                    )
                  )}
                  {m.content && <div>{m.content}</div>}
                  <div className="text-[10px] opacity-70 mt-1 text-right">{formatDistanceToNow(m.createdAt, { addSuffix: true })}</div>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground mt-10 text-sm">Say hi to start the conversation.</div>
          )}
        </div>
        <div className="p-3 flex flex-col gap-2 border-t border-border/50">
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
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleAttach}
            />
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Attach media">
              <Paperclip className="w-5 h-5" />
            </Button>
            {!isGroupChat && (
              <>
                <Button variant="ghost" size="icon" onClick={() => setShowVideoCall(true)} title="Start video/voice call">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowVoiceRecorder(true)} title="Send voice message">
                  <Mic className="w-5 h-5" />
                </Button>
              </>
            )}
            <Input placeholder="Message" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <Button onClick={send} disabled={uploading || (!text.trim() && !mediaUrl)}>Send</Button>
          </div>
        </div>
      </div>

      {/* Group Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Group Members ({groupMembers.length})</DialogTitle>
            <DialogDescription>
              {user?.id === groupInfo?.members?.[0] && 'You are the group creator'}
            </DialogDescription>
          </DialogHeader>

          {membersLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading members...</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {groupMembers.map((member) => {
                const isCreator = member.id === groupInfo?.members?.[0];
                const isCurrentUser = member.id === user?.id;
                const canRemove = user?.id === groupInfo?.members?.[0] && !isCurrentUser;

                return (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar} alt={member.displayName} />
                        <AvatarFallback>{member.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.displayName}</p>
                        {isCreator && <p className="text-xs text-muted-foreground">Creator</p>}
                        {isCurrentUser && <p className="text-xs text-muted-foreground">You</p>}
                      </div>
                    </div>
                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={membersLoading}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Call Dialog */}
      {showVideoCall && otherId && (
        <Dialog open={showVideoCall} onOpenChange={setShowVideoCall}>
          <DialogContent className="max-w-4xl h-[90vh]">
            <DialogHeader>
              <DialogTitle>Video Call with {otherUserName}</DialogTitle>
            </DialogHeader>
            <VideoCall 
              recipientId={otherId} 
              recipientName={otherUserName} 
              userId={user?.id || ''}
              userName={user?.displayName || 'User'}
              callType="video"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Voice Message Dialog */}
      {showVoiceRecorder && otherId && (
        <Dialog open={showVoiceRecorder} onOpenChange={setShowVoiceRecorder}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Voice Message</DialogTitle>
            </DialogHeader>
            <VoiceMessageRecorder 
              recipientId={otherId}
              onSend={async (audioBlob, duration) => {
                try {
                  const file = new File([audioBlob], 'voice-message.m4a', { type: 'audio/mp4' });
                  const mediaUrl = await uploadMedia(file);
                  await sendMessage(user?.id || '', otherId, `Voice message (${Math.round(duration)}s)`, mediaUrl, 'audio');
                  toast({ description: 'Voice message sent!' });
                  setShowVoiceRecorder(false);
                } catch (error) {
                  console.error('Failed to send voice message:', error);
                  toast({ description: 'Failed to send voice message', variant: 'destructive' });
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
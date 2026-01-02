import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';
import { useNavigate } from 'react-router-dom';
import { searchUsers } from '@/lib/firestore';
import { User } from '@/types';
import { Search, UserPlus, Bot, Sparkles, Users, X, Lock } from 'lucide-react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function Messages() {
  const { user } = useAuth();
  const { conversations, isLoading } = useConversations();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [recommended, setRecommended] = useState<User[]>([]);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<User[]>([]);  const [groupName, setGroupName] = useState("");  const [groupSearching, setGroupSearching] = useState(false);

  const safeDisplayName = (u: Partial<User> | undefined | null) =>
    u?.displayName || (u as any)?.name || u?.username || u?.email || 'User';

  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchUsers(value);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setSearching(false);
    }
  };

  const handleGroupSearch = async (value: string) => {
    setGroupSearchTerm(value);
    if (!value.trim()) {
      setGroupSearchResults([]);
      return;
    }
    setGroupSearching(true);
    try {
      const results = await searchUsers(value);
      // Filter out already selected members and current user
      const filtered = results.filter(u => 
        u.id !== user?.id && !groupMembers.find(m => m.id === u.id)
      );
      setGroupSearchResults(filtered);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setGroupSearching(false);
    }
  };

  const addGroupMember = (member: User) => {
    if (!groupMembers.find(m => m.id === member.id)) {
      setGroupMembers([...groupMembers, member]);
      setGroupSearchTerm('');
      setGroupSearchResults([]);
    }
  };

  const removeGroupMember = (memberId: string) => {
    setGroupMembers(groupMembers.filter(m => m.id !== memberId));
  };

  const createGroupChat = async () => {
    if (groupMembers.length < 1 || !user?.id) {
      toast({ title: 'Please select at least one member', variant: 'destructive' });
      return;
    }
    
    try {
      // Import the function dynamically
      const { createGroupChat: createGroupChatDB } = await import('@/lib/firestore');
      
      // Create group with current user and selected members
      const memberIds = [user.id, ...groupMembers.map(m => m.id)].sort();
      const groupId = await createGroupChatDB(memberIds, groupName || undefined);
      
      setGroupMembers([]);
      setGroupName("");
      setGroupSearchTerm('');
      setShowGroupDialog(false);
      
      toast({ title: 'Group created successfully!' });
      // Navigate to group chat
      navigate(`/messages/${groupId}?group=true`);
    } catch (err) {
      console.error('Failed to create group chat:', err);
      toast({ title: 'Failed to create group chat', description: (err as Error).message, variant: 'destructive' });
      alert('Failed to create group chat');
    }
  };

  const startConversation = (user: User) => {
    setSearchTerm('');
    setSearchResults([]);
    navigate(`/messages/${user.id}`);
  };

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchRecommended = async () => {
      try {
        // Fetch all users first, then filter client-side for better reliability
        const q = query(
          collection(firestore, 'users'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        console.log(`[Recommended] Fetched ${snapshot.size} users total`);
        
        const users: User[] = [];
        snapshot.forEach(doc => {
          try {
            const raw = { id: doc.id, ...doc.data() } as Partial<User>;
            const userData: User = {
              ...(raw as User),
              id: raw.id!,
              displayName: safeDisplayName(raw),
              avatar: raw.avatar || (raw as any).photoURL || '',
            };
            // Only skip current user
            if (userData.id !== user.id) {
              users.push(userData);
            }
          } catch (docErr) {
            console.warn('Error processing user doc:', docErr);
          }
        });
        
        console.log(`[Recommended] Valid users after filter: ${users.length}`);
        users.forEach(u => console.log(`  - ${u.username || u.displayName || u.email || u.id}`));
        
        const recommended = users
          .filter(Boolean)
          .slice(0, 4)
          .map((u) => ({ ...u, displayName: safeDisplayName(u) } as User));
        setRecommended(recommended);
        console.log(`[Recommended] Showing ${recommended.length} recommended users out of ${users.length} valid users`);
        
        if (recommended.length === 0 && users.length === 0) {
          console.warn('[Recommended] No users found - check Firestore security rules');
        }
      } catch (err) {
        console.error('Failed to fetch recommended users:', err);
        if ((err as any)?.code === 'permission-denied') {
          console.warn('[Recommended] Permission denied - users collection may require authentication');
        }
        setRecommended([]);
      }
    };
    
    fetchRecommended();
  }, [user?.id]);

  return (
    <AppLayout title="Messages" showCreate={false}>
      <div className="p-4">
        <div className="mb-4">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline"
              size="icon"
              onClick={() => setShowGroupDialog(true)}
              title="Create group chat"
            >
              <Users className="w-4 h-4" />
            </Button>
          </div>
          {(searchResults?.length ?? 0) > 0 && (
            <div className="mt-2 bg-card border rounded-lg divide-y">
              {searchResults
                .filter(Boolean)
                .map((user) => (
                  <button
                    key={user.id}
                    onClick={() => startConversation(user)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent transition"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar} alt={safeDisplayName(user)} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {safeDisplayName(user).charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-semibold text-sm">{safeDisplayName(user)}</div>
                      <div className="text-xs text-muted-foreground">{user.email || user.username}</div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
        {/* Recommended Students */}
        {(recommended?.length ?? 0) > 0 && !searchTerm && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Suggested People
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recommended
                .filter(Boolean)
                .map((recUser) => (
                  <button
                    key={recUser.id}
                    onClick={() => startConversation(recUser)}
                    className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Avatar className="w-14 h-14 ring-2 ring-primary/20">
                      <AvatarImage src={recUser.avatar} alt={safeDisplayName(recUser)} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {safeDisplayName(recUser).charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <div className="font-medium text-xs max-w-[80px] truncate">{safeDisplayName(recUser)}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        <h2 className="text-lg font-semibold mb-4">Inbox</h2>
        {isLoading && (
          <div className="text-muted-foreground mb-4">Loading conversations...</div>
        )}
        
        <div className="space-y-2">
          {/* Anonymous Wall Special Chat */}
          <button
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
              'hover:bg-accent'
            )}
            onClick={() => navigate('/messages/anonymous')}
          >
            <div className="relative">
              <Avatar className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500">
                <AvatarFallback className="text-white text-lg font-bold">🔒</AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-500" />
                  Anonymous Wall
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                Share your thoughts anonymously
              </p>
            </div>
          </button>

          {conversations
            .filter(Boolean)
            .map((conversation, index) => (
              <button
                key={conversation.id}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
                  'hover:bg-accent animate-fade-in',
                  conversation.unreadCount > 0 && 'bg-accent/50'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate(`/messages/${conversation.participant.id}`)}
              >
                <div className="relative">
                  <Avatar className="w-14 h-14">
                    <AvatarImage 
                      src={conversation.participant.avatar} 
                      alt={safeDisplayName(conversation.participant)} 
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {safeDisplayName(conversation.participant).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online status indicator */}
                  {conversation.participant.onlineStatus && conversation.participant.onlineStatus !== 'hidden' && (
                    <div className={cn(
                      'absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background',
                      conversation.participant.onlineStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
                    )}></div>
                  )}
                  {conversation.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'font-semibold text-sm',
                      conversation.unreadCount > 0 && 'text-foreground'
                    )}>
                      {safeDisplayName(conversation.participant)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {conversation.lastMessage && formatDistanceToNow(conversation.lastMessage.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  <p className={cn(
                    'text-sm truncate mt-0.5',
                    conversation.unreadCount > 0 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground'
                  )}>
                    {conversation.lastMessage?.content}
                  </p>
                </div>
              </button>
            ))}
        </div>

        {!isLoading && conversations.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start a conversation with your classmates!
            </p>
          </div>
        )}
      </div>

      {/* Create Group Chat Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Group Chat</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Group name input */}
            <div>
              <label className="text-sm font-medium">Group Name (optional)</label>
              <Input
                placeholder="e.g., Study Group, Project Team..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Search for members */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members to add..."
                value={groupSearchTerm}
                onChange={(e) => handleGroupSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search results */}
            {groupSearchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {groupSearchResults.map((searchUser) => (
                  <button
                    key={searchUser.id}
                    onClick={() => addGroupMember(searchUser)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent transition text-left"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={searchUser.avatar} alt={searchUser.displayName} />
                      <AvatarFallback>{safeDisplayName(searchUser).charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{searchUser.displayName}</div>
                      <div className="text-xs text-muted-foreground truncate">{searchUser.email}</div>
                    </div>
                    <UserPlus className="w-4 h-4 text-primary" />
                  </button>
                ))}
              </div>
            )}

            {/* Selected members */}
            {groupMembers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Members ({groupMembers.length})</p>
                <div className="flex flex-wrap gap-2">
                  {groupMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{member.displayName}</span>
                      <button
                        onClick={() => removeGroupMember(member.id)}
                        className="hover:text-primary"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create button */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowGroupDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createGroupChat}
                disabled={groupMembers.length === 0}
              >
                Create Group ({groupMembers.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}

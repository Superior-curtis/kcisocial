import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Users, FileText, UserCircle } from 'lucide-react';
import { searchUsers, searchPosts, searchClubs } from '@/lib/firestore';
import { User, Post, Club } from '@/types';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (searchTerm: string) => {
    setQuery(searchTerm);
    if (!searchTerm.trim()) {
      setUsers([]);
      setPosts([]);
      setClubs([]);
      return;
    }

    setIsSearching(true);
    try {
      const [userResults, postResults, clubResults] = await Promise.all([
        searchUsers(searchTerm),
        searchPosts(searchTerm),
        searchClubs(searchTerm),
      ]);
      setUsers(userResults);
      setPosts(postResults);
      setClubs(clubResults);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
    onOpenChange(false);
    setQuery('');
    setUsers([]);
  };

  const handlePostClick = (postId: string) => {
    navigate(`/feed#${postId}`);
    onOpenChange(false);
  };

  const handleClubClick = (clubId: string) => {
    navigate(`/clubs/${clubId}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search
          </DialogTitle>
          <DialogDescription>
            Search for users, posts, and clubs
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        <Tabs defaultValue="users" className="mt-4">
          <TabsList className="w-full justify-start rounded-none border-b px-6">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <FileText className="w-4 h-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="clubs" className="gap-2">
              <UserCircle className="w-4 h-4" />
              Clubs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="max-h-[400px] overflow-y-auto">
            {isSearching ? (
              <div className="p-8 text-center text-muted-foreground">
                Searching...
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {query ? 'No users found' : 'Start typing to search'}
              </div>
            ) : (
              <div className="divide-y">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserClick(user.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatar} alt={user.displayName} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.displayName}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        @{user.username}
                      </div>
                    </div>
                    {user.role !== 'student' && (
                      <Badge variant="secondary" className="capitalize">
                        {user.role}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="max-h-[400px] overflow-y-auto">
            {isSearching ? (
              <div className="p-8 text-center text-muted-foreground">Searching...</div>
            ) : posts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">{query ? 'No posts found' : 'Start typing to search posts'}</div>
            ) : (
              <div className="divide-y">
                {posts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => handlePostClick(post.id)}
                    className="w-full p-4 text-left hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-medium line-clamp-2">{post.content}</p>
                        <p className="text-xs text-muted-foreground">by {post.author.displayName}</p>
                      </div>
                      {post.images?.[0] && (
                        <img src={post.images[0]} alt="thumb" className="w-14 h-14 object-cover rounded" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="clubs" className="max-h-[400px] overflow-y-auto">
            {isSearching ? (
              <div className="p-8 text-center text-muted-foreground">Searching...</div>
            ) : clubs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">{query ? 'No clubs found' : 'Start typing to search clubs'}</div>
            ) : (
              <div className="divide-y">
                {clubs.map((club) => (
                  <button
                    key={club.id}
                    onClick={() => handleClubClick(club.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={club.avatar} alt={club.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {club.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{club.name}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">{club.description}</div>
                    </div>
                    <Badge variant="secondary">{club.membersCount} members</Badge>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

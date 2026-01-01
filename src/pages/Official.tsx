import { useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/post/PostCard';
import { Megaphone } from 'lucide-react';
import { usePosts } from '@/hooks/usePosts';
import { Post } from '@/types';

export default function Official() {
  // STRICT FILTER: Only show posts with EXACTLY type='official' AND from authorized users
  const filter = useCallback((post: Post) => {
    const isOfficial = post.type === 'official';
    const isAuthorized = post.author.role === 'admin' || post.author.role === 'official' || post.author.role === 'teacher';
    return isOfficial && isAuthorized;
  }, []);
  const { posts, isLoading } = usePosts(filter);

  return (
    <AppLayout title="Official" showCreate={false}>
      <div className="p-4 pb-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Official Announcements</h2>
            <p className="text-xs text-muted-foreground">From school and teachers</p>
          </div>
        </div>
      </div>
      
      {isLoading && (
        <div className="p-6 text-center text-muted-foreground">Loading announcements...</div>
      )}

      <div className="divide-y divide-border/50">
        {posts.map((post, index) => (
          <div 
            key={post.id}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <PostCard post={post} />
          </div>
        ))}
      </div>

      {!isLoading && posts.length === 0 && (
        <div className="text-center py-16">
          <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No announcements yet</p>
        </div>
      )}
    </AppLayout>
  );
}

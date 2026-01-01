import { useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/post/PostCard';
import { usePosts } from '@/hooks/usePosts';
import { Post } from '@/types';

export default function Feed() {
  // STRICT: Only show regular posts, exclude official and announcement
  const filter = useCallback((post: Post) => {
    return post.type === 'post';
  }, []);
  const { posts, isLoading, error } = usePosts(filter);

  return (
    <AppLayout title="KCISocial">
      {isLoading && (
        <div className="p-6 text-center text-muted-foreground">Loading feed...</div>
      )}

      {error && (
        <div className="p-6 text-center text-destructive">{error}</div>
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

      {!isLoading && posts.length === 0 && !error && (
        <div className="p-10 text-center text-muted-foreground">No posts yet. Be the first to share!</div>
      )}
    </AppLayout>
  );
}

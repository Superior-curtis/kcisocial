import { useEffect, useState } from "react";
import { listenToFeed } from "@/lib/firestore";
import { Post } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export function usePosts(filter?: (post: Post) => boolean) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = listenToFeed({
      currentUserId: user?.id,
      onChange: (nextPosts) => {
        setPosts(filter ? nextPosts.filter(filter) : nextPosts);
        setIsLoading(false);
      },
      onError: (err) => {
        console.error("Feed listener error", err);
        setError((err as Error).message);
        setIsLoading(false);
      },
    });

    return () => unsubscribe();
  }, [user?.id, filter]);

  return { posts, isLoading, error } as const;
}

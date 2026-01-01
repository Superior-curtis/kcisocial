import { useEffect, useState } from "react";
import { Conversation } from "@/types";
import { listenToUserConversations } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsub = listenToUserConversations(user.id, (data) => {
      setConversations(data);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user?.id]);

  return { conversations, isLoading } as const;
}

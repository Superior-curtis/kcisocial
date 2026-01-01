import { useEffect, useState } from "react";
import { Club } from "@/types";
import { listenToClubs } from "@/lib/firestore";

export function useClubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = listenToClubs((data) => {
      setClubs(data);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  return { clubs, isLoading } as const;
}

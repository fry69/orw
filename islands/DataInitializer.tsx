// islands/DataInitializer.tsx - Initialize global state with server data
import { useEffect } from "preact/hooks";
import { clientLists, clientStatus } from "../lib/state.ts";
import type { Lists, WatcherStatus } from "../lib/types.ts";

interface DataInitializerProps {
  initialData?: {
    status: WatcherStatus;
    lists: Lists;
  };
}

export default function DataInitializer({ initialData }: DataInitializerProps) {
  useEffect(() => {
    if (initialData) {
      // ✅ Initialize global state with server-rendered data
      clientStatus.value = initialData.status;
      clientLists.value = initialData.lists;
    }
  }, [initialData]);

  // This island is invisible - it just initializes state
  return null;
}

// islands/DataInitializer.tsx - Initialize global state with server data
import { useEffect } from "preact/hooks";
import { globalLists, globalStatus } from "../lib/state.ts";
import type { APIStatus, Lists } from "../types/global.ts";

interface DataInitializerProps {
  initialData?: {
    status: APIStatus;
    lists: Lists;
  };
}

export default function DataInitializer({ initialData }: DataInitializerProps) {
  useEffect(() => {
    if (initialData) {
      // ✅ Initialize global state with server-rendered data
      globalStatus.value = initialData.status;
      globalLists.value = initialData.lists;
    }
  }, [initialData]);

  // This island is invisible - it just initializes state
  return null;
}

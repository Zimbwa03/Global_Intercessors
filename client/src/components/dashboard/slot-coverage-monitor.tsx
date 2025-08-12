import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AudioBiblePlayer } from "./audio-bible-player";
import { supabase } from "@/lib/supabase";

export function SlotCoverageMonitor() {
  const [needsCoverage, setNeedsCoverage] = useState(false);
  const [currentSlotTime, setCurrentSlotTime] = useState<string>("");

  // Check slot coverage every minute
  const { data: coverageStatus } = useQuery({
    queryKey: ['slot-coverage'],
    queryFn: async () => {
      const response = await fetch('/api/slot-coverage/check');
      if (!response.ok) throw new Error('Failed to check slot coverage');
      return response.json();
    },
    refetchInterval: false, // Disabled auto-refresh to prevent disruption during typing
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (coverageStatus) {
      setNeedsCoverage(coverageStatus.needsCoverage);
      setCurrentSlotTime(coverageStatus.currentSlotTime);
    }
  }, [coverageStatus]);

  return (
    <AudioBiblePlayer 
      isActive={needsCoverage}
      slotTime={currentSlotTime}
      onPlaybackChange={(isPlaying) => {
        // Optional: Notify when audio starts/stops
        console.log(`Audio Bible ${isPlaying ? 'started' : 'stopped'} for slot ${currentSlotTime}`);
      }}
    />
  );
}
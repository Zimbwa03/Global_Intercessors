import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, SkipForward, SkipBack, Volume2, Book } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AudioBiblePlayerProps {
  isActive: boolean;
  slotTime?: string;
  onPlaybackChange?: (isPlaying: boolean) => void;
}

interface BibleBook {
  name: string;
  chapters: number;
}

// Bible structure with chapter counts
const BIBLE_BOOKS: BibleBook[] = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 }
];

export function AudioBiblePlayer({ isActive, slotTime, onPlaybackChange }: AudioBiblePlayerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [user, setUser] = useState<any>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);

  // Fetch current Bible progress
  const { data: bibleProgress, isLoading } = useQuery({
    queryKey: ['bible-progress'],
    queryFn: async () => {
      const response = await fetch('/api/audio-bible/progress');
      if (!response.ok) throw new Error('Failed to fetch Bible progress');
      return response.json();
    },
    refetchInterval: 30000,
    enabled: isActive
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ book, chapter, verse }: { book: string; chapter: number; verse?: number }) => {
      const response = await fetch('/api/audio-bible/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book, chapter, verse, slotTime })
      });
      if (!response.ok) throw new Error('Failed to update progress');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bible-progress'] });
    }
  });

  // Auto-start playback when active
  useEffect(() => {
    if (isActive && bibleProgress && !isPlaying) {
      handlePlay();
    }
  }, [isActive, bibleProgress]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      handleNextChapter();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [bibleProgress]);

  const getCurrentBookIndex = () => {
    if (!bibleProgress) return 0;
    return BIBLE_BOOKS.findIndex(book => book.name === bibleProgress.book) || 0;
  };

  const generateBibleUrl = (book: string, chapter: number): string => {
    // YouTube Bible audio links for different books
    const bibleAudioLinks: { [key: string]: string } = {
      'genesis': 'https://www.youtube.com/watch?v=GQI72THyO5I',
      'exodus': 'https://www.youtube.com/watch?v=jH_aojNJM3E',
      'leviticus': 'https://www.youtube.com/watch?v=IJ-FekWUZzE',
      'numbers': 'https://www.youtube.com/watch?v=tp5MIrMZFqo',
      'deuteronomy': 'https://www.youtube.com/watch?v=s9-PJPsIzPg',
      'joshua': 'https://www.youtube.com/watch?v=JqOqJlFF_eU',
      'judges': 'https://www.youtube.com/watch?v=kOYy8iCfIJ4',
      'ruth': 'https://www.youtube.com/watch?v=0h1eoAOQBN0',
      '1samuel': 'https://www.youtube.com/watch?v=QJOju5Dw0V0',
      '2samuel': 'https://www.youtube.com/watch?v=YvoWDXNDJgs',
      '1kings': 'https://www.youtube.com/watch?v=bVFW3wbi9pk',
      '2kings': 'https://www.youtube.com/watch?v=4UznWaY5qFI',
      'psalms': 'https://www.youtube.com/watch?v=j9phNEaPrv8',
      'proverbs': 'https://www.youtube.com/watch?v=AzmYV8GNAIM',
      'ecclesiastes': 'https://www.youtube.com/watch?v=VeUiuSK81-0',
      'isaiah': 'https://www.youtube.com/watch?v=d0A6Uchb1F8',
      'jeremiah': 'https://www.youtube.com/watch?v=RSK5BCovJFk',
      'ezekiel': 'https://www.youtube.com/watch?v=R-CIPu1nko8',
      'daniel': 'https://www.youtube.com/watch?v=9cSC9uobtPM',
      'matthew': 'https://www.youtube.com/watch?v=3dEh25pduQ8',
      'mark': 'https://www.youtube.com/watch?v=HGHqu9-DtXk',
      'luke': 'https://www.youtube.com/watch?v=26z_KhwNdD8',
      'john': 'https://www.youtube.com/watch?v=G_OlRWGLdnw',
      'acts': 'https://www.youtube.com/watch?v=CGbNw855ksw',
      'romans': 'https://www.youtube.com/watch?v=ej_6dVdJSIw',
      '1corinthians': 'https://www.youtube.com/watch?v=yiHf8klCCc4',
      '2corinthians': 'https://www.youtube.com/watch?v=OzgNj32ll48',
      'galatians': 'https://www.youtube.com/watch?v=vmx4UjRFp0M',
      'ephesians': 'https://www.youtube.com/watch?v=Y71r-T98E2Q',
      'philippians': 'https://www.youtube.com/watch?v=oE9qqW1-BkU',
      'colossians': 'https://www.youtube.com/watch?v=pXTXlDxQsvc',
      'revelation': 'https://www.youtube.com/watch?v=5lQGTp65Kp4'
    };

    const formattedBook = book.replace(/\s+/g, '').toLowerCase();
    return bibleAudioLinks[formattedBook] || 'https://www.youtube.com/watch?v=GQI72THyO5I'; // Default to Genesis
  };

  const getAudioUrl = (book: string, chapter: number) => {
    return generateBibleUrl(book, chapter);
  };

  const handlePlay = async () => {
    if (!bibleProgress) return;

    try {
      const audio = audioRef.current;
      if (audio) {
        await audio.play();
        setIsPlaying(true);
        onPlaybackChange?.(true);

        toast({
          title: "Audio Bible Started",
          description: `Playing ${bibleProgress.book} ${bibleProgress.chapter}`,
        });
      }
    } catch (error) {
      toast({
        title: "Playback Error",
        description: "Unable to start audio playback",
        variant: "destructive",
      });
    }
  };

  const handlePause = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setIsPlaying(false);
      onPlaybackChange?.(false);
    }
  };

  const handleNextChapter = () => {
    if (!bibleProgress) return;

    const currentBookIndex = getCurrentBookIndex();
    const currentBook = BIBLE_BOOKS[currentBookIndex];

    let nextBook = bibleProgress.book;
    let nextChapter = bibleProgress.chapter + 1;

    // Move to next book if current book is finished
    if (nextChapter > currentBook.chapters) {
      const nextBookIndex = (currentBookIndex + 1) % BIBLE_BOOKS.length;
      nextBook = BIBLE_BOOKS[nextBookIndex].name;
      nextChapter = 1;
    }

    updateProgressMutation.mutate({ book: nextBook, chapter: nextChapter });
  };

  const handlePreviousChapter = () => {
    if (!bibleProgress) return;

    const currentBookIndex = getCurrentBookIndex();
    let prevBook = bibleProgress.book;
    let prevChapter = bibleProgress.chapter - 1;

    // Move to previous book if at chapter 1
    if (prevChapter < 1) {
      const prevBookIndex = currentBookIndex === 0 ? BIBLE_BOOKS.length - 1 : currentBookIndex - 1;
      prevBook = BIBLE_BOOKS[prevBookIndex].name;
      prevChapter = BIBLE_BOOKS[prevBookIndex].chapters;
    }

    updateProgressMutation.mutate({ book: prevBook, chapter: prevChapter });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) {
    return null;
  }

  if (isLoading || !bibleProgress) {
    return (
      <Card className="shadow-brand-lg border border-green-100">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-600 border-t-transparent"></div>
            <p className="text-green-700">Loading Audio Bible...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-brand-lg border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <Book className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-poppins text-green-800">📖 Audio Bible Playing</span>
              <p className="text-sm text-green-600">{bibleProgress.book} {bibleProgress.chapter}</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 font-poppins">
            Slot Coverage Active
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={getAudioUrl(bibleProgress.book, bibleProgress.chapter)}
          className="hidden"
        />

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={duration ? (currentTime / duration) * 100 : 0} 
            className="h-2 bg-green-100"
          />
          <div className="flex justify-between text-xs text-green-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={handlePreviousChapter}
            variant="outline"
            size="sm"
            className="border-green-300 text-green-700 hover:bg-green-100"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            onClick={isPlaying ? handlePause : handlePlay}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>

          <Button
            onClick={handleNextChapter}
            variant="outline"
            size="sm"
            className="border-green-300 text-green-700 hover:bg-green-100"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-3">
          <Volume2 className="w-4 h-4 text-green-600" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => {
              const newVolume = parseFloat(e.target.value);
              setVolume(newVolume);
              if (audioRef.current) {
                audioRef.current.volume = newVolume;
              }
            }}
            className="flex-1 h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Info */}
        <div className="text-xs text-green-600 text-center">
          <p>Automatically playing while prayer slot is unfilled</p>
          <p>Will stop when someone joins the prayer session</p>
        </div>
      </CardContent>
    </Card>
  );
}
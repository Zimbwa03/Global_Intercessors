import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  const isMobile = useIsMobile();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedBook, setSelectedBook] = useState("Genesis");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  // YouTube audio Bible links provided by user
  const bibleVideos = [
    {
      id: "UUKf3IYZJFc",
      title: "Genesis - Complete Book",
      embedUrl: "https://www.youtube.com/embed/UUKf3IYZJFc?autoplay=1&controls=1&rel=0"
    },
    {
      id: "fYdJgkoHr0M", 
      title: "Exodus - Complete Book",
      embedUrl: "https://www.youtube.com/embed/fYdJgkoHr0M?autoplay=1&controls=1&rel=0"
    },
    {
      id: "mITAX6D33wI",
      title: "Leviticus - Complete Book", 
      embedUrl: "https://www.youtube.com/embed/mITAX6D33wI?autoplay=1&controls=1&rel=0"
    }
  ];

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Bible progress query
  const { data: bibleProgress, refetch: refetchProgress } = useQuery({
    queryKey: ["/api/audio-bible/progress"],
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Progress mutation
  const progressMutation = useMutation({
    mutationFn: async (data: { book: string; chapter: number; currentTime: number; totalTime: number }) => {
      return apiRequest({
        url: "/api/audio-bible/progress",
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audio-bible/progress"] });
    },
  });

  // Auto-start when slot is active
  useEffect(() => {
    if (isActive && !isPlaying) {
      handlePlay();
    }
  }, [isActive]);

  const getCurrentVideo = () => {
    const bookIndex = BIBLE_BOOKS.findIndex(book => book.name === selectedBook);
    const videoIndex = Math.min(bookIndex, bibleVideos.length - 1);
    return bibleVideos[videoIndex] || bibleVideos[0];
  };

  const handlePlay = () => {
    setIsPlaying(true);
    onPlaybackChange?.(true);
    
    toast({
      title: "Audio Bible Started",
      description: `Playing ${getCurrentVideo().title} for unfilled prayer slot ${slotTime}`,
    });

    // Save progress
    progressMutation.mutate({
      book: selectedBook,
      chapter: selectedChapter,
      currentTime: 0,
      totalTime: 0
    });
  };

  const handlePause = () => {
    setIsPlaying(false);
    onPlaybackChange?.(false);
  };

  const handleNextVideo = () => {
    const nextIndex = (currentVideoIndex + 1) % bibleVideos.length;
    setCurrentVideoIndex(nextIndex);
    const nextBook = BIBLE_BOOKS[Math.min(nextIndex, BIBLE_BOOKS.length - 1)];
    setSelectedBook(nextBook.name);
    setSelectedChapter(1);
  };

  const handlePreviousVideo = () => {
    const prevIndex = currentVideoIndex > 0 ? currentVideoIndex - 1 : bibleVideos.length - 1;
    setCurrentVideoIndex(prevIndex);
    const prevBook = BIBLE_BOOKS[Math.min(prevIndex, BIBLE_BOOKS.length - 1)];
    setSelectedBook(prevBook.name);
    setSelectedChapter(1);
  };

  const selectedBookData = BIBLE_BOOKS.find(book => book.name === selectedBook);
  const currentVideo = getCurrentVideo();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <i className="fas fa-bible text-blue-600"></i>
          <span>Audio Bible Player</span>
          {isActive && (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">
              LIVE - Unfilled Slot
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Book and Chapter Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bible Book</label>
            <Select value={selectedBook} onValueChange={setSelectedBook}>
              <SelectTrigger>
                <SelectValue placeholder="Select a book" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {BIBLE_BOOKS.map((book) => (
                  <SelectItem key={book.name} value={book.name}>
                    {book.name} ({book.chapters} chapters)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Chapter</label>
            <Select 
              value={selectedChapter.toString()} 
              onValueChange={(value) => setSelectedChapter(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select chapter" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {Array.from({ length: selectedBookData?.chapters || 1 }, (_, i) => i + 1).map((chapter) => (
                  <SelectItem key={chapter} value={chapter.toString()}>
                    Chapter {chapter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current Video Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Now Playing</h3>
          <p className="text-blue-600">{currentVideo.title}</p>
          <p className="text-sm text-blue-500 mt-1">
            {selectedBook} Chapter {selectedChapter}
          </p>
        </div>

        {/* YouTube Player */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            ref={iframeRef}
            src={isPlaying ? currentVideo.embedUrl : ""}
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={currentVideo.title}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousVideo}
            disabled={progressMutation.isPending}
          >
            <i className="fas fa-step-backward mr-2"></i>
            Previous
          </Button>
          
          {!isPlaying ? (
            <Button
              onClick={handlePlay}
              disabled={progressMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <i className="fas fa-play mr-2"></i>
              Play Audio Bible
            </Button>
          ) : (
            <Button
              onClick={handlePause}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-50"
            >
              <i className="fas fa-pause mr-2"></i>
              Pause
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextVideo}
            disabled={progressMutation.isPending}
          >
            <i className="fas fa-step-forward mr-2"></i>
            Next
          </Button>
        </div>

        {/* Progress Info */}
        {bibleProgress && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Your Progress</h4>
            <p className="text-sm text-gray-600">
              Last: {bibleProgress.book} Chapter {bibleProgress.chapter}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {new Date(bibleProgress.updatedAt).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Fallback Info */}
        {isActive && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fas fa-exclamation-triangle text-yellow-400"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Automatic Fallback Active:</strong> This audio Bible is playing because slot {slotTime} is currently unfilled. 
                  The audio will continue until an intercessor joins the prayer slot.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
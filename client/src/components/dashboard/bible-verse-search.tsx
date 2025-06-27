import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Search, 
  Book, 
  BookOpen, 
  Heart,
  Copy,
  Share,
  Loader2,
  ChevronRight,
  Quote
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Bible {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
}

interface BibleBook {
  id: string;
  abbreviation: string;
  name: string;
  nameLong: string;
}

interface BibleChapter {
  id: string;
  bibleId: string;
  bookId: string;
  number: string;
}

interface BibleVerse {
  id: string;
  bibleId: string;
  chapterId: string;
  content: string;
  verseNumber: string;
  reference?: string;
  text?: string;
}

interface SearchResult {
  verses: BibleVerse[];
  query: string;
  total: number;
}

export function BibleVerseSearch() {
  const [selectedBible, setSelectedBible] = useState<string>("");
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [selectedVerse, setSelectedVerse] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<'browse' | 'search'>('browse');
  const [currentVerse, setCurrentVerse] = useState<BibleVerse | null>(null);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Fetch available Bibles
  const { data: bibles, isLoading: biblesLoading } = useQuery({
    queryKey: ['bibles'],
    queryFn: async () => {
      const response = await fetch('/api/bible-verse?action=bibles');
      if (!response.ok) throw new Error('Failed to fetch Bibles');
      const data = await response.json();
      return data.bibles as Bible[];
    }
  });

  // Fetch books for selected Bible
  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['bible-books', selectedBible],
    queryFn: async () => {
      const response = await fetch(`/api/bible-verse?action=books&bibleId=${selectedBible}`);
      if (!response.ok) throw new Error('Failed to fetch books');
      const data = await response.json();
      return data.books as BibleBook[];
    },
    enabled: !!selectedBible
  });

  // Fetch chapters for selected book
  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ['bible-chapters', selectedBible, selectedBook],
    queryFn: async () => {
      const response = await fetch(`/api/bible-verse?action=chapters&bibleId=${selectedBible}&bookId=${selectedBook}`);
      if (!response.ok) throw new Error('Failed to fetch chapters');
      const data = await response.json();
      return data.chapters as BibleChapter[];
    },
    enabled: !!(selectedBible && selectedBook)
  });

  // Fetch verses for selected chapter
  const { data: verses, isLoading: versesLoading } = useQuery({
    queryKey: ['bible-verses', selectedBible, selectedChapter],
    queryFn: async () => {
      const response = await fetch(`/api/bible-verse?action=verses&bibleId=${selectedBible}&chapterId=${selectedChapter}`);
      if (!response.ok) throw new Error('Failed to fetch verses');
      const data = await response.json();
      return data.verses as BibleVerse[];
    },
    enabled: !!(selectedBible && selectedChapter)
  });

  // Search verses
  const { data: searchResults, isLoading: searchLoading, refetch: performSearch } = useQuery({
    queryKey: ['bible-search', selectedBible, searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;
      const response = await fetch(`/api/bible-verse?action=search&bibleId=${selectedBible}&query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Failed to search verses');
      const data = await response.json();
      return data.results as SearchResult;
    },
    enabled: false // Only run when explicitly called
  });

  // Set default Bible when loaded
  useEffect(() => {
    if (bibles && bibles.length > 0 && !selectedBible) {
      // Prefer KJV or NIV if available, otherwise use first Bible
      const preferredBible = bibles.find(b => 
        b.abbreviation === 'KJV' || b.abbreviation === 'NIV'
      ) || bibles[0];
      setSelectedBible(preferredBible.id);
    }
  }, [bibles, selectedBible]);

  // Fetch verse content when verse is selected
  const { data: verseContent, isLoading: verseLoading } = useQuery({
    queryKey: ['bible-verse-content', selectedBible, selectedVerse],
    queryFn: async () => {
      const response = await fetch(`/api/bible-verse?action=verse&bibleId=${selectedBible}&query=${selectedVerse}`);
      if (!response.ok) throw new Error('Failed to fetch verse content');
      const data = await response.json();
      return data.verse as BibleVerse;
    },
    enabled: !!(selectedBible && selectedVerse)
  });

  // Get current verse when verse is selected
  useEffect(() => {
    if (verseContent) {
      setCurrentVerse(verseContent);
    } else if (verses && selectedVerse) {
      const verse = verses.find(v => v.id === selectedVerse);
      if (verse) {
        // Clean the content and ensure we have text
        const cleanedVerse = {
          ...verse,
          text: verse.content ? verse.content.replace(/<[^>]*>/g, '').trim() : 
                verse.text ? verse.text.replace(/<[^>]*>/g, '').trim() : 
                'Verse content not available'
        };
        setCurrentVerse(cleanedVerse);
      } else {
        setCurrentVerse(null);
      }
    }
  }, [verses, selectedVerse, verseContent]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a word or phrase to search for.",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedBible) {
      toast({
        title: "Bible Version Required",
        description: "Please select a Bible version first.",
        variant: "destructive"
      });
      return;
    }

    setSearchMode('search');
    performSearch();
  };

  const handleCopyVerse = (verse: BibleVerse) => {
    const text = `${verse.content} - ${verse.reference || 'Bible'}`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Verse copied to clipboard."
    });
  };

  const handleShareVerse = (verse: BibleVerse) => {
    if (navigator.share) {
      navigator.share({
        title: verse.reference || 'Bible Verse',
        text: `${verse.content} - ${verse.reference || 'Bible'}`
      });
    } else {
      handleCopyVerse(verse);
    }
  };

  const resetSelections = () => {
    setSelectedBook("");
    setSelectedChapter("");
    setSelectedVerse("");
    setCurrentVerse(null);
  };

  const getBookCategories = () => {
    if (!books) return { oldTestament: [], newTestament: [] };
    
    const oldTestamentBooks = [
      'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
      '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
      'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
      'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL'
    ];

    return {
      oldTestament: books.filter(book => oldTestamentBooks.includes(book.id)),
      newTestament: books.filter(book => !oldTestamentBooks.includes(book.id))
    };
  };

  const { oldTestament, newTestament } = getBookCategories();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg border border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-poppins text-xl">Bible Verse Search</span>
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant={searchMode === 'browse' ? "default" : "outline"}
                onClick={() => setSearchMode('browse')}
                size="sm"
              >
                <Book className="w-4 h-4 mr-1" />
                Browse
              </Button>
              <Button
                variant={searchMode === 'search' ? "default" : "outline"}
                onClick={() => setSearchMode('search')}
                size="sm"
              >
                <Search className="w-4 h-4 mr-1" />
                Search
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Bible Selection */}
      <Card className="shadow-lg border border-gray-200">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Bible Version
              </label>
              <Select value={selectedBible} onValueChange={(value) => {
                setSelectedBible(value);
                resetSelections();
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={biblesLoading ? "Loading versions..." : "Select Bible version"} />
                </SelectTrigger>
                <SelectContent>
                  {bibles?.map((bible) => (
                    <SelectItem key={bible.id} value={bible.id}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{bible.abbreviation}</span>
                        <span className="text-sm text-gray-500 ml-2">{bible.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {searchMode === 'search' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Search for Word or Phrase
                </label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter word or phrase to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSearch}
                    disabled={searchLoading || !selectedBible}
                  >
                    {searchLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Browse Mode */}
      {searchMode === 'browse' && selectedBible && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Book Selection */}
          <Card className="shadow-lg border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Select Book</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-4">
                  {oldTestament.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-2">Old Testament</h4>
                      <div className="space-y-1">
                        {oldTestament.map((book) => (
                          <Button
                            key={book.id}
                            variant={selectedBook === book.id ? "default" : "ghost"}
                            onClick={() => {
                              setSelectedBook(book.id);
                              setSelectedChapter("");
                              setSelectedVerse("");
                            }}
                            className="w-full justify-start text-left h-auto p-2"
                          >
                            <div>
                              <div className="font-medium">{book.name}</div>
                              <div className="text-xs text-gray-500">{book.abbreviation}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {newTestament.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-2">New Testament</h4>
                      <div className="space-y-1">
                        {newTestament.map((book) => (
                          <Button
                            key={book.id}
                            variant={selectedBook === book.id ? "default" : "ghost"}
                            onClick={() => {
                              setSelectedBook(book.id);
                              setSelectedChapter("");
                              setSelectedVerse("");
                            }}
                            className="w-full justify-start text-left h-auto p-2"
                          >
                            <div>
                              <div className="font-medium">{book.name}</div>
                              <div className="text-xs text-gray-500">{book.abbreviation}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chapter Selection */}
          <Card className="shadow-lg border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Select Chapter</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedBook ? (
                <ScrollArea className="h-64">
                  <div className="grid grid-cols-4 gap-2">
                    {chapters?.map((chapter) => (
                      <Button
                        key={chapter.id}
                        variant={selectedChapter === chapter.id ? "default" : "outline"}
                        onClick={() => {
                          setSelectedChapter(chapter.id);
                          setSelectedVerse("");
                        }}
                        className="h-10"
                        disabled={chaptersLoading}
                      >
                        {chapter.number}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Select a book to view chapters
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verse Selection */}
          <Card className="shadow-lg border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Select Verse</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedChapter ? (
                <ScrollArea className="h-64">
                  <div className="grid grid-cols-5 gap-2">
                    {verses?.map((verse) => (
                      <Button
                        key={verse.id}
                        variant={selectedVerse === verse.id ? "default" : "outline"}
                        onClick={() => setSelectedVerse(verse.id)}
                        className="h-10"
                        disabled={versesLoading}
                      >
                        {verse.verseNumber}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Select a chapter to view verses
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Current Verse Display */}
      {currentVerse && searchMode === 'browse' && (
        <Card className="shadow-lg border border-blue-100">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-brand-text font-poppins">
                  {currentVerse.reference || `Verse ${currentVerse.verseNumber}`}
                </h3>
                <Badge variant="secondary" className="mt-1">
                  {selectedBible}
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyVerse(currentVerse)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShareVerse(currentVerse)}
                >
                  <Share className="w-4 h-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>
            {verseLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading verse content...</span>
              </div>
            ) : (
              <blockquote className="text-lg leading-relaxed text-gray-800 italic border-l-4 border-brand-primary pl-4">
                "{currentVerse.text || (currentVerse.content ? currentVerse.content.replace(/<[^>]*>/g, '').trim() : 'Verse content not available')}"
              </blockquote>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchMode === 'search' && searchResults && (
        <Card className="shadow-lg border border-blue-100">
          <CardHeader>
            <CardTitle className="text-lg font-poppins">
              Search Results for "{searchQuery}"
            </CardTitle>
            <p className="text-sm text-gray-600">
              Found {searchResults.verses.length} verses
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {searchResults.verses.map((verse, index) => (
                  <motion.div
                    key={verse.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-100 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-brand-text">
                          {verse.reference || `Verse ${verse.verseNumber}`}
                        </h4>
                        <Badge variant="outline" className="mt-1">
                          {selectedBible}
                        </Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyVerse(verse)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShareVerse(verse)}
                        >
                          <Share className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      "{verse.text || verse.content || 'Verse content not available'}"
                    </p>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty States */}
      {searchMode === 'search' && !searchResults && !searchLoading && searchQuery && (
        <Card className="shadow-lg border border-gray-200">
          <CardContent className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-600 mb-4">
              No verses found containing "{searchQuery}". Try different keywords.
            </p>
            <Button onClick={() => setSearchQuery("")} variant="outline">
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}

      {searchMode === 'browse' && !currentVerse && (
        <Card className="shadow-lg border border-gray-200">
          <CardContent className="text-center py-12">
            <Quote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Verse</h3>
            <p className="text-gray-600">
              Choose a book, chapter, and verse to read from God's Word
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
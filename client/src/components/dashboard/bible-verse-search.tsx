import { useState, useEffect, useCallback } from "react";
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<'browse' | 'search'>('browse');
  const [currentVerse, setCurrentVerse] = useState<BibleVerse | null>(null);
  const [shouldSearch, setShouldSearch] = useState(false);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      if (searchQuery.trim() && selectedBible && searchMode === 'search') {
        setShouldSearch(true);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery, selectedBible, searchMode]);

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

  // Fetch full chapter meta + verse list (for chapter view)
  const { data: chapterView, isLoading: chapterLoading } = useQuery({
    queryKey: ['bible-chapter', selectedBible, selectedChapter],
    queryFn: async () => {
      if (!selectedBible || !selectedChapter) return null;
      const response = await fetch(`/api/bible-verse?action=chapter&bibleId=${selectedBible}&chapterId=${selectedChapter}`);
      if (!response.ok) throw new Error('Failed to fetch chapter');
      return response.json();
    },
    enabled: !!(selectedBible && selectedChapter),
    staleTime: 60000,
  });

  // Search verses with auto-search
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['bible-search', selectedBible, debouncedSearchQuery],
    queryFn: async () => {
      if (!debouncedSearchQuery.trim()) return null;
      const response = await fetch(`/api/bible-verse?action=search&bibleId=${selectedBible}&query=${encodeURIComponent(debouncedSearchQuery)}`);
      if (!response.ok) throw new Error('Failed to search verses');
      const data = await response.json();
      return data.results as SearchResult;
    },
    enabled: !!(selectedBible && debouncedSearchQuery.trim() && searchMode === 'search'),
    staleTime: 30000, // Cache results for 30 seconds
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

  const handleSearch = useCallback(() => {
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
    setDebouncedSearchQuery(searchQuery);
    setShouldSearch(true);
  }, [searchQuery, selectedBible, toast]);

  const getVerseText = (verse: BibleVerse) => {
    // Try to get clean text from various possible fields
    if (verse.text && verse.text.trim() !== '' && !verse.text.includes('Content temporarily unavailable')) {
      const cleanText = verse.text.trim();
      if (cleanText.length > 5 && cleanText !== 'Verse content not available') {
        return cleanText;
      }
    }
    
    if (verse.content && verse.content.trim() !== '') {
      const cleanedContent = verse.content.replace(/<[^>]*>/g, '').trim();
      if (cleanedContent && cleanedContent.length > 5 && cleanedContent !== 'Verse content not available') {
        return cleanedContent;
      }
    }
    
    // Check if this is a temporary API issue
    if (verse.text && verse.text.includes('Content temporarily unavailable')) {
      return verse.text;
    }
    
    // Log the issue for debugging
    console.log('No verse content available for:', verse);
    return 'Content temporarily unavailable. The verse reference is valid, but the text could not be loaded from the Bible API.';
  };

  // Function to highlight search terms in verse text
  const highlightSearchTerms = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.split(regex).map((part, index) => {
      if (regex.test(part)) {
        return (
          <span 
            key={index} 
            className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-1 py-0.5 rounded font-semibold shadow-sm"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleCopyVerse = (verse: BibleVerse) => {
    const text = `${getVerseText(verse)} - ${verse.reference || 'Bible'}`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Verse copied to clipboard."
    });
  };

  const handleShareVerse = (verse: BibleVerse) => {
    const text = `${getVerseText(verse)} - ${verse.reference || 'Bible'}`;
    if (navigator.share) {
      navigator.share({
        title: verse.reference || 'Bible Verse',
        text: text
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Bible Study
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore God's Word with our comprehensive Bible search and study tools
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl p-1 shadow-lg border border-gray-200">
            <Button
              variant={searchMode === 'browse' ? "default" : "ghost"}
              onClick={() => setSearchMode('browse')}
              className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                searchMode === 'browse' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Book className="w-4 h-4 mr-2" />
              Browse
            </Button>
            <Button
              variant={searchMode === 'search' ? "default" : "ghost"}
              onClick={() => setSearchMode('search')}
              className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                searchMode === 'search' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {/* Bible Selection */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl mb-8">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Bible Version</h2>
              <p className="text-gray-600">Select a translation to begin your study</p>
            </div>
            <div className="max-w-md mx-auto">
              <Select value={selectedBible} onValueChange={(value) => {
                setSelectedBible(value);
                resetSelections();
              }}>
                <SelectTrigger className="h-12 text-lg border-2 border-gray-200 rounded-xl hover:border-blue-300 focus:border-blue-500 transition-colors">
                  <SelectValue placeholder={biblesLoading ? "Loading versions..." : "Select Bible version"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-0 shadow-xl">
                  {bibles?.map((bible) => (
                    <SelectItem key={bible.id} value={bible.id} className="py-3">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-gray-900">{bible.abbreviation}</span>
                        <span className="text-sm text-gray-500 ml-3">{bible.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Browse Interface */}
        {selectedBible && searchMode === 'browse' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Books Selection */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Book className="w-5 h-5 text-blue-600" />
                  Books
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {oldTestament.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-3 px-2">Old Testament</h4>
                        <div className="space-y-1">
                          {oldTestament.map((book) => (
                            <Button
                              key={book.id}
                              variant={selectedBook === book.id ? "default" : "ghost"}
                              onClick={() => { 
                                setSelectedBook(book.id); 
                                setSelectedChapter(""); 
                                setSelectedVerse(""); 
                                setSearchMode('browse'); 
                              }}
                              className={`w-full justify-start text-left h-auto p-3 rounded-xl transition-all duration-200 ${
                                selectedBook === book.id 
                                  ? 'bg-blue-600 text-white shadow-md' 
                                  : 'hover:bg-blue-50 hover:text-blue-700'
                              }`}
                            >
                              <div className="text-left">
                                <div className="font-semibold text-sm">{book.name}</div>
                                <div className="text-xs opacity-75">{book.abbreviation}</div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {newTestament.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-3 px-2">New Testament</h4>
                        <div className="space-y-1">
                          {newTestament.map((book) => (
                            <Button
                              key={book.id}
                              variant={selectedBook === book.id ? "default" : "ghost"}
                              onClick={() => { 
                                setSelectedBook(book.id); 
                                setSelectedChapter(""); 
                                setSelectedVerse(""); 
                                setSearchMode('browse'); 
                              }}
                              className={`w-full justify-start text-left h-auto p-3 rounded-xl transition-all duration-200 ${
                                selectedBook === book.id 
                                  ? 'bg-blue-600 text-white shadow-md' 
                                  : 'hover:bg-blue-50 hover:text-blue-700'
                              }`}
                            >
                              <div className="text-left">
                                <div className="font-semibold text-sm">{book.name}</div>
                                <div className="text-xs opacity-75">{book.abbreviation}</div>
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

            {/* Chapters Selection */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-xs">2</span>
                  </div>
                  Chapters
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedBook ? (
                  <ScrollArea className="h-80">
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {chapters?.map((chapter) => (
                        <Button
                          key={chapter.id}
                          variant={selectedChapter === chapter.id ? "default" : "outline"}
                          onClick={() => { 
                            setSelectedChapter(chapter.id); 
                            setSelectedVerse(""); 
                            setSearchMode('browse'); 
                          }}
                          className={`h-12 rounded-xl font-semibold transition-all duration-200 ${
                            selectedChapter === chapter.id 
                              ? 'bg-green-600 text-white shadow-md' 
                              : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                          }`}
                          disabled={chaptersLoading}
                        >
                          {chapter.number}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-80 flex items-center justify-center text-center">
                    <div className="text-gray-500">
                      <Book className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Select a book to view chapters</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verses Selection */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-xs">3</span>
                  </div>
                  Verses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedChapter ? (
                  <ScrollArea className="h-80">
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {verses?.map((verse) => (
                        <Button
                          key={verse.id}
                          variant={selectedVerse === verse.id ? "default" : "outline"}
                          onClick={() => { 
                            setSelectedVerse(verse.id); 
                            setSearchMode('browse'); 
                          }}
                          className={`h-10 rounded-lg font-semibold transition-all duration-200 ${
                            selectedVerse === verse.id 
                              ? 'bg-purple-600 text-white shadow-md' 
                              : 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300'
                          }`}
                          disabled={versesLoading}
                        >
                          {verse.verseNumber}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-80 flex items-center justify-center text-center">
                    <div className="text-gray-500">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-gray-400 font-bold text-sm">3</span>
                      </div>
                      <p className="text-sm">Select a chapter to view verses</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Interface */}
        {searchMode === 'search' && selectedBible && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl mb-8">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Search God's Word</h2>
                <p className="text-gray-600">Find verses by keywords or phrases</p>
              </div>
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Input
                    placeholder="Search for words or phrases..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (searchMode !== 'search') {
                        setSearchMode('search');
                      }
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="h-14 text-lg border-2 border-gray-200 rounded-xl pl-4 pr-12 hover:border-blue-300 focus:border-blue-500 transition-colors"
                  />
                  <Button 
                    onClick={handleSearch}
                    disabled={!selectedBible || !searchQuery.trim()}
                    className="absolute right-2 top-2 h-10 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    {searchLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {searchQuery && searchMode === 'search' && (
                  <p className="text-sm text-gray-500 mt-3 text-center">
                    {searchLoading ? 'Searching through the Bible...' : `Type to search through ${selectedBible}`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}


        {/* Chapter Reader */}
        {selectedChapter && chapterView && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-center">
                {chapterView.chapter?.reference || 'Chapter'}
              </h2>
              <p className="text-blue-100 text-center mt-2">
                {selectedBible} • {chapterView.verses?.length || 0} verses
              </p>
            </div>
            <CardContent className="p-6 sm:p-8">
              <div className="max-w-4xl mx-auto">
                <div className="prose prose-lg max-w-none">
                  {chapterView.verses?.sort((a: any, b: any) => parseInt(a.verseNumber) - parseInt(b.verseNumber)).map((v: any, index: number) => (
                    <div 
                      key={v.id} 
                      id={v.id} 
                      className={`group py-4 px-6 rounded-2xl mb-3 transition-all duration-300 ${
                        selectedVerse === v.id 
                          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 shadow-lg transform scale-[1.02]' 
                          : 'hover:bg-gray-50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className={`text-sm font-bold px-3 py-1 rounded-full min-w-[2.5rem] text-center transition-colors duration-200 ${
                          selectedVerse === v.id 
                            ? 'bg-yellow-500 text-white' 
                            : 'bg-gray-200 text-gray-700 group-hover:bg-gray-300'
                        }`}>
                          {v.verseNumber}
                        </span>
                        <div className="flex-1">
                          {v.text ? (
                            <p className="text-gray-900 leading-relaxed text-lg font-medium">
                              {v.text}
                            </p>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500 italic">Loading verse content...</span>
                              <Button
                                variant="link"
                                className="p-0 h-auto text-blue-600 hover:text-blue-800 text-sm font-medium"
                                onClick={async () => {
                                  setSelectedVerse(v.id);
                                  setSearchMode('browse');
                                  const res = await fetch(`/api/bible-verse?action=verse&bibleId=${selectedBible}&query=${v.id}`);
                                  if (res.ok) {
                                    const data = await res.json();
                                    setCurrentVerse({ ...data.verse, id: v.id, verseNumber: v.verseNumber } as any);
                                    setTimeout(() => {
                                      document.getElementById(v.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 50);
                                  }
                                }}
                              >
                                Load verse
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Verse Display */}
        {currentVerse && searchMode === 'browse' && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-center">
                {currentVerse.reference || `Verse ${currentVerse.verseNumber}`}
              </h2>
              <p className="text-purple-100 text-center mt-2">
                {selectedBible} • Selected Verse
              </p>
            </div>
            <CardContent className="p-6 sm:p-8">
              <div className="max-w-4xl mx-auto">
                {verseLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                      </div>
                      <p className="text-gray-600 text-lg">Loading verse content...</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-8 border-l-4 border-purple-500">
                    <blockquote className="text-xl sm:text-2xl leading-relaxed text-gray-800 font-medium text-center">
                      "{getVerseText(currentVerse)}"
                    </blockquote>
                    <div className="flex justify-center mt-6 space-x-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handleCopyVerse(currentVerse)}
                        className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors px-6"
                      >
                        <Copy className="w-5 h-5 mr-2" />
                        Copy Verse
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handleShareVerse(currentVerse)}
                        className="hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors px-6"
                      >
                        <Share className="w-5 h-5 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Loading */}
        {searchMode === 'search' && searchLoading && debouncedSearchQuery && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl mb-8">
            <CardContent className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Searching God's Word</h3>
              <p className="text-gray-600 text-lg">
                Looking for verses containing "{debouncedSearchQuery}"
              </p>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        {searchMode === 'search' && searchResults && !searchLoading && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-center">
                Search Results
              </h2>
              <p className="text-green-100 text-center mt-2">
                Found {searchResults.verses.length} verse{searchResults.verses.length !== 1 ? 's' : ''} for "{searchQuery}"
              </p>
            </div>
            <CardContent className="p-6 sm:p-8">
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {searchResults.verses.map((verse, index) => {
                    const verseText = getVerseText(verse);
                    const isContentAvailable = !verseText.includes('Content temporarily unavailable') && 
                                             !verseText.includes('Verse content not available') &&
                                             verseText.length > 10;
                    const isTemporaryIssue = verseText.includes('Content temporarily unavailable');
                    
                    return (
                      <motion.div
                        key={verse.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`group p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg ${
                          isContentAvailable 
                            ? 'bg-white border-gray-200 hover:border-green-300' 
                            : isTemporaryIssue
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 font-bold text-sm">{index + 1}</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-lg">
                                {verse.reference || `${verse.bookId} ${verse.chapterId?.split('.')[1] || ''}:${verse.verseNumber}`}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="bg-gray-100 text-gray-700 px-2 py-1">
                                  {selectedBible}
                                </Badge>
                                {!isContentAvailable && (
                                  <Badge 
                                    variant="secondary" 
                                    className={`px-2 py-1 ${
                                      isTemporaryIssue 
                                        ? 'bg-orange-100 text-orange-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {isTemporaryIssue ? 'API Issue' : 'Loading Issue'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {isContentAvailable && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCopyVerse(verse)}
                                  className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleShareVerse(verse)}
                                  className="hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
                                >
                                  <Share className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className={`text-lg leading-relaxed font-medium ${
                          isContentAvailable 
                            ? 'text-gray-800' 
                            : isTemporaryIssue 
                            ? 'text-orange-700 italic' 
                            : 'text-yellow-700 italic'
                        }`}>
                          "{isContentAvailable ? highlightSearchTerms(verseText, searchQuery) : verseText}"
                        </p>
                        {!isContentAvailable && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                            <p className="text-sm text-gray-600 font-medium mb-2">Content temporarily unavailable due to:</p>
                            <ul className="text-xs text-gray-500 space-y-1">
                              {isTemporaryIssue ? (
                                <>
                                  <li>• API rate limiting or temporary service issues</li>
                                  <li>• Network connectivity problems</li>
                                  <li>• Bible API service maintenance</li>
                                </>
                              ) : (
                                <>
                                  <li>• Verse ID format issues</li>
                                  <li>• Bible version compatibility problems</li>
                                  <li>• Data source configuration issues</li>
                                </>
                              )}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Empty States */}
        {searchMode === 'search' && !searchResults && !searchLoading && debouncedSearchQuery && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl mb-8">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Results Found</h3>
              <p className="text-gray-600 text-lg mb-6">
                No verses found containing "{debouncedSearchQuery}". Try different keywords.
              </p>
              <Button onClick={() => setSearchQuery("")} variant="outline" size="lg" className="hover:bg-gray-50 transition-colors px-6">
                Clear Search
              </Button>
            </CardContent>
          </Card>
        )}
        
        {searchMode === 'search' && !searchQuery && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl mb-8">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Start Searching</h3>
              <p className="text-gray-600 text-lg">
                Type a word or phrase to search through the Bible
              </p>
            </CardContent>
          </Card>
        )}

        {searchMode === 'browse' && !currentVerse && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl mb-8">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Quote className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Select a Verse</h3>
              <p className="text-gray-600 text-lg">
                Choose a book, chapter, and verse to read from God's Word
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
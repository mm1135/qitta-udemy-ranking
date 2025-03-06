"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

interface Tag {
  name: string;
  count: number;
}

interface TagSearchProps {
  initialValue?: string;
}

export default function TagSearch({ initialValue = "" }: TagSearchProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 検索語に基づいて候補を更新
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSuggestions([]);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    
    // 直接APIを呼び出して最新の結果を取得
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tags/search?q=${encodeURIComponent(term)}&limit=10`);
        if (!response.ok) {
          throw new Error('タグ検索に失敗しました');
        }
        
        const data = await response.json();
        console.log("API検索結果:", data);
        
        if (Array.isArray(data.tags)) {
          setSuggestions(data.tags);
        } else {
          console.error("予期しない応答形式:", data);
          setSuggestions([]);
        }
      } catch (error) {
        console.error('タグ検索エラー:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };
    
    // 検索語が変わるたびに検索を実行（デバウンス処理）
    const timeoutId = setTimeout(() => {
      fetchSuggestions();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // クリック外れ検出
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 検索フォーム送信処理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // 検索結果ページに遷移
      router.push(`/search/tags?q=${encodeURIComponent(searchTerm.trim())}`);
      setShowSuggestions(false);
    }
  };
  
  // サジェスト選択処理
  const handleSuggestionClick = (tagName: string) => {
    // タグページに直接遷移
    router.push(`/tags/${encodeURIComponent(tagName)}`);
    setShowSuggestions(false);
    setSearchTerm("");
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="タグを検索..."
            className="w-full px-4 py-2 pl-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {loading ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
        <button type="submit" className="sr-only">検索</button>
      </form>

      {/* サジェスト一覧 */}
      {showSuggestions && (
        <div 
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="px-4 py-3 text-center text-gray-500">
              <Loader2 className="w-5 h-5 mx-auto animate-spin mb-1" />
              <span>検索中...</span>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((tag) => (
              <div
                key={tag.name}
                onClick={() => handleSuggestionClick(tag.name)}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex justify-between items-center"
              >
                <span>{tag.name}</span>
                <span className="text-xs text-gray-500">({tag.count})</span>
              </div>
            ))
          ) : searchTerm.trim() !== "" ? (
            <div className="px-4 py-3 text-center text-gray-500">
              「{searchTerm}」に一致するタグが見つかりません
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
} 
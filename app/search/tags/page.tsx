"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TagSearch from "@/components/TagSearch";
import { getPopularCourseTags } from "@/lib/clientTags";
import { Tag, Search } from "lucide-react";

interface Tag {
  name: string;
  count: number;
}

function TagSearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  
  // 全てのタグを取得
  useEffect(() => {
    const fetchAllTags = async () => {
      try {
        const tags = await getPopularCourseTags(1000);
        setAllTags(tags);
        
        // 検索クエリでフィルタリング
        if (query) {
          const term = query.toLowerCase();
          
          // 前方一致を最優先
          const startsWithMatches = tags.filter((tag: Tag) => 
            tag.name.toLowerCase().startsWith(term)
          );
          
          // 次に単語の先頭が一致するもの
          const wordStartMatches = tags.filter((tag: Tag) => 
            !tag.name.toLowerCase().startsWith(term) && 
            tag.name.toLowerCase().split(/[-_\s]/).some((word: string) => word.startsWith(term))
          );
          
          // 最後に部分一致
          const includesMatches = tags.filter((tag: Tag) => 
            !tag.name.toLowerCase().startsWith(term) && 
            !tag.name.toLowerCase().split(/[-_\s]/).some((word: string) => word.startsWith(term)) &&
            tag.name.toLowerCase().includes(term)
          );
          
          // 優先順位に従って結合
          setFilteredTags([...startsWithMatches, ...wordStartMatches, ...includesMatches]);
        } else {
          setFilteredTags([]);
        }
      } catch (error) {
        console.error("タグの取得に失敗しました:", error);
      }
    };
    
    fetchAllTags();
  }, [query]);
  
  return (
    <div className="space-y-6">
      {/* 検索結果 */}
      {query && filteredTags.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 transition-all hover:shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Search className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">検索結果</h2>
            <span className="ml-auto text-sm text-gray-500">
              {filteredTags.length}件
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {filteredTags.map(tag => (
              <Link 
                key={tag.name}
                href={`/tags/${encodeURIComponent(tag.name)}`}
                className="group relative inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-md"
              >
                <span className="relative z-10 text-gray-700 group-hover:text-blue-700 transition-colors">
                  {tag.name}
                </span>
                <span className="relative z-10 ml-2 px-2 py-0.5 rounded-full bg-white/80 text-xs text-gray-600 group-hover:text-blue-600 group-hover:bg-blue-100/80 transition-all">
                  {tag.count}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-indigo-500/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:via-indigo-500/5 group-hover:to-purple-600/5 rounded-full transition-all duration-300"></div>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* 全てのタグ */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 transition-all hover:shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <Tag className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">全てのタグ</h2>
          <span className="ml-auto text-sm text-gray-500">
            {allTags.length}件
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {allTags.map(tag => (
            <Link 
              key={tag.name}
              href={`/tags/${encodeURIComponent(tag.name)}`}
              className={`group relative inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-md ${
                filteredTags.some(t => t.name === tag.name)
                  ? "bg-blue-50 hover:bg-blue-100"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <span className={
                filteredTags.some(t => t.name === tag.name)
                  ? "text-blue-700"
                  : "text-gray-700"
              }>{tag.name}</span>
              <span className={`relative z-10 ml-2 px-2 py-0.5 rounded-full bg-white/80 text-xs text-gray-600 group-hover:text-blue-600 group-hover:bg-blue-100/80 transition-all ${
                filteredTags.some(t => t.name === tag.name)
                  ? "bg-blue-100 group-hover:bg-blue-200 text-blue-600"
                  : "bg-gray-200 group-hover:bg-gray-300 text-gray-600"
              }`}>
                {tag.count}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-indigo-500/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:via-indigo-500/5 group-hover:to-purple-600/5 rounded-full transition-all duration-300"></div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TagSearchResultPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー部分 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Udemy講座ランキング
          </h1>
          <p className="text-gray-600 text-lg">
            Qiita記事での言及数に基づいたUdemy講座ランキング
          </p>
        </div>

        {/* メインコンテンツ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* サイドバー - タグ検索 */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4 border border-gray-100 transition-all duration-300 hover:shadow-xl hover:border-blue-100">
              <div className="space-y-6">
                <Link 
                  href="/" 
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-indigo-600 transition-colors text-sm group"
                >
                  <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
                  <span>トップページに戻る</span>
                </Link>
                
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-lg blur opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  <div className="relative bg-white rounded-lg p-4">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                      タグ検索
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                      興味のある技術タグから、人気のUdemy講座を見つけましょう
                    </p>
                    <TagSearch />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* メインエリア - タグ一覧 */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <Suspense 
              fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                </div>
              }
            >
              <TagSearchResults />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
} 
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TagSearch from "@/components/TagSearch";
import { getPopularCourseTags } from "@/lib/clientTags";
import UdemyCourseList from "@/components/UdemyCourseList";

interface Tag {
  name: string;
  count: number;
}

export default function TagSearchResultPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 全てのタグを取得
  useEffect(() => {
    const fetchAllTags = async () => {
      try {
        setLoading(true);
        const tags = await getPopularCourseTags(1000);
        setAllTags(tags);
        
        // 検索クエリでフィルタリング
        if (query) {
          const term = query.toLowerCase();
          
          // 前方一致を最優先
          const startsWithMatches = tags.filter(tag => 
            tag.name.toLowerCase().startsWith(term)
          );
          
          // 次に単語の先頭が一致するもの
          const wordStartMatches = tags.filter(tag => 
            !tag.name.toLowerCase().startsWith(term) && 
            tag.name.toLowerCase().split(/[-_\s]/).some(word => word.startsWith(term))
          );
          
          // 最後に部分一致
          const includesMatches = tags.filter(tag => 
            !tag.name.toLowerCase().startsWith(term) && 
            !tag.name.toLowerCase().split(/[-_\s]/).some(word => word.startsWith(term)) &&
            tag.name.toLowerCase().includes(term)
          );
          
          // 優先順位に従って結合
          setFilteredTags([...startsWithMatches, ...wordStartMatches, ...includesMatches]);
        } else {
          setFilteredTags([]);
        }
      } catch (error) {
        console.error("タグの取得に失敗しました:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllTags();
  }, [query]);
  
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← トップページに戻る
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-2 text-center">
        {query ? `「${query}」の検索結果` : "タグ検索"}
      </h1>
      
      {query && (
        <p className="text-center mb-8 text-gray-600">
          {filteredTags.length}件のタグが見つかりました
        </p>
      )}
      
      {/* タグ検索フォーム */}
      <div className="max-w-md mx-auto mb-8">
        <TagSearch initialValue={query} />
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
          <p className="mt-2">タグを読み込み中...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 検索結果 */}
          {query && filteredTags.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">検索結果</h2>
              <div className="flex flex-wrap gap-3">
                {filteredTags.map(tag => (
                  <Link 
                    key={tag.name}
                    href={`/tags/${encodeURIComponent(tag.name)}`}
                    className="inline-flex items-center px-3 py-2 rounded bg-blue-100 hover:bg-blue-200 text-sm font-medium transition-colors"
                  >
                    <span>{tag.name}</span>
                    <span className="ml-1 text-xs text-gray-500">({tag.count})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {/* 全てのタグ */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">全てのタグ</h2>
            <div className="flex flex-wrap gap-3">
              {allTags.map(tag => (
                <Link 
                  key={tag.name}
                  href={`/tags/${encodeURIComponent(tag.name)}`}
                  className={`inline-flex items-center px-3 py-2 rounded text-sm font-medium transition-colors ${
                    filteredTags.some(t => t.name === tag.name)
                      ? "bg-blue-100 hover:bg-blue-200"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <span>{tag.name}</span>
                  <span className="ml-1 text-xs text-gray-500">({tag.count})</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 
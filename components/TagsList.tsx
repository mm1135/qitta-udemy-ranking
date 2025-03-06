"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TagSearch from "./TagSearch";

interface Tag {
  name: string;
  count: number;
}

export default function TagsList() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch('/api/tags?limit=100');
        if (!response.ok) {
          throw new Error('タグの取得に失敗しました');
        }
        
        const data = await response.json();
        setTags(data.tags);
      } catch (error) {
        console.error('タグ一覧の取得エラー:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTags();
  }, []);
  
  if (loading) {
    return <div className="text-center py-8">タグを読み込み中...</div>;
  }
  
  if (tags.length === 0) {
    return <div className="text-center py-8">タグが見つかりませんでした</div>;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">タグから探す</h2>
      
      {/* タグ検索フォーム */}
      <div className="mb-6">
        <TagSearch />
      </div>
      
      {/* 人気タグ一覧 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tags.slice(0, 20).map(tag => (
          <Link 
            key={tag.name}
            href={`/tags/${encodeURIComponent(tag.name)}`}
            className="inline-flex items-center px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm font-medium transition-colors"
          >
            <span>{tag.name}</span>
            <span className="ml-1 text-xs text-gray-500">({tag.count})</span>
          </Link>
        ))}
      </div>
      
      {/* 全てのタグを見るリンク */}
      <div className="text-right">
        <Link 
          href="/tags"
          className="text-sm text-blue-600 hover:underline"
        >
          全てのタグを見る（{tags.length}件）
        </Link>
      </div>
    </div>
  );
} 
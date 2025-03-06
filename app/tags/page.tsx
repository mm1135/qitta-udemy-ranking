import { Suspense } from 'react';
import Link from "next/link";
import { getPopularCourseTags } from "@/lib/courseTags";

export default async function AllTagsPage() {
  const tags = await getPopularCourseTags(1000);
  
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← トップページに戻る
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-2 text-center">
        全てのタグ一覧
      </h1>
      <p className="text-center mb-8 text-gray-600">
        {tags.length}件のタグが見つかりました
      </p>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap gap-3">
          {tags.map(tag => (
            <Link 
              key={tag.name}
              href={`/tags/${encodeURIComponent(tag.name)}`}
              className="inline-flex items-center px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm font-medium transition-colors"
            >
              <span>{tag.name}</span>
              <span className="ml-1 text-xs text-gray-500">({tag.count})</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
} 
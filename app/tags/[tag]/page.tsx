import { Suspense } from 'react';
import UdemyCourseList from "@/components/UdemyCourseList";
import { getCoursesByTags, transformCourseData } from "@/lib/courseRanking";
import Link from "next/link";
import TagSearch from "@/components/TagSearch";

export default async function TagPage({ 
  params 
}: { 
  params: Promise<{ tag: string }> 
}) {
  // 非同期でパラメータを解決
  const { tag: encodedTag } = await params;
  const tag = decodeURIComponent(encodedTag);
  
  // タグに関連するコースを取得
  const data = await getCoursesByTags(tag, "all");
  const transformedCourses = data.courses.map(transformCourseData);
  
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← トップページに戻る
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-2 text-center">
        「{tag}」のコース一覧
      </h1>
      <p className="text-center mb-8 text-gray-600">
        {data.pagination.total}件のコースが見つかりました
      </p>
      
      {/* タグ検索フォーム */}
      <div className="max-w-md mx-auto mb-8">
        <TagSearch />
      </div>
      
      {/* 期間切り替えタブ */}
      <div className="mb-8">
        <div className="flex justify-center space-x-4">
          <Link 
            href={`/tags/${encodeURIComponent(tag)}`}
            className="px-4 py-2 rounded-md bg-blue-600 text-white"
          >
            全期間
          </Link>
          <Link 
            href={`/tags/${encodeURIComponent(tag)}/yearly`}
            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
          >
            年間
          </Link>
          <Link 
            href={`/tags/${encodeURIComponent(tag)}/monthly`}
            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
          >
            月間
          </Link>
        </div>
      </div>
      
      {/* コース一覧 */}
      <Suspense fallback={<div>コースを読み込み中...</div>}>
        <UdemyCourseList 
          courses={transformedCourses} 
          period="all" 
          tag={tag} 
          isSearchResultPage={true} 
        />
      </Suspense>
    </main>
  );
} 
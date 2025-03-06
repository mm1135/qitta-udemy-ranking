import { Suspense } from 'react';
import Link from "next/link";
import { getCoursesByTags } from "@/lib/courseTags";
import UdemyCourseList from "@/components/UdemyCourseList";
import TagSearch from "@/components/TagSearch";

type Period = "yearly" | "monthly";

export default async function TagPeriodPage({ 
  params 
}: { 
  params: { tag: string; period: Period } 
}) {
  const tag = decodeURIComponent(params.tag);
  const period = params.period;
  const data = await getCoursesByTags([tag], period);
  
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← トップページに戻る
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-2 text-center">
        「{tag}」のコース一覧（{period === 'yearly' ? '年間' : '月間'}）
      </h1>
      <p className="text-center mb-8 text-gray-600">
        {data.pagination.total}件のコースが見つかりました
      </p>
      
      {/* タグ検索フォームを追加 */}
      <div className="max-w-md mx-auto mb-8">
        <TagSearch />
      </div>
      
      {/* 期間切り替えタブ */}
      <div className="mb-8">
        <div className="flex justify-center space-x-4">
          <Link 
            href={`/tags/${encodeURIComponent(tag)}`}
            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
          >
            全期間
          </Link>
          <Link 
            href={`/tags/${encodeURIComponent(tag)}/yearly`}
            className={`px-4 py-2 rounded-md ${
              period === 'yearly' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            年間
          </Link>
          <Link 
            href={`/tags/${encodeURIComponent(tag)}/monthly`}
            className={`px-4 py-2 rounded-md ${
              period === 'monthly' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            月間
          </Link>
        </div>
      </div>
      
      {/* コース一覧 */}
      <Suspense fallback={<div>コースを読み込み中...</div>}>
        <UdemyCourseList 
          courses={data.courses} 
          period={period} 
          tag={tag} 
          isSearchResultPage={true} 
        />
      </Suspense>
    </main>
  );
} 
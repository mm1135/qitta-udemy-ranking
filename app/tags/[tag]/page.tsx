import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UdemyCourseList from "@/components/UdemyCourseList";
import TagsList from "@/components/TagsList";
import { getCoursesByTags } from "@/lib/courseTags";
import Link from "next/link";
import TagSearch from "@/components/TagSearch";

interface TagPageProps {
  params: {
    tag: string;
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const tag = decodeURIComponent(params.tag);
  
  // タグに関連するコースを取得
  const { courses } = await getCoursesByTags([tag], 'all');
  
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← トップページに戻る
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-2 text-center">
        「{tag}」に関するUdemy講座
      </h1>
      <p className="text-center mb-8 text-gray-600">
        {courses.length}件の講座が見つかりました
      </p>
      
      {/* タグ検索フォームを追加 */}
      <div className="max-w-md mx-auto mb-8">
        <TagSearch />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <Suspense fallback={<div>タグを読み込み中...</div>}>
            <TagsList />
          </Suspense>
        </div>
        
        <div className="lg:col-span-3">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList>
                <TabsTrigger value="all">すべて</TabsTrigger>
                <TabsTrigger value="yearly">年間</TabsTrigger>
                <TabsTrigger value="monthly">月間</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all">
              <UdemyCourseList 
                courses={courses} 
                period="all" 
                tag={tag} 
                isSearchResultPage={true} 
              />
            </TabsContent>
            
            <TabsContent value="yearly">
              <UdemyCourseList 
                courses={[]} 
                period="yearly" 
                tag={tag} 
                isSearchResultPage={true} 
              />
            </TabsContent>
            
            <TabsContent value="monthly">
              <UdemyCourseList 
                courses={[]} 
                period="monthly" 
                tag={tag} 
                isSearchResultPage={true} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
} 
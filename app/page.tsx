import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UdemyCourseList from "@/components/UdemyCourseList";
import TagsList from "@/components/TagsList";
import { getPeriodRanking } from "@/lib/courseRanking";
import { Suspense } from "react";

export default async function Home() {
  // ランキングデータを事前に取得
  const { courses: allTimeRanking } = await getPeriodRanking("all");
  
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Udemy講座ランキング
      </h1>
      <p className="text-center mb-8 text-gray-600">
        Qiita記事での言及数に基づいたUdemy講座ランキング
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* サイドバー - タグ一覧 */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <Suspense fallback={<div>タグを読み込み中...</div>}>
            <TagsList />
          </Suspense>
        </div>

        {/* メインコンテンツ - ランキング */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList>
                <TabsTrigger value="all">すべて</TabsTrigger>
                <TabsTrigger value="yearly">年間</TabsTrigger>
                <TabsTrigger value="monthly">月間</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all">
              <UdemyCourseList courses={allTimeRanking} period="all" />
            </TabsContent>
            
            <TabsContent value="yearly">
              <UdemyCourseList courses={[]} period="yearly" />
            </TabsContent>
            
            <TabsContent value="monthly">
              <UdemyCourseList courses={[]} period="monthly" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}

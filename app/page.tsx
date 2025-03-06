import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UdemyCourseList from "@/components/UdemyCourseList";
import TagsList from "@/components/TagsList";
import { getPeriodRanking, transformCourseData } from "@/lib/courseRanking";
import { Suspense } from "react";

export default async function Home() {
  // 全期間のデータを取得
  const { courses: allTimeRawCourses } = await getPeriodRanking("all");
  const allTimeRanking = allTimeRawCourses.map(transformCourseData);

  // 年間のデータを取得
  const { courses: yearlyRawCourses } = await getPeriodRanking("yearly");
  const yearlyRanking = yearlyRawCourses.map(transformCourseData);

  // 月間のデータを取得
  const { courses: monthlyRawCourses } = await getPeriodRanking("monthly");
  const monthlyRanking = monthlyRawCourses.map(transformCourseData);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー部分 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 relative inline-block group">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 animate-gradient-x">
              Udemy講座ランキング
            </span>
            <div className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          </h1>
          <p className="text-gray-600 text-lg">
            Qiita記事での言及数に基づいたUdemy講座ランキング
          </p>
        </div>

        {/* タブとコンテンツを1つのTabsコンポーネントで管理 */}
        <Tabs defaultValue="all" className="w-full">
          {/* タブナビゲーション */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-full shadow-lg p-1">
              <TabsList className="bg-transparent">
                <TabsTrigger 
                  value="all"
                  className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all duration-300"
                >
                  すべて
                </TabsTrigger>
                <TabsTrigger 
                  value="yearly"
                  className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all duration-300"
                >
                  年間
                </TabsTrigger>
                <TabsTrigger 
                  value="monthly"
                  className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all duration-300"
                >
                  月間
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* コンテンツエリア */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* サイドバー - タグ一覧 */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4 border border-gray-100 transition-all duration-300 hover:shadow-xl hover:border-blue-100">
                <Suspense fallback={<div>タグを読み込み中...</div>}>
                  <TagsList />
                </Suspense>
              </div>
            </div>

            {/* メインコンテンツ - ランキング */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <TabsContent value="all">
                <UdemyCourseList courses={allTimeRanking} period="all" />
              </TabsContent>
              <TabsContent value="yearly">
                <UdemyCourseList courses={yearlyRanking} period="yearly" />
              </TabsContent>
              <TabsContent value="monthly">
                <UdemyCourseList courses={monthlyRanking} period="monthly" />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </main>
  );
}

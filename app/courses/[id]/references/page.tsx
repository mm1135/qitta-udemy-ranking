import { getPeriodRanking } from "@/lib/courseRanking";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function CourseReferencesPage({ params }: { params: { id: string } }) {
  const courseId = params.id;
  
  // コース情報を取得
  const course = await prisma.udemyCourse.findUnique({
    where: { id: courseId }
  });
  
  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">コースが見つかりません</h1>
        <Link href="/" className="text-blue-600 hover:underline">
          トップページに戻る
        </Link>
      </div>
    );
  }
  
  // 引用記事を取得
  const references = await prisma.qiitaArticle.findMany({
    where: {
      udemyCourses: {
        some: {
          id: courseId
        }
      }
    },
    orderBy: {
      likes: 'desc'
    }
  });
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← トップページに戻る
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
      <p className="text-gray-600 mb-6">引用しているQiita記事（{references.length}件）</p>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="space-y-4">
          {references.map(article => (
            <div key={article.id} className="border-b pb-4">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-medium">
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {article.title}
                  </a>
                </h2>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                  いいね: {article.likes}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                <span>著者: {article.author}</span>
                <span className="mx-2">•</span>
                <span>公開日: {new Date(article.publishedAt).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
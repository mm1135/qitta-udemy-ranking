"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { fetchRankingData, fetchCoursesByTag } from "@/lib/clientRanking";
import { fetchCourseReferences } from "@/lib/courseReferences";
import ScrollToTop from "./ScrollToTop";
import Link from "next/link";

type Period = "all" | "yearly" | "monthly";

interface QiitaReference {
  id: string;
  title: string;
  likes: number;
  url: string;
}

interface CourseTag {
  name: string;
  count: number;
}

interface UdemyCourse {
  id: string;
  title: string;
  url: string;
  instructor: string;
  price: number;
  currentPrice: number;
  rating: number;
  studentsCount: number;
  mentionCount: number;
  references?: QiitaReference[];
  tags?: CourseTag[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export default function UdemyCourseList({ 
  courses: initialCourses, 
  period,
  tag
}: { 
  courses: UdemyCourse[], 
  period: Period,
  tag?: string  // タグパラメータをオプショナルに設定
}) {
  const [courses, setCourses] = useState<UdemyCourse[]>(initialCourses);
  const [loading, setLoading] = useState(period !== "all");
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [references, setReferences] = useState<{[key: string]: QiitaReference[]}>({});
  
  // ページネーション関連の状態
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastCourseElementRef = useRef<HTMLDivElement | null>(null);

  // タグが指定されている場合、APIリクエストにタグを含める
  useEffect(() => {
    const fetchData = async () => {
      setPage(1); // ページをリセット
      if (period !== "all") {
        setLoading(true);
        try {
          // タグが指定されている場合はタグでフィルタリング
          const data = tag 
            ? await fetchCoursesByTag(tag, period, 1)
            : await fetchRankingData(period, 1);
          
          setCourses(data.courses);
          setHasMore(data.pagination.hasMore);
        } catch (error) {
          console.error("ランキングデータの取得に失敗しました:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [period, tag]);

  // 追加データの読み込み - タグ対応
  const loadMoreCourses = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = tag
        ? await fetchCoursesByTag(tag, period, nextPage)
        : await fetchRankingData(period, nextPage);
        
      // 重複を防ぐために既存のコースIDを追跡
      const existingIds = new Set(courses.map(course => course.id));
      const newCourses = data.courses.filter((course: UdemyCourse) => !existingIds.has(course.id));
      
      setCourses(prev => [...prev, ...newCourses]);
      setPage(nextPage);
      setHasMore(data.pagination.hasMore && newCourses.length > 0);
    } catch (error) {
      console.error("追加データの取得に失敗:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [period, page, hasMore, loadingMore, tag, courses]);

  // Intersection Observerの設定
  useEffect(() => {
    if (loading) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreCourses();
      }
    }, { threshold: 0.5 });
    
    if (lastCourseElementRef.current) {
      observer.current.observe(lastCourseElementRef.current);
    }
    
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loading, hasMore, loadMoreCourses]);
  
  // コースの引用記事を取得
  const loadReferences = async (courseId: string) => {
    if (references[courseId]) return; // 既に取得済みの場合はスキップ
    
    try {
      const refs = await fetchCourseReferences(courseId);
      setReferences(prev => ({
        ...prev,
        [courseId]: refs
      }));
    } catch (error) {
      console.error(`コース${courseId}の引用記事取得に失敗:`, error);
      setReferences(prev => ({
        ...prev,
        [courseId]: []
      }));
    }
  };

  // コースの詳細表示を切り替える
  const toggleCourseDetails = async (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      await loadReferences(courseId);
    }
  };

  if (loading) {
    return <div className="text-center py-8">ランキングを読み込み中...</div>;
  }

  if (courses.length === 0) {
    return <div className="text-center py-8">該当する講座がありません</div>;
  }

  return (
    <div className="space-y-6 relative">
      {courses.map((course, index) => {
        // 最後の要素の場合、refを設定
        const isLastElement = index === courses.length - 1;
        
        return (
          <div 
            key={`${course.id}-${index}`}
            className="bg-white rounded-lg shadow-md p-4"
            ref={isLastElement ? lastCourseElementRef : undefined}
          >
            <div className="flex gap-4">
              {/* ランキング番号 */}
              <div className="flex-shrink-0 flex items-center justify-center h-16 w-16 bg-gray-100 rounded-lg">
                <span className="text-2xl font-bold text-gray-700">{index + 1}</span>
              </div>
              
              {/* コース情報 */}
              <div className="flex-grow space-y-4">
                {/* コースタイトルと情報 */}
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    <a 
                      href={course.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {course.title}
                    </a>
                  </h3>
                  <p className="text-gray-600 mb-2">講師: {course.instructor}</p>
                  <div className="flex flex-wrap text-sm text-gray-500 mb-3">
                    <span>受講者数: {course.studentsCount.toLocaleString()}</span>
                    {course.rating > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        <span>評価: {course.rating.toFixed(1)}</span>
                      </>
                    )}
                  </div>
                  
                  {/* タグ表示 */}
                  {course.tags && course.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="text-sm text-gray-600">タグ:</span>
                      {course.tags.map(tag => (
                        <Link
                          key={tag.name}
                          href={`/tags/${encodeURIComponent(tag.name)}`}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded transition-colors"
                        >
                          {tag.name}
                        </Link>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                      言及数: {course.mentionCount}
                    </span>
                    {course.currentPrice > 0 && (
                      <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                        現在価格: ¥{course.currentPrice.toLocaleString()}
                      </span>
                    )}
                    <button 
                      onClick={() => toggleCourseDetails(course.id)}
                      className="ml-auto text-sm text-blue-600 hover:underline"
                    >
                      {expandedCourse === course.id ? "閉じる" : "引用記事を表示"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 引用記事セクション */}
            {expandedCourse === course.id && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-lg font-medium mb-3">引用されているQiita記事 Top5</h3>
                {references[course.id] ? (
                  references[course.id].length > 0 ? (
                    <div className="space-y-3">
                      {references[course.id].slice(0, 5).map(ref => (
                        <div key={ref.id} className="flex justify-between items-start p-2 border-b">
                          <a 
                            href={ref.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex-grow"
                          >
                            {ref.title}
                          </a>
                          <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded ml-2 whitespace-nowrap">
                            いいね: {ref.likes}
                          </span>
                        </div>
                      ))}
                      <div className="text-right">
                        <a 
                          href={`/courses/${course.id}/references`} 
                          className="text-sm text-blue-600 hover:underline"
                        >
                          全ての引用記事を見る（{course.mentionCount}件）
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">引用記事が見つかりませんでした</p>
                  )
                ) : (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                    <span className="ml-2">読み込み中...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      
      {/* ローディングインジケータ */}
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 rounded-full border-t-transparent"></div>
          <span className="ml-2">さらに読み込み中...</span>
        </div>
      )}
      
      {/* もっと読み込むボタン（オプション） */}
      {hasMore && !loadingMore && (
        <div className="text-center py-4">
          <button 
            onClick={loadMoreCourses}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            もっと表示する
          </button>
        </div>
      )}
      
      {/* トップに戻るボタン */}
      <ScrollToTop />
    </div>
  );
} 
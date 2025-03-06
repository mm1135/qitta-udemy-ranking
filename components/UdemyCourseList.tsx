"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { fetchRankingData, fetchCoursesByTag } from "@/lib/clientRanking";
import { fetchCourseReferences } from "@/lib/courseReferences";
import ScrollToTop from "./ScrollToTop";
import Link from "next/link";
import { Users2, MessageSquare } from "lucide-react";

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
  yearlyMentionCount: number;
  monthlyMentionCount: number;
  references?: QiitaReference[];
  tags?: CourseTag[];
}

export default function UdemyCourseList({ 
  courses: initialCourses, 
  period,
  tag,
  isSearchResultPage = false
}: { 
  courses: UdemyCourse[], 
  period: Period,
  tag?: string,
  isSearchResultPage?: boolean
}) {
  const [courses, setCourses] = useState<UdemyCourse[]>(initialCourses);
  const [loading, setLoading] = useState(period !== "all");
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [references, setReferences] = useState<{[key: string]: QiitaReference[]}>({});
  
  // ページネーション関連の状態
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastCourseElementRef = useRef<HTMLDivElement | null>(null);
  // 既存のコースIDを追跡するための参照を追加
  const existingCoursesRef = useRef(new Set<string>());

  // コンポーネントの状態に表示中の全タグを追加
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  // initialCourses が変わった時に既存のコースIDセットを更新
  useEffect(() => {
    existingCoursesRef.current = new Set(initialCourses.map(course => course.id));
    setCourses(initialCourses);
    setPage(1);
  }, [initialCourses]);

  // タグが指定されている場合、APIリクエストにタグを含める
  useEffect(() => {
    const fetchData = async () => {
      if (period !== "all") {
        setLoading(true);
        try {
          // タグが指定されている場合はタグでフィルタリング
          const data = tag 
            ? await fetchCoursesByTag(tag, period, 1)
            : await fetchRankingData(period, 1);
          
          setCourses(data.courses);
          // existingCoursesRef.current = new Set(data.courses.map(course => course.id));
          setHasMore(data.pagination.hasMore);
          setPage(1);
        } catch (error) {
          console.error("ランキングデータの取得に失敗しました:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [period, tag]);

  // 追加データの読み込み - タイムアウト処理を追加
  const loadMoreCourses = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    // タイムアウト処理
    const timeoutId = setTimeout(() => {
      console.error("データ読み込みがタイムアウトしました");
      setLoadingMore(false);
      setHasMore(false); // タイムアウト時はこれ以上ロードしない
    }, 15000); // 15秒でタイムアウト
    
    try {
      const nextPage = page + 1;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const url = tag
        ? `${baseUrl}/api/courses/bytag/${encodeURIComponent(tag)}?period=${period}&page=${nextPage}`
        : `${baseUrl}/api/rankings/${period}?page=${nextPage}`;
      
      console.log(`追加データ読み込み開始: ${url}`);
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000) // 10秒でリクエストタイムアウト
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`追加データ取得成功: ${nextPage}ページ目, ${data.courses.length}件`);
      
      // 既存のコースIDを参照して重複を防ぐ
      const newCoursesFiltered = data.courses.filter((course: UdemyCourse) => {
        if (existingCoursesRef.current.has(course.id)) return false;
        existingCoursesRef.current.add(course.id);
        return true;
      });
      
      if (newCoursesFiltered.length > 0) {
        setCourses(prev => [...prev, ...newCoursesFiltered]);
        setPage(nextPage);
        setHasMore(data.pagination.hasMore);
      } else if (data.pagination.hasMore) {
        // データはないが、まだ次ページがある場合は次ページを読み込む
        setPage(nextPage);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("追加データの取得に失敗:", error);
      setHasMore(false);
    } finally {
      clearTimeout(timeoutId); // タイムアウトタイマーをクリア
      setLoadingMore(false);
    }
  }, [period, page, hasMore, loadingMore, tag]);

  // Intersection Observerの設定 - 修正
  useEffect(() => {
    if (loading || !hasMore || loadingMore) return;
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          // すぐにトリガーされすぎるのを防ぐために少し遅延
          setTimeout(() => loadMoreCourses(), 100);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    const lastElement = lastCourseElementRef.current;
    if (lastElement) {
      observer.observe(lastElement);
    }
    
    return () => {
      if (lastElement) {
        observer.unobserve(lastElement);
      }
      observer.disconnect();
    };
  }, [loading, hasMore, loadingMore, loadMoreCourses]);
  
  // コースの引用記事を取得
  const fetchReferences = useCallback(async (courseId: string) => {
    try {
      // 期間パラメータを追加
      const refs = await fetchCourseReferences(courseId, period);
      setReferences(prev => ({
        ...prev,
        [courseId]: refs
      }));
    } catch (error) {
      console.error(`Error fetching references for course ${courseId}:`, error);
    }
  }, [period]);

  // コースの詳細表示を切り替える
  const toggleCourseDetails = async (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      await fetchReferences(courseId);
    }
  };

  // タグの表示/非表示を切り替える関数
  const toggleTagsDisplay = (courseId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newExpandedTags = new Set(expandedTags);
    if (newExpandedTags.has(courseId)) {
      newExpandedTags.delete(courseId);
    } else {
      newExpandedTags.add(courseId);
    }
    setExpandedTags(newExpandedTags);
  };

  if (loading) {
    return <div className="text-center py-8">ランキングを読み込み中...</div>;
  }

  if (courses.length === 0) {
    return <div className="text-center py-8">該当する講座がありません</div>;
  }

  return (
    <div className="space-y-6 relative pb-8">
      {courses.map((course, index) => {
        // 正しいインデックス番号を計算
        const displayIndex = index + 1;
        
        return (
          <div 
            key={`${course.id}-${displayIndex}`}
            className="bg-white rounded-lg shadow-md p-4"
            ref={index === courses.length - 1 ? lastCourseElementRef : undefined}
          >
            <div className="flex gap-4">
              {/* ランキング番号 */}
              <div className="flex-shrink-0 flex items-center justify-center h-16 w-16 bg-gray-100 rounded-lg">
                <span className="text-2xl font-bold text-gray-700">{displayIndex}</span>
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
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <span className="flex items-center mr-4">
                      <Users2 className="w-4 h-4 mr-1" />
                      {course.studentsCount.toLocaleString()}人
                    </span>
                    <span className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {/* 期間に応じた言及数を表示 */}
                      {period === 'yearly' 
                        ? course.yearlyMentionCount 
                        : period === 'monthly' 
                          ? course.monthlyMentionCount 
                          : course.mentionCount}件の記事で言及
                    </span>
                  </div>
                  
                  {/* タグ表示 - 全てのタグを表示できるように改善 */}
                  {course.tags && course.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="text-sm text-gray-600">タグ:</span>
                      {(isSearchResultPage || expandedTags.has(course.id) 
                        ? course.tags 
                        : course.tags.slice(0, 5)
                      ).map(tag => (
                        <Link
                          key={tag.name}
                          href={`/tags/${encodeURIComponent(tag.name)}`}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded transition-colors"
                        >
                          {tag.name}
                        </Link>
                      ))}
                      
                      {/* 検索結果ページでなく、タグが5件以上ある場合は「もっと見る」ボタンを表示 */}
                      {!isSearchResultPage && course.tags.length > 5 && (
                        <button
                          onClick={(e) => toggleTagsDisplay(course.id, e)}
                          className="text-xs text-blue-600 hover:underline ml-1"
                        >
                          {expandedTags.has(course.id) 
                            ? "タグを折りたたむ" 
                            : `+${course.tags.length - 5}件のタグを表示`}
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                      言及数: {period === 'yearly' 
                        ? course.yearlyMentionCount 
                        : period === 'monthly' 
                          ? course.monthlyMentionCount 
                          : course.mentionCount}
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
              <div className="border-t border-gray-100 bg-gray-50 p-6">
                <h3 className="text-lg font-semibold mb-4">引用されているQiita記事 Top5</h3>
                {references[course.id] ? (
                  references[course.id].length > 0 ? (
                    <div className="space-y-3">
                      {references[course.id].slice(0, 5).map(ref => (
                        <div key={ref.id} 
                          className="bg-white p-4 rounded-lg shadow-sm hover:shadow transition-shadow"
                        >
                          <a 
                            href={ref.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-900 hover:text-blue-600 transition-colors block mb-2"
                          >
                            {ref.title}
                          </a>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                            bg-yellow-50 text-yellow-700">
                            👍 {ref.likes} いいね
                          </span>
                        </div>
                      ))}
                      <div className="text-right mt-4">
                        <a 
                          href={`/courses/${course.id}/references?period=${period}`}
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                        >
                          全ての引用記事を見る
                          <span className="ml-1">→</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      引用記事が見つかりませんでした
                    </p>
                  )
                ) : (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-3 border-blue-600 rounded-full border-t-transparent"></div>
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
      
      {/* もっと読み込むボタン */}
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
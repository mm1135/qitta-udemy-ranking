/**
 * タグでコースを検索
 */
export async function fetchCoursesByTag(tag: string, period: 'all' | 'yearly' | 'monthly', page = 1, limit = 50) {
  try {
    const response = await fetch(`/api/courses/by-tags?tags=${encodeURIComponent(tag)}&period=${period}&page=${page}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`タグ検索の取得に失敗しました: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('タグ検索の取得エラー:', error);
    return { 
      courses: [],
      pagination: {
        total: 0,
        page,
        limit,
        hasMore: false
      }
    };
  }
} 
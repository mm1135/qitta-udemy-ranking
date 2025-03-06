/**
 * クライアントコンポーネントで使用するためのタグ取得関数
 */
export async function getPopularCourseTags(limit = 100) {
  try {
    const response = await fetch(`/api/tags?limit=${limit}`);
    if (!response.ok) {
      throw new Error('タグの取得に失敗しました');
    }
    
    const data = await response.json();
    return data.tags;
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
} 
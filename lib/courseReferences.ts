/**
 * コースに関連する引用記事を取得
 */
export async function fetchCourseReferences(courseId: string) {
  try {
    const response = await fetch(`/api/courses/${courseId}/references`);
    
    if (!response.ok) {
      throw new Error(`引用記事の取得に失敗しました: ${response.status}`);
    }
    
    const data = await response.json();
    return data.references;
  } catch (error) {
    console.error('引用記事の取得エラー:', error);
    return [];
  }
} 
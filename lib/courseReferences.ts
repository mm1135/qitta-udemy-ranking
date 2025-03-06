/**
 * コースの引用記事を取得する
 */
export async function fetchCourseReferences(courseId: string, period: string = 'all') {
  try {
    const response = await fetch(`/api/courses/${courseId}/references?period=${period}`);
    if (!response.ok) {
      throw new Error('引用記事の取得に失敗しました');
    }
    
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error('Error fetching course references:', error);
    return [];
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getCoursesByTags } from '@/lib/courseTags';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // クエリパラメータを取得
    const tagsParam = searchParams.get('tags');
    if (!tagsParam) {
      return NextResponse.json(
        { error: 'タグが指定されていません' },
        { status: 400 }
      );
    }
    
    const tags = tagsParam.split(',');
    const period = (searchParams.get('period') || 'all') as 'all' | 'yearly' | 'monthly';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    const result = await getCoursesByTags(tags, period, page, limit);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Courses by tags API error:', error);
    return NextResponse.json(
      { error: 'コース情報の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
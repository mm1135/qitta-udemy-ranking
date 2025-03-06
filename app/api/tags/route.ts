import { NextRequest, NextResponse } from 'next/server';
import { getPopularCourseTags } from '@/lib/courseTags';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    const tags = await getPopularCourseTags(limit);
    
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Tags API error:', error);
    return NextResponse.json(
      { error: 'タグ情報の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
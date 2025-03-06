import { NextRequest, NextResponse } from 'next/server';
import { getPeriodRankingFromDB } from '@/lib/courseRanking';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  try {
    const period = (await params).period;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    if (!['all', 'yearly', 'monthly'].includes(period)) {
      return NextResponse.json(
        { error: '無効な期間が指定されました' },
        { status: 400 }
      );
    }

    const result = await getPeriodRankingFromDB(
      period as 'all' | 'yearly' | 'monthly',
      page,
      limit
    );
    
    const optimizedCourses = result.courses.map(course => ({
      id: course.id,
      title: course.title,
      url: course.url,
      instructor: course.instructor,
      price: course.price,
      currentPrice: course.currentPrice,
      rating: course.rating,
      studentsCount: course.studentsCount,
      mentionCount: course.mentionCount,
      yearlyMentionCount: course.yearlyMentionCount,
      monthlyMentionCount: course.monthlyMentionCount,
      tags: course.tags.slice(0, 10)
    }));

    return NextResponse.json({
      courses: optimizedCourses,
      pagination: result.pagination
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error in rankings API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 
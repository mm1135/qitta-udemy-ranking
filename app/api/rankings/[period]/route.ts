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
    
    return NextResponse.json(result, {
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
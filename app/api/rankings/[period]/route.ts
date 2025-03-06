import { NextRequest, NextResponse } from 'next/server';
import { getPeriodRanking } from '@/lib/courseRanking';

export async function GET(
  request: NextRequest,
  { params }: { params: { period: string } }
) {
  try {
    const period = params.period as 'all' | 'yearly' | 'monthly';
    const searchParams = request.nextUrl.searchParams;
    
    // クエリパラメータを取得
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    if (!['all', 'yearly', 'monthly'].includes(period)) {
      return NextResponse.json(
        { error: '無効な期間パラメータです' },
        { status: 400 }
      );
    }
    
    const result = await getPeriodRanking(period, page, limit);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Rankings API error:', error);
    return NextResponse.json(
      { error: 'ランキングデータの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
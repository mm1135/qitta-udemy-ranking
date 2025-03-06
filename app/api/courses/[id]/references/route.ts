import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // paramsを非同期で扱う
    const { id } = await Promise.resolve(params);
    const courseId = id;
    
    // URLからperiodパラメータを取得
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    
    // コースが存在するか確認
    const course = await prisma.udemyCourse.findUnique({
      where: {
        id: courseId
      }
    });
    
    if (!course) {
      return NextResponse.json(
        { error: 'コースが見つかりません' },
        { status: 404 }
      );
    }
    
    // 期間に応じたフィルタ条件を作成
    let dateFilter = {};
    if (period === 'yearly') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      dateFilter = {
        publishedAt: {
          gte: oneYearAgo
        }
      };
    } else if (period === 'monthly') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      dateFilter = {
        publishedAt: {
          gte: oneMonthAgo
        }
      };
    }
    
    // コースに関連する記事を取得（期間でフィルタリング）
    const articles = await prisma.qiitaArticle.findMany({
      where: {
        udemyCourses: {
          some: {
            id: courseId
          }
        },
        ...dateFilter
      },
      orderBy: {
        likes: 'desc'
      },
      select: {
        id: true,
        title: true,
        url: true,
        likes: true,
        publishedAt: true,
        tags: true
      }
    });
    
    return NextResponse.json({ 
      course,
      articles,
      total: articles.length,
      period
    });
  } catch (error) {
    console.error('Error fetching course references:', error);
    return NextResponse.json(
      { error: '記事の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
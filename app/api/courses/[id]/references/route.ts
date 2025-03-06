import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;
    
    // コースが存在するか確認
    const course = await prisma.udemyCourse.findUnique({
      where: { id: courseId }
    });
    
    if (!course) {
      return NextResponse.json(
        { error: '指定されたコースが見つかりません' },
        { status: 404 }
      );
    }
    
    // コースに関連するQiita記事を取得し、いいね数でソート
    const references = await prisma.qiitaArticle.findMany({
      where: {
        udemyCourses: {
          some: {
            id: courseId
          }
        }
      },
      orderBy: {
        likes: 'desc'
      },
      select: {
        id: true,
        title: true,
        url: true,
        likes: true,
        views: true,
        author: true,
        publishedAt: true
      }
    });
    
    return NextResponse.json({ references });
  } catch (error) {
    console.error('References API error:', error);
    return NextResponse.json(
      { error: '引用記事の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
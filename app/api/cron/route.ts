import { NextResponse } from 'next/server';
import { fetchUdemyArticlesFromQiita, extractUdemyCoursesFromArticle } from '../../../lib/qiitaApi';
import prisma from '../../../lib/prisma';
import { updateAllCourseMentionCounts } from '@/lib/mentionCounts';
import { headers } from 'next/headers';

// collect-data.tsの内容をここに移植（fetchUdemyCourseInfo, saveQiitaArticle, saveUdemyCourseなど）

export async function GET() {
  try {
    // 環境変数からCRON_SECRETを取得
    const cronSecret = process.env.CRON_SECRET;
    
    // 認証チェック（本番環境でのみ有効）
    if (process.env.NODE_ENV === 'production') {
      const authHeader = headers().get('authorization');
      
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: '認証エラー' },
          { status: 401 }
        );
      }
    }
    
    // 全コースの言及数を更新
    await updateAllCourseMentionCounts();
    
    return NextResponse.json({ 
      success: true,
      message: '言及数の更新が完了しました'
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'ジョブの実行中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
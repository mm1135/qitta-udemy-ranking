import { NextResponse } from 'next/server';
import { fetchUdemyArticlesFromQiita, extractUdemyCoursesFromArticle } from '../../../lib/qiitaApi';
import prisma from '../../../lib/prisma';

// collect-data.tsの内容をここに移植（fetchUdemyCourseInfo, saveQiitaArticle, saveUdemyCourseなど）

export async function GET() {
  try {
    // データ収集のメイン処理を実行
    // 各関数はすでに定義済み（collect-data.tsと同様）
    const articles = await fetchUdemyArticlesFromQiita(1, 20);
    
    // 以下、データ処理のロジック（省略）...
    
    return NextResponse.json({ success: true, message: `Processed ${articles.length} articles` });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
} 
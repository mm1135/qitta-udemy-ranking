import prisma from './prisma';

type RankingPeriod = 'all' | 'yearly' | 'monthly';

/**
 * 指定期間のランキングデータを取得（ページネーション対応）
 */
export async function getPeriodRanking(period: RankingPeriod, page = 1, limit = 50) {
  try {
    // 現在の日付から期間を計算
    const now = new Date();
    let startDate: Date | undefined;
    
    if (period === 'yearly') {
      // 1年前
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else if (period === 'monthly') {
      // 1ヶ月前
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    // スキップする件数を計算
    const skip = (page - 1) * limit;
    
    // 期間に応じたソートフィールドを選択
    let orderByField = 'mentionCount';
    if (period === 'yearly') {
      orderByField = 'yearlyMentionCount';
    } else if (period === 'monthly') {
      orderByField = 'monthlyMentionCount';
    }
    
    // コースを取得
    const courses = await prisma.udemyCourse.findMany({
      orderBy: {
        [orderByField]: 'desc'
      },
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            qiitaArticles: true
          }
        },
        // タグ情報を取得
        qiitaArticles: {
          select: {
            tags: true
          },
          take: 50 // パフォーマンスのため上限を設定
        }
      }
    });
    
    // 各コースのタグを集計
    const coursesWithTags = courses.map(course => {
      // タグの出現回数をカウント
      const tagCounts: Record<string, number> = {};
      
      course.qiitaArticles.forEach(article => {
        article.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
      
      // 出現回数順にソート
      const sortedTags = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      
      // qiitaArticlesを削除して新しいオブジェクトを返す
      const { qiitaArticles, ...courseData } = course;
      
      return {
        ...courseData,
        tags: sortedTags
      };
    });
    
    // 総コース数も取得
    const totalCount = await prisma.udemyCourse.count();
    
    return {
      courses: coursesWithTags,
      pagination: {
        total: totalCount,
        page,
        limit,
        hasMore: skip + courses.length < totalCount
      }
    };
  } catch (error) {
    console.error('Error fetching course ranking:', error);
    return { 
      courses: [],
      pagination: {
        total: 0,
        page,
        limit,
        hasMore: false
      }
    };
  }
} 
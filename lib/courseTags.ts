import prisma from './prisma';

/**
 * コースに関連するタグを取得
 */
export async function getPopularCourseTags(limit = 50) {
  try {
    // 1. Qiita記事のタグを集計
    const tags = await prisma.qiitaArticle.findMany({
      where: {
        udemyCourses: {
          some: {} // Udemyコースに関連する記事
        }
      },
      select: {
        tags: true
      }
    });
    
    // 2. タグの出現回数をカウント
    const tagCounts: Record<string, number> = {};
    
    tags.forEach(article => {
      article.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    // 3. 人気順に並べ替え
    const sortedTags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return sortedTags;
  } catch (error) {
    console.error('Error fetching course tags:', error);
    return [];
  }
}

/**
 * タグでコースをフィルタリング
 */
export async function getCoursesByTags(tags: string[], period: 'all' | 'yearly' | 'monthly' = 'all', page = 1, limit = 50) {
  try {
    // 現在の日付から期間を計算
    const now = new Date();
    let startDate: Date | undefined;
    
    if (period === 'yearly') {
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else if (period === 'monthly') {
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    // 条件を構築
    const whereCondition: any = {
      qiitaArticles: {
        some: {
          tags: {
            hasSome: tags
          }
        }
      }
    };
    
    // 期間条件を追加
    if (startDate) {
      whereCondition.qiitaArticles.some.publishedAt = {
        gte: startDate
      };
    }
    
    // スキップする件数を計算
    const skip = (page - 1) * limit;
    
    // タグに関連するコースを取得
    const courses = await prisma.udemyCourse.findMany({
      where: whereCondition,
      orderBy: {
        mentionCount: 'desc'
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
          take: 50
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
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // 上位5件のみ
      
      // qiitaArticlesを削除して新しいオブジェクトを返す
      const { qiitaArticles, ...courseData } = course;
      
      return {
        ...courseData,
        tags: sortedTags
      };
    });
    
    // 総コース数も取得
    const totalCount = await prisma.udemyCourse.count({
      where: whereCondition
    });
    
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
    console.error('Error fetching courses by tags:', error);
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
import prisma from './prisma';

type RankingPeriod = 'all' | 'yearly' | 'monthly';

interface CourseTag {
  name: string;
  count: number;
}

interface RawCourseData {
  id: string;
  title: string;
  url: string;
  instructor: string;
  price: number;
  currentPrice: number;
  rating: number;
  studentsCount: number;
  mentionCount: number;
  yearlyMentionCount: number;
  monthlyMentionCount: number;
  tags: CourseTag[];
  qiitaArticles?: {
    tags: string[];
  }[];
  _count?: {
    qiitaArticles: number;
  };
}

interface UdemyCourse {
  id: string;
  title: string;
  url: string;
  instructor: string;
  price: number;
  currentPrice: number;
  rating: number;
  studentsCount: number;
  mentionCount: number;
  yearlyMentionCount: number;
  monthlyMentionCount: number;
  tags?: CourseTag[];
}

// データ変換用のヘルパー関数
export function transformCourseData(course: RawCourseData): UdemyCourse {
  return {
    ...course,
    tags: course.tags.map((tag: CourseTag) => ({
      name: tag.name,
      count: tag.count
    }))
  };
}

/**
 * 指定期間のランキングデータを取得（DB直接アクセス用）
 */
export async function getPeriodRankingFromDB(period: RankingPeriod, page = 1, limit = 50) {
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
    
    const skip = (page - 1) * limit;
    
    let orderByField = 'mentionCount';
    if (period === 'yearly') {
      orderByField = 'yearlyMentionCount';
    } else if (period === 'monthly') {
      orderByField = 'monthlyMentionCount';
    }
    
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
        qiitaArticles: {
          select: {
            tags: true
          },
          take: 50
        }
      }
    });
    
    const coursesWithTags = courses.map(course => {
      const tagCounts: Record<string, number> = {};
      
      course.qiitaArticles.forEach(article => {
        article.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
      
      const sortedTags = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      
      const {...courseData } = course;
      
      return {
        ...courseData,
        tags: sortedTags
      };
    });
    
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

/**
 * APIを通じてランキングデータを取得（クライアント用）
 */
export async function getPeriodRanking(period: string) {
  // 完全なURLを構築
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/rankings/${period}`, {
    // キャッシュの設定を追加
    cache: 'no-store',
    // サーバーサイドの場合はnext: { revalidate: 0 }を追加
    ...(typeof window === 'undefined' && { next: { revalidate: 0 } })
  });
  const data = await response.json();
  
  return {
    courses: data.courses.map(transformCourseData),
    pagination: data.pagination
  };
}

/**
 * タグでフィルタリングしたコースを取得
 */
export async function getCoursesByTags(tag: string, period: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const response = await fetch(
    `${baseUrl}/api/courses/bytag/${encodeURIComponent(tag)}?period=${period}`,
    {
      cache: 'no-store',
      ...(typeof window === 'undefined' && { next: { revalidate: 0 } })
    }
  );
  const data = await response.json();
  
  return {
    courses: data.courses.map(transformCourseData),
    pagination: data.pagination
  };
} 
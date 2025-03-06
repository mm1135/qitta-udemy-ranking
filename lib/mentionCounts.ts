import prisma from './prisma';

/**
 * 全てのコースの言及数を更新する
 */
export async function updateAllCourseMentionCounts() {
  try {
    // 全てのコースを取得
    const courses = await prisma.udemyCourse.findMany({
      select: {
        id: true
      }
    });
    
    console.log(`${courses.length}件のコースの言及数を更新します...`);
    
    // 各コースの言及数を更新
    for (const course of courses) {
      await updateCourseMentionCounts(course.id);
    }
    
    console.log('全コースの言及数の更新が完了しました');
  } catch (error) {
    console.error('言及数の更新中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * 特定のコースの言及数を更新する
 */
export async function updateCourseMentionCounts(courseId: string) {
  try {
    // 現在の日付
    const now = new Date();
    
    // 1年前の日付
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // 1ヶ月前の日付
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // 全期間の言及数
    const totalCount = await prisma.qiitaArticle.count({
      where: {
        udemyCourses: {
          some: {
            id: courseId
          }
        }
      }
    });
    
    // 年間の言及数
    const yearlyCount = await prisma.qiitaArticle.count({
      where: {
        udemyCourses: {
          some: {
            id: courseId
          }
        },
        publishedAt: {
          gte: oneYearAgo
        }
      }
    });
    
    // 月間の言及数
    const monthlyCount = await prisma.qiitaArticle.count({
      where: {
        udemyCourses: {
          some: {
            id: courseId
          }
        },
        publishedAt: {
          gte: oneMonthAgo
        }
      }
    });
    
    // コースの言及数を更新
    await prisma.udemyCourse.update({
      where: {
        id: courseId
      },
      data: {
        mentionCount: totalCount,
        yearlyMentionCount: yearlyCount,
        monthlyMentionCount: monthlyCount,
        lastUpdated: now
      }
    });
    
    console.log(`コース ${courseId} の言及数を更新しました: 全期間=${totalCount}, 年間=${yearlyCount}, 月間=${monthlyCount}`);
    
    return {
      totalCount,
      yearlyCount,
      monthlyCount
    };
  } catch (error) {
    console.error(`コース ${courseId} の言及数の更新中にエラーが発生しました:`, error);
    throw error;
  }
} 
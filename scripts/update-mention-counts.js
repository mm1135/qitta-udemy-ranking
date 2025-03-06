const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 全てのコースの言及数を更新する
 */
async function updateAllCourseMentionCounts() {
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
async function updateCourseMentionCounts(courseId) {
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

/**
 * 特定のタグに関連するコースの言及数を更新する
 */
async function updateMentionCountsByTag(tag) {
  try {
    console.log(`タグ「${tag}」に関連するコースの言及数を更新します...`);
    
    // タグに関連するコースを取得
    const courses = await prisma.udemyCourse.findMany({
      where: {
        qiitaArticles: {
          some: {
            tags: {
              has: tag
            }
          }
        }
      },
      select: {
        id: true
      }
    });
    
    console.log(`${courses.length}件のコースが見つかりました`);
    
    // 各コースの言及数を更新
    for (const course of courses) {
      await updateCourseMentionCounts(course.id);
    }
    
    console.log(`タグ「${tag}」に関連するコースの言及数の更新が完了しました`);
    return courses.length;
  } catch (error) {
    console.error(`タグ「${tag}」に関連するコースの言及数の更新中にエラーが発生しました:`, error);
    throw error;
  }
}

/**
 * 最近更新されたコースの言及数を更新する
 * @param {number} days - 何日前までのコースを更新するか
 */
async function updateRecentlyUpdatedCourses(days = 7) {
  try {
    // 指定日数前の日付
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    console.log(`${days}日以内に更新されたコースの言及数を更新します...`);
    
    // 最近更新されたコースを取得
    const courses = await prisma.udemyCourse.findMany({
      where: {
        updatedAt: {
          gte: cutoffDate
        }
      },
      select: {
        id: true
      }
    });
    
    console.log(`${courses.length}件のコースが見つかりました`);
    
    // 各コースの言及数を更新
    for (const course of courses) {
      await updateCourseMentionCounts(course.id);
    }
    
    console.log(`最近更新されたコースの言及数の更新が完了しました`);
    return courses.length;
  } catch (error) {
    console.error(`最近更新されたコースの言及数の更新中にエラーが発生しました:`, error);
    throw error;
  }
}

/**
 * メイン関数
 */
async function main() {
  try {
    console.log('コースの言及数更新を開始します...');
    
    // コマンドライン引数を解析
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      // 引数がない場合は全てのコースを更新
      await updateAllCourseMentionCounts();
    } else if (args[0] === '--tag' && args[1]) {
      // タグが指定された場合はそのタグに関連するコースを更新
      await updateMentionCountsByTag(args[1]);
    } else if (args[0] === '--recent') {
      // 最近更新されたコースを更新
      const days = args[1] ? parseInt(args[1], 10) : 7;
      await updateRecentlyUpdatedCourses(days);
    } else if (args[0] === '--course' && args[1]) {
      // 特定のコースIDが指定された場合
      await updateCourseMentionCounts(args[1]);
    } else {
      console.log('使用方法:');
      console.log('  node update-mention-counts.js                  # 全てのコースを更新');
      console.log('  node update-mention-counts.js --tag "React"    # 特定のタグに関連するコースを更新');
      console.log('  node update-mention-counts.js --recent 7       # 7日以内に更新されたコースを更新');
      console.log('  node update-mention-counts.js --course "12345" # 特定のコースを更新');
    }
    
    console.log('処理が完了しました');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('予期しないエラーが発生しました:', error);
    process.exit(1);
  }); 
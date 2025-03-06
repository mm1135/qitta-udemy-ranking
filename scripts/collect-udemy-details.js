const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const prisma = new PrismaClient();

/**
 * Udemy APIからコース詳細を取得
 */
async function fetchUdemyCourseDetails(courseId) {
  try {
    // Udemy APIキー
    const apiKey = process.env.UDEMY_API_KEY;
    const clientId = process.env.UDEMY_CLIENT_ID;
    
    if (!apiKey || !clientId) {
      throw new Error('Udemy API credentials not found in environment variables');
    }
    
    // APIエンドポイント
    const url = `https://www.udemy.com/api-2.0/courses/${courseId}?fields[course]=title,url,price,discount_price,rating,num_subscribers,visible_instructors`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${Buffer.from(`${clientId}:${apiKey}`).toString('base64')}`,
        "Accept": "application/json, text/plain, */*"
      }
    });
    
    if (!response.ok) {
      console.error(`API error for course ${courseId}: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching details for course ${courseId}:`, error);
    return null;
  }
}

/**
 * コース詳細をデータベースに更新
 */
async function updateCourseDetails(courseId, details) {
  try {
    if (!details) return false;
    
    // インストラクター情報の抽出
    const instructor = details.visible_instructors && details.visible_instructors.length > 0
      ? details.visible_instructors[0].title  // 主要インストラクター
      : "Unknown";
    
    // コース情報を更新（価格や評価のみを更新し、mentionCountなどは保持）
    await prisma.udemyCourse.update({
      where: { id: courseId },
      data: {
        title: details.title,
        instructor: instructor,
        price: details.price || 0,
        currentPrice: details.discount_price || details.price || 0,
        rating: details.rating || 0,
        studentsCount: details.num_subscribers || 0,
        // priceHistoryに価格履歴を追加
        priceHistory: {
          create: {
            price: details.price || 0,
            date: new Date()
          }
        }
      }
    });
    
    console.log(`Updated details for course: ${courseId} - ${details.title}`);
    return true;
  } catch (error) {
    console.error(`Error updating course ${courseId}:`, error);
    return false;
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    // プレースホルダーデータを持つコースを取得（詳細未取得のコース）
    const coursesToUpdate = await prisma.udemyCourse.findMany({
      where: {
        OR: [
          { price: 0 },
          { rating: 0 },
          { studentsCount: 0 },
          { title: { startsWith: 'Udemy Course:' } }
        ]
      },
      orderBy: { mentionCount: 'desc' },
      take: 100  // 一度に処理する数を制限
    });
    
    console.log(`Found ${coursesToUpdate.length} courses needing details update`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // 各コースの詳細を取得して更新
    for (const course of coursesToUpdate) {
      console.log(`Fetching details for course: ${course.id}`);
      
      // API呼び出し制限を考慮した遅延
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const details = await fetchUdemyCourseDetails(course.id);
      if (details) {
        const success = await updateCourseDetails(course.id, details);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      } else {
        errorCount++;
      }
    }
    
    console.log(`Completed details update process`);
    console.log(`Successfully updated: ${successCount} courses`);
    console.log(`Failed updates: ${errorCount} courses`);
    
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
main()
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 
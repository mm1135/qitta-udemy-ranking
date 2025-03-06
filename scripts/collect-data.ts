import { fetchUdemyArticlesFromQiita, extractUdemyCoursesFromArticle, QiitaArticle } from '../lib/qiitaApi';
import prisma from '../lib/prisma';
import fetch from 'node-fetch';

// Udemyコース情報を取得する関数
async function fetchUdemyCourseInfo(courseUrl: string) {
  try {
    // Udemyのコース情報を取得（実際にはUdemyのAPIキーが必要）
    // ここではダミーデータを返す例を示します
    const courseId = courseUrl.split('/').pop() || '';
    
    // 本番ではUdemyのAPIを使用するか、HTMLをスクレイピングする方法を検討
    // 注意: スクレイピングの場合は利用規約に注意
    console.log(`Fetching info for course: ${courseUrl}`);
    
    // ダミーデータを返す（開発用）
    return {
      id: courseId,
      title: `Udemy Course: ${courseId}`,
      url: courseUrl,
      imageUrl: `https://img-c.udemycdn.com/course/240x135/${Math.floor(Math.random() * 1000000)}_1.jpg`,
      instructor: '講師名',
      price: Math.floor(Math.random() * 20000) + 5000,
      currentPrice: Math.floor(Math.random() * 5000) + 1000,
      rating: (Math.random() * 2) + 3, // 3-5の範囲
      studentsCount: Math.floor(Math.random() * 10000),
    };
    
    /* 本番実装の例（将来的に実装する場合のサンプル）:
    const response = await fetch(`https://www.udemy.com/api-2.0/courses/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.UDEMY_API_KEY}`,
        'Accept': 'application/json, text/plain, */*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Udemy API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      id: data.id,
      title: data.title,
      url: data.url,
      imageUrl: data.image_240x135,
      instructor: data.visible_instructors[0]?.display_name || 'Unknown',
      price: data.price,
      currentPrice: data.price_detail.amount,
      rating: data.rating,
      studentsCount: data.num_subscribers
    };
    */
  } catch (error) {
    console.error(`Error fetching course info for ${courseUrl}:`, error);
    return null;
  }
}

// Qiita記事情報をデータベースに保存する関数
async function saveQiitaArticle(article: QiitaArticle) {
  try {
    const { id, title, url, likes_count, created_at, tags, user } = article;
    
    // 記事が既に存在するか確認
    const existingArticle = await prisma.qiitaArticle.findUnique({
      where: { id }
    });
    
    if (existingArticle) {
      // 既存の記事を更新
      await prisma.qiitaArticle.update({
        where: { id },
        data: {
          title,
          url,
          likes: likes_count,
          views: 0, // Qiita APIではview countが取得できない
          author: user.id,
          tags: tags.map(t => t.name),
          publishedAt: new Date(created_at)
        }
      });
      console.log(`Updated article: ${title}`);
    } else {
      // 新しい記事を作成
      await prisma.qiitaArticle.create({
        data: {
          id,
          title,
          url,
          likes: likes_count,
          views: 0,
          author: user.id,
          tags: tags.map(t => t.name),
          publishedAt: new Date(created_at)
        }
      });
      console.log(`Created new article: ${title}`);
    }
    
    return id;
  } catch (error) {
    console.error(`Error saving article:`, error);
    return null;
  }
}

// コース情報をデータベースに保存する関数
async function saveUdemyCourse(courseInfo: any, articleId: string) {
  if (!courseInfo) return null;
  
  try {
    const {
      id,
      title,
      url,
      imageUrl,
      instructor,
      price,
      currentPrice,
      rating,
      studentsCount
    } = courseInfo;
    
    // コースが既に存在するか確認
    const existingCourse = await prisma.udemyCourse.findUnique({
      where: { id }
    });
    
    let courseId;
    
    if (existingCourse) {
      // 既存のコースを更新
      const updatedCourse = await prisma.udemyCourse.update({
        where: { id },
        data: {
          title,
          url,
          imageUrl,
          instructor,
          price,
          currentPrice,
          rating,
          studentsCount,
        }
      });
      
      courseId = updatedCourse.id;
      console.log(`Updated course: ${title}`);
      
      // 価格が変わっていれば価格履歴を追加
      if (existingCourse.currentPrice !== currentPrice) {
        await prisma.priceHistory.create({
          data: {
            courseId,
            price: currentPrice,
            date: new Date()
          }
        });
        console.log(`Added price history for ${title}: ${currentPrice}`);
      }
    } else {
      // 新しいコースを作成
      const newCourse = await prisma.udemyCourse.create({
        data: {
          id,
          title,
          url,
          imageUrl,
          instructor,
          price,
          currentPrice,
          rating,
          studentsCount,
          priceHistory: {
            create: {
              price: currentPrice,
              date: new Date()
            }
          }
        }
      });
      
      courseId = newCourse.id;
      console.log(`Created new course: ${title}`);
    }
    
    // 記事とコースの関連付けが存在するか確認
    const existingMention = await prisma.courseMention.findFirst({
      where: {
        courseId,
        articleId
      }
    });
    
    if (!existingMention) {
      // 新しい言及を作成
      await prisma.courseMention.create({
        data: {
          courseId,
          articleId
        }
      });
      console.log(`Created mention between article ${articleId} and course ${courseId}`);
    }
    
    // コースのタグを更新
    if (title) {
      // タイトルからタグを抽出する例（実際にはより洗練された方法で）
      const possibleTags = ['JavaScript', 'Python', 'React', 'Vue', 'Angular', 'Node.js', 'Web開発', 'フロントエンド', 'バックエンド', 'データサイエンス', 'AI', '機械学習'];
      const titleLower = title.toLowerCase();
      
      // タイトルに含まれるタグを抽出
      const matchedTags = possibleTags.filter(tag => 
        titleLower.includes(tag.toLowerCase())
      );
      
      // ランダムなタグも追加（デモ用）
      const randomTags = [];
      for (let i = 0; i < 2; i++) {
        const randomTag = possibleTags[Math.floor(Math.random() * possibleTags.length)];
        if (!matchedTags.includes(randomTag)) {
          randomTags.push(randomTag);
        }
      }
      
      const allTags = [...matchedTags, ...randomTags];
      
      // 重複を避けつつタグを追加
      for (const tag of allTags) {
        const existingTag = await prisma.courseTag.findFirst({
          where: {
            courseId,
            tag
          }
        });
        
        if (!existingTag) {
          await prisma.courseTag.create({
            data: {
              courseId,
              tag
            }
          });
          console.log(`Added tag ${tag} to course ${courseId}`);
        }
      }
    }
    
    return courseId;
  } catch (error) {
    console.error(`Error saving course:`, error);
    return null;
  }
}

// メイン処理
async function main() {
  console.log('Starting data collection...');
  
  try {
    // Qiitaから記事を取得
    const articles = await fetchUdemyArticlesFromQiita(1, 20); // 最初の20記事を取得
    console.log(`Fetched ${articles.length} articles from Qiita`);
    
    // 各記事を処理
    for (const article of articles) {
      // 記事をデータベースに保存
      const articleId = await saveQiitaArticle(article);
      if (!articleId) continue;
      
      // 記事からUdemyコースのURLを抽出
      const courseUrls = await extractUdemyCoursesFromArticle(article.id);
      console.log(`Found ${courseUrls.length} course URLs in article ${article.id}`);
      
      // 各コースを処理
      for (const courseUrl of courseUrls) {
        // コース情報を取得
        const courseInfo = await fetchUdemyCourseInfo(courseUrl);
        if (!courseInfo) continue;
        
        // コース情報をデータベースに保存
        await saveUdemyCourse(courseInfo, articleId);
      }
    }
    
    console.log('Data collection completed successfully!');
  } catch (error) {
    console.error('Error in data collection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  }); 
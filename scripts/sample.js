const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const prisma = new PrismaClient();

/**
 * QiitaからUdemyに関する記事を取得する
 * タイトルまたは本文に「udemy」「Udemy」が含まれる記事を検索
 * @param {number} page - 取得するページ番号
 * @param {number} perPage - 1ページあたりの記事数
 * @returns {Promise<Array>} - 完全な内容を含む記事の配列
 */
async function fetchUdemyArticlesFromQiita(page = 1, perPage = 100) {
  const apiKey = process.env.QIITA_API_KEY;
  
  try {
    console.log(`Fetching from Qiita (page ${page}, per_page ${perPage})...`);
    
    // 検索クエリパラメータ
    const searchQuery = encodeURIComponent('udemy OR Udemy');
    
    const response = await fetch(
      `https://qiita.com/api/v2/items?query=${searchQuery}&page=${page}&per_page=${perPage}`,
      {
        headers: apiKey ? {
          'Authorization': `Bearer ${apiKey}`
        } : {}
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const articlesList = await response.json();
    console.log(`Got ${articlesList.length} items from search`);
    
    // タイトルまたは本文に「udemy」が含まれる記事のみをフィルタリング
    const filteredArticles = articlesList.filter(article => {
      // タイトル確認（大文字小文字を区別しない）
      if (article.title.toLowerCase().includes('udemy')) return true;
      
      // 本文確認（利用可能な場合）
      if (article.body && article.body.toLowerCase().includes('udemy')) return true;
      
      return false;
    });
    
    console.log(`Filtered to ${filteredArticles.length} Udemy-related articles`);
    
    // 本文がない記事の詳細を取得
    const articlesWithContent = await Promise.all(
      filteredArticles.map(async article => {
        // 既に本文があればそのまま使用
        if (article.body) return article;
        
        try {
          const detailResponse = await fetch(
            `https://qiita.com/api/v2/items/${article.id}`,
            {
              headers: apiKey ? {
                'Authorization': `Bearer ${apiKey}`
              } : {}
            }
          );
          
          if (!detailResponse.ok) {
            console.error(`Failed to fetch article ${article.id}: ${detailResponse.status}`);
            return null;
          }
          
          return await detailResponse.json();
        } catch (error) {
          console.error(`Error fetching article ${article.id}:`, error);
          return null;
        }
      })
    );
    
    // nullを除去
    const validArticles = articlesWithContent.filter(a => a !== null);
    console.log(`Successfully processed ${validArticles.length} articles with content`);
    
    return validArticles;
  } catch (error) {
    console.error('Error fetching from Qiita:', error);
    throw error;
  }
}

/**
 * 記事の内容からUdemyコースのURLを抽出する
 * @param {Object} article - 本文を含む記事オブジェクト
 * @returns {Array<string>} - ユニークなUdemyコースURLの配列
 */
function extractUdemyCoursesFromArticle(article) {
  try {
    const body = article.body || '';
    
    // コースURLのみを抽出するための正規表現パターン（コースIDが含まれるURLのみ）
    const patterns = [
      // 標準的なコースURLフォーマット - コースIDが必須
      /https:\/\/www\.udemy\.com\/course\/[a-zA-Z0-9_-]+[a-zA-Z0-9_=&?\/\-]*/g,
      
      // 代替フォーマット - コースIDが必須
      /https:\/\/udemy\.com\/course\/[a-zA-Z0-9_-]+[a-zA-Z0-9_=&?\/\-]*/g,
      
      // 言語プレフィックス付きのURL - コースIDが必須
      /https:\/\/www\.udemy\.com\/[a-z]{2}\/course\/[a-zA-Z0-9_-]+[a-zA-Z0-9_=&?\/\-]*/g
    ];
    
    // すべてのパターンからマッチを取得
    let allMatches = [];
    patterns.forEach(pattern => {
      const matches = body.match(pattern);
      if (matches) {
        allMatches = [...allMatches, ...matches];
      }
    });
    
    if (allMatches.length === 0) return [];
    
    // URLを正規化して重複を除去
    const normalizedUrls = allMatches.map(url => {
      // クエリパラメータなしの基本コースURLを抽出
      const baseUrlMatch = url.match(/(https:\/\/(?:www\.)?udemy\.com\/(?:[a-z]{2}\/)?course\/[a-zA-Z0-9_-]+)/);
      return baseUrlMatch ? baseUrlMatch[1] : url;
    }).filter(url => {
      // Udemyのコースページのみを含め、ホームページURLは除外
      // /course/ の後に少なくとも1文字以上あることを確認
      return url.match(/\/course\/[a-zA-Z0-9_-]+$/);
    });
    
    const uniqueUrls = [...new Set(normalizedUrls)];
    console.log(`Found ${uniqueUrls.length} unique course URLs in article ${article.id}`);
    return uniqueUrls;
  } catch (error) {
    console.error(`Error extracting Udemy courses from article ${article.id}:`, error);
    return [];
  }
}

/**
 * Qiita記事をデータベースに保存する
 * @param {Object} article - Qiita APIから取得した記事データ
 * @returns {Promise<string|null>} - 保存に成功した場合は記事ID、失敗した場合はnull
 */
async function saveQiitaArticle(article) {
  try {
    const { id, title, url, likes_count, created_at, tags, user } = article;
    
    // 記事が既に存在するか確認
    const existingArticle = await prisma.qiitaArticle.findUnique({
      where: { id }
    });
    
    // Udemyコースの抽出（フィルタリングに使用）
    const courseUrls = extractUdemyCoursesFromArticle(article);
    
    const articleData = {
      title,
      url,
      likes: likes_count,
      views: 0, // APIは閲覧数を提供していないためデフォルト値
      author: user.id,
      tags: tags.map(t => t.name),
      publishedAt: new Date(created_at),
      // 記事内容に関する情報
      isUdemyFocused: title.toLowerCase().includes('udemy') || 
                      (article.body && article.body.toLowerCase().includes('udemy')),
      // Udemyコースの数を保存
      udemyCoursesCount: courseUrls.length
    };
    
    if (existingArticle) {
      // 既存の記事を更新
      await prisma.qiitaArticle.update({
        where: { id },
        data: articleData
      });
      console.log(`Updated article: ${title}`);
    } else {
      // 新しい記事を作成
      await prisma.qiitaArticle.create({
        data: {
          id,
          ...articleData
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

/**
 * URLから抽出した基本的なUdemyコース情報を保存する
 * @param {string} courseUrl - UdemyコースのURL
 * @param {string} articleId - 関連するQiita記事のID
 * @returns {Promise<string|null>} - 保存に成功した場合はコースID、失敗した場合はnull
 */
async function saveSimpleUdemyCourse(courseUrl, articleId) {
  try {
    // URLからコースIDを抽出
    const courseIdMatch = courseUrl.match(/\/course\/([^\/\?]+)/);
    if (!courseIdMatch) return null;
    
    const courseId = courseIdMatch[1];
    
    // コースが既に存在するか確認
    const existingCourse = await prisma.udemyCourse.findUnique({
      where: { id: courseId }
    });
    
    if (!existingCourse) {
      // 新しいコースを作成
      await prisma.udemyCourse.create({
        data: {
          id: courseId,
          url: courseUrl,
          title: `Udemy Course: ${courseId}`,  // プレースホルダータイトル
          instructor: "Unknown", // 必須フィールド
          createdAt: new Date(),
          updatedAt: new Date(),
          qiitaArticles: {
            connect: { id: articleId }
          }
        }
      });
      console.log(`Created new course: ${courseId}`);
    } else {
      // 既存のコースにQiita記事を関連付け
      await prisma.udemyCourse.update({
        where: { id: courseId },
        data: {
          updatedAt: new Date(),
          qiitaArticles: {
            connect: { id: articleId }
          }
        }
      });
      console.log(`Connected course ${courseId} to article ${articleId}`);
    }
    
    return courseId;
  } catch (error) {
    console.error(`Error saving course:`, error);
    return null;
  }
}

/**
 * 特定のQiita記事を取得し、Udemyコースのリンクを抽出する
 * @param {string} articleId - 記事ID (URLの末尾部分、例: 'ac4f7f8e405b2b0b1372')
 * @returns {Promise<{article: Object, courseUrls: Array}>} - 記事情報とUdemyコースURLの配列
 */
async function fetchSpecificQiitaArticle(articleId) {
  const apiKey = process.env.QIITA_API_KEY;
  
  try {
    console.log(`Fetching specific article with ID: ${articleId}`);
    
    // 記事の詳細を取得
    const response = await fetch(
      `https://qiita.com/api/v2/items/${articleId}`,
      {
        headers: apiKey ? {
          'Authorization': `Bearer ${apiKey}`
        } : {}
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const article = await response.json();
    console.log(`Successfully fetched article: ${article.title}`);
    
    // 記事からUdemyコースのURLを抽出
    const courseUrls = extractUdemyCoursesFromArticle(article);
    
    return { article, courseUrls };
  } catch (error) {
    console.error('Error fetching specific article:', error);
    throw error;
  }
}

/**
 * 単一の記事を処理する関数
 * @param {string} articleId - 記事ID
 */
async function processSingleArticle(articleId = 'ac4f7f8e405b2b0b1372') {
  try {
    console.log(`Processing single article: ${articleId}`);
    
    // 特定の記事を取得し、コースURLを抽出
    const { article, courseUrls } = await fetchSpecificQiitaArticle(articleId);
    
    // 記事情報の表示
    console.log('\n===== 記事情報 =====');
    console.log(`タイトル: ${article.title}`);
    console.log(`作成者: ${article.user.id}`);
    console.log(`投稿日: ${new Date(article.created_at).toLocaleString('ja-JP')}`);
    console.log(`いいね数: ${article.likes_count}`);
    console.log(`タグ: ${article.tags.map(tag => tag.name).join(', ')}`);
    
    if (courseUrls.length > 0) {
      console.log('\n===== 抽出したUdemyコースURL =====');
      courseUrls.forEach((url, index) => {
        console.log(`${index + 1}. ${url}`);
      });
    } else {
      console.log('\n記事内にUdemyコースのURLが見つかりませんでした。');
    }
    
    // データベースに保存する場合
    const saveToDb = false; // trueに変更すると保存します
    if (saveToDb) {
      const savedArticleId = await saveQiitaArticle(article);
      if (savedArticleId) {
        for (const courseUrl of courseUrls) {
          await saveSimpleUdemyCourse(courseUrl, savedArticleId);
        }
      }
    }
    
    return { article, courseUrls };
  } catch (error) {
    console.error('Error processing single article:', error);
    throw error;
  }
}

/**
 * メイン処理関数
 * Udemyコースリンクを含む記事のみを取得して処理
 */
async function main() {
  console.log('Starting Qiita data collection...');
  
  try {
    // 複数ページを処理
    const maxPages = 5; // 必要に応じて調整
    let totalArticles = 0;
    let totalCourses = 0;
    let articlesWithCourses = 0;
    
    for (let page = 1; page <= maxPages; page++) {
      // 現在のページから記事を取得
      const articles = await fetchUdemyArticlesFromQiita(page, 100);
      
      if (articles.length === 0) {
        console.log(`No more articles found on page ${page}, stopping`);
        break;
      }
      
      console.log(`Processing ${articles.length} articles from page ${page}`);
      totalArticles += articles.length;
      
      // 各記事を処理
      for (const article of articles) {
        // Udemyコースのリンクを抽出
        const courseUrls = extractUdemyCoursesFromArticle(article);
        
        // Udemyコースリンクがある記事のみ処理
        if (courseUrls.length > 0) {
          articlesWithCourses++;
          
          // 記事をデータベースに保存
          const articleId = await saveQiitaArticle(article);
          if (!articleId) continue;
          
          totalCourses += courseUrls.length;
          
          // 各コースを保存
          for (const courseUrl of courseUrls) {
            await saveSimpleUdemyCourse(courseUrl, articleId);
          }
        }
      }
      
      // APIレート制限を尊重するための短い遅延
      if (page < maxPages) {
        console.log('Waiting before fetching next page...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`Qiita data collection completed successfully!`);
    console.log(`Processed ${totalArticles} total articles`);
    console.log(`Found ${articlesWithCourses} articles containing Udemy course links`);
    console.log(`Extracted ${totalCourses} unique Udemy courses`);
  } catch (error) {
    console.error('Error in data collection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * URLから記事IDを抽出する
 * @param {string} url - 記事のURL
 * @returns {string|null} - 抽出された記事ID、または無効なURLの場合はnull
 */
function extractArticleIdFromUrl(url) {
  try {
    // URLから記事IDを抽出するための正規表現
    const match = url.match(/qiita\.com\/[^\/]+\/items\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting article ID from URL:', error);
    return null;
  }
}

/**
 * スクリプトのエントリーポイント
 * コマンドライン引数に基づいて単一記事または複数記事を処理
 */
async function run() {
  try {
    // コマンドライン引数をチェック
    const arg = process.argv[2];
    
    if (arg) {
      // 単一の記事を処理
      let articleId;
      
      if (arg.includes('qiita.com')) {
        // URLから記事IDを抽出
        articleId = extractArticleIdFromUrl(arg);
        if (!articleId) {
          throw new Error('Invalid Qiita URL format');
        }
      } else {
        // 直接IDが指定された場合
        articleId = arg;
      }
      
      await processSingleArticle(articleId);
    } else {
      // 複数の記事を検索して処理
      await main();
    }
  } catch (error) {
    console.error('Error running script:', error);
    throw error;
  }
}

// スクリプト実行
run()
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:');
    if (error instanceof Error) {
      console.error(`Name: ${error.name}`);
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    } else {
      console.error('Unknown error type:', error);
    }
    process.exit(1);
  });
const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const prisma = new PrismaClient();

/**
 * QiitaからUdemyに関する記事を取得する
 * より広範囲な検索を行うよう改良
 * @param {number} page - 取得するページ番号
 * @param {number} perPage - 1ページあたりの記事数
 * @returns {Promise<Array>} - 完全な内容を含む記事の配列
 */
async function fetchUdemyArticlesFromQiita(page = 1, perPage = 100) {
  const apiKey = process.env.QIITA_API_KEY;
  
  try {
    console.log(`Fetching from Qiita (page ${page}, per_page ${perPage})...`);
    
    // より広範囲な検索クエリ
    // 「udemy」「Udemy」「オンライン講座」など関連キーワードを含める
    const searchQuery = encodeURIComponent('udemy OR Udemy OR "online course" OR "オンライン講座" OR "プログラミング 講座"');
    
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
    
    // Udemyコースの抽出（処理に使用するが、保存はしない）
    const courseUrls = extractUdemyCoursesFromArticle(article);
    
    // スキーマに存在するフィールドのみを含める
    const articleData = {
      title,
      url,
      likes: likes_count,
      views: 0, // APIは閲覧数を提供していないためデフォルト値
      author: user.id,
      tags: tags.map(t => t.name),
      publishedAt: new Date(created_at)
      // isUdemyFocusedとudemyCoursesCountフィールドを削除
    };
    
    if (existingArticle) {
      // 既存の記事を更新
      await prisma.qiitaArticle.update({
        where: { id },
        data: articleData
      });
      console.log(`Updated article: ${title} (ID: ${id})`);
    } else {
      // 新しい記事を作成
      await prisma.qiitaArticle.create({
        data: {
          id,
          ...articleData
        }
      });
      console.log(`Created new article: ${title} (ID: ${id})`);
    }
    
    return { id, courseUrls }; // コースURLも返すように修正
  } catch (error) {
    console.error(`Error saving article:`, error);
    return null;
  }
}

/**
 * URLから抽出した基本的なUdemyコース情報を保存する
 * @param {string} courseUrl - UdemyコースのURL
 * @param {string} articleId - 関連するQiita記事のID
 * @returns {Promise<{id: string, isNew: boolean}|null>} - 保存結果情報
 */
async function saveSimpleUdemyCourse(courseUrl, articleId) {
  try {
    // URLからコースIDを抽出
    const courseIdMatch = courseUrl.match(/\/course\/([^\/]+)/);
    if (!courseIdMatch) return null;
    
    const courseId = courseIdMatch[1];
    let isNewCourse = false;
    
    // 既存のコースを確認
    const existingCourse = await prisma.udemyCourse.findUnique({
      where: { id: courseId },
      include: {
        qiitaArticles: true // 関連記事を取得
      }
    });
    
    // この記事がすでにこのコースに関連付けられているか確認
    const alreadyLinked = existingCourse?.qiitaArticles.some(article => article.id === articleId) || false;
    
    if (!existingCourse) {
      // 新しいコースを作成
      await prisma.udemyCourse.create({
        data: {
          id: courseId,
          url: courseUrl,
          title: `Udemy Course: ${courseId}`,  // 仮タイトル
          instructor: "Unknown",               // 仮講師名
          price: 0,                            // 仮の価格（後で更新）
          currentPrice: 0,                     // 仮の価格（後で更新）
          rating: 0,                           // 仮の評価（後で更新）
          studentsCount: 0,                    // 仮の受講者数（後で更新）
          mentionCount: 1,                     // 初回言及
          qiitaArticles: {
            connect: { id: articleId }
          }
        }
      });
      console.log(`Created new course: ${courseId} (placeholder data will be updated later)`);
      isNewCourse = true;
    } else if (!alreadyLinked) {
      // 既存のコースに新しいQiita記事を関連付け、カウントを増やす
      await prisma.udemyCourse.update({
        where: { id: courseId },
        data: {
          mentionCount: { increment: 1 }, // 新しい記事での言及があるため増加
          qiitaArticles: {
            connect: { id: articleId }
          }
        }
      });
      console.log(`Connected course ${courseId} to article ${articleId} and incremented count`);
    } else {
      // すでに関連付けられている場合は何もしない
      console.log(`Course ${courseId} already linked to article ${articleId}`);
    }
    
    return { id: courseId, isNew: isNewCourse, alreadyLinked };
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
    const saveToDb = true; // データベースに保存する
    if (saveToDb) {
      const result = await saveQiitaArticle(article);
      if (result) {
        const { id: savedArticleId } = result;
        for (const courseUrl of courseUrls) {
          await saveSimpleUdemyCourse(courseUrl, savedArticleId);
        }
        console.log(`記事とコースを保存しました。`);
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
 * @param {boolean} autoResume - 自動的に前回の進捗から再開するかどうか
 */
async function main(autoResume = false) {
  console.log('Starting Qiita data collection...');
  
  try {
    // 最大ページ数の制限を削除し、記事がなくなるまで処理を継続
    const maxPages = Number.MAX_SAFE_INTEGER; // 実質無制限
    
    // 前回の進捗状況を読み込む
    let startPage = 1;
    let processedArticles = new Set();
    let processedCourses = new Set();
    let startingTotalArticles = 0;
    let startingArticlesWithCourses = 0;
    let startingTotalCourses = 0;
    
    try {
      const fs = require('fs');
      const progressFiles = fs.readdirSync('./').filter(f => f.startsWith('progress-') && f.endsWith('.json'));
      
      if (progressFiles.length > 0) {
        // 最新の進捗ファイルを取得
        const latestProgressFile = progressFiles.sort().reverse()[0];
        console.log(`最新の進捗ファイル: ${latestProgressFile}`);
        
        const progressData = JSON.parse(fs.readFileSync(latestProgressFile, 'utf8'));
        
        let resumeFromLastPosition = autoResume; // 自動再開モードの場合はデフォルトでtrue
        
        if (!autoResume) {
          // ユーザーに確認する
          const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          const answer = await new Promise(resolve => {
            readline.question(`前回の進捗（ページ ${progressData.lastProcessedPage}）から続けますか？ (y/n) `, resolve);
          });
          readline.close();
          
          resumeFromLastPosition = answer.toLowerCase() === 'y';
        }
        
        if (resumeFromLastPosition) {
          startPage = progressData.lastProcessedPage + 1;
          processedArticles = new Set(progressData.processedArticles || []);
          processedCourses = new Set(progressData.processedCourses || []);
          startingTotalArticles = progressData.totalArticles || 0;
          startingArticlesWithCourses = progressData.articlesWithCourses || 0;
          startingTotalCourses = progressData.totalCourses || 0;
          
          console.log(`ページ ${startPage} から処理を再開します`);
          console.log(`既に処理済みの記事: ${processedArticles.size}`);
          console.log(`既に処理済みのコース: ${processedCourses.size}`);
        }
      }
    } catch (error) {
      console.error('進捗ファイルの読み込みエラー:', error);
      console.log('ページ1から処理を開始します');
    }
    
    let totalArticles = startingTotalArticles;
    let totalCourses = startingTotalCourses;
    let newCourses = 0;
    let articlesWithCourses = startingArticlesWithCourses;
    let newArticlesWithCourses = 0;
    
    // Qiita APIの制限を尊重するための変数
    const startTime = Date.now();
    let requestCount = 0;
    const MAX_REQUESTS_PER_HOUR = 1000; // Qiitaの一般的な制限
    
    // ページごとの処理
    for (let page = startPage; page <= maxPages; page++) {
      // APIリクエスト数のチェックと制限
      requestCount++;
      if (requestCount >= MAX_REQUESTS_PER_HOUR) {
        const elapsedMs = Date.now() - startTime;
        if (elapsedMs < 3600000) { // 1時間未満
          const waitTime = 3600000 - elapsedMs + 1000; // 余裕を持って待機
          console.log(`API制限に達しました。${waitTime/1000}秒待機します...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          requestCount = 0; // カウンターリセット
        }
      }
      
      // 現在のページから記事を取得
      const articles = await fetchUdemyArticlesFromQiita(page, 100);
      
      // 記事がなくなったら完了フラグをセット
      if (!articles || articles.length === 0) {
        console.log(`ページ ${page} で記事がなくなりました。収集を完了します。`);
        
        // 最終進捗を保存（完了フラグ付き）
        saveProgress(page, processedArticles, processedCourses, totalArticles, articlesWithCourses, totalCourses, true);
        console.log(`収集完了ステータスをファイルに保存しました`);
        
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
          // この記事が処理済みかチェック
          const isArticleProcessed = processedArticles.has(article.id);
          
          // 記事をデータベースに保存
          const result = await saveQiitaArticle(article);
          if (!result) continue;
          
          const { id: articleId } = result;
          
          // 新しく処理された記事の場合のみカウント
          if (!isArticleProcessed) {
            articlesWithCourses++;
            newArticlesWithCourses++;
            processedArticles.add(article.id);
          }
          
          // 各コースを処理
          let courseCount = 0;
          for (const courseUrl of courseUrls) {
            const courseResult = await saveSimpleUdemyCourse(courseUrl, articleId);
            if (courseResult) {
              courseCount++;
              
              // 新規コースまたは新たな関連付けの場合のみカウント
              if (!processedCourses.has(courseResult.id)) {
                totalCourses++;
                processedCourses.add(courseResult.id);
                
                if (courseResult.isNew) {
                  newCourses++;
                }
              }
            }
          }
          
          console.log(`Processed ${courseCount} courses for article ${article.id}`);
        }
      }
      
      // 進捗情報を定期的に表示
      if (page % 5 === 0) {
        console.log(`===== 進捗状況 (ページ ${page}/${maxPages}) =====`);
        console.log(`処理済み記事数: ${totalArticles}`);
        console.log(`Udemyコース言及記事数: ${articlesWithCourses}`);
        console.log(`抽出したユニークなコース数: ${totalCourses}`);
      }
      
      // 5ページごとに進捗状況をファイルに保存
      if (page % 5 === 0) {
        if (saveProgress(page, processedArticles, processedCourses, totalArticles, articlesWithCourses, totalCourses)) {
          console.log(`Progress saved to file at page ${page}`);
        }
      }
      
      // APIレート制限を尊重するための短い遅延
      console.log('Waiting before fetching next page...');
      await new Promise(resolve => setTimeout(resolve, 1500)); // 少し長めの待機時間
    }
    
    console.log(`Qiita data collection completed successfully!`);
    console.log(`Processed ${totalArticles} total articles`);
    console.log(`Found ${articlesWithCourses} articles containing Udemy course links`);
    console.log(`New articles processed: ${newArticlesWithCourses}`);
    console.log(`Extracted ${totalCourses} unique Udemy courses`);
    console.log(`New courses added: ${newCourses}`);
    
    // 処理完了後、新しいコースの詳細情報を更新
    if (newCourses > 0) {
      console.log(`\n新規追加されたコースの詳細情報を取得します...`);
      try {
        const { spawn } = require('child_process');
        const updateProcess = spawn('node', ['scripts/collect-udemy-details.js']);
        
        updateProcess.stdout.on('data', (data) => {
          console.log(`詳細更新: ${data}`);
        });
        
        updateProcess.stderr.on('data', (data) => {
          console.error(`詳細更新エラー: ${data}`);
        });
        
        updateProcess.on('close', (code) => {
          console.log(`詳細更新プロセスが終了しました: ${code}`);
        });
      } catch (error) {
        console.error('コース詳細更新の起動に失敗:', error);
      }
    }
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
 */
async function run() {
  try {
    // コマンドライン引数をチェック
    const arg = process.argv[2];
    const autoResume = process.argv.includes('--resume');
    
    if (arg && arg !== '--resume') {
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
      await main(autoResume);
    }
  } catch (error) {
    console.error('Error running script:', error);
    throw error;
  }
}

/**
 * 進捗保存関数の修正 - 引数を追加
 */
function saveProgress(page, processedArticles, processedCourses, totalArticles, articlesWithCourses, totalCourses, isCompleted = false) {
  try {
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `./progress-${timestamp}.json`;
    
    const progress = {
      lastProcessedPage: page,
      processedArticles: Array.from(processedArticles),
      processedCourses: Array.from(processedCourses),
      totalArticles: totalArticles,
      articlesWithCourses: articlesWithCourses,
      totalCourses: totalCourses,
      timestamp: new Date().toISOString(),
      isCompleted: isCompleted
    };
    
    fs.writeFileSync(filename, JSON.stringify(progress, null, 2));
    console.log(`進捗をファイル ${filename} に保存しました`);
    
    // 古い進捗ファイルを削除（最新の5つだけ保持）
    const progressFiles = fs.readdirSync('./').filter(f => f.startsWith('progress-') && f.endsWith('.json'));
    if (progressFiles.length > 5) {
      progressFiles.sort().slice(0, progressFiles.length - 5).forEach(file => {
        fs.unlinkSync(file);
        console.log(`古い進捗ファイル ${file} を削除しました`);
      });
    }
    
    return true;
  } catch (err) {
    console.error('進捗保存エラー:', err);
    return false;
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
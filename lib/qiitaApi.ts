export interface QiitaArticle {
  id: string;
  title: string;
  url: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  tags: {name: string}[];
  user: {
    id: string;
    name: string;
    profile_image_url: string;
  };
}

// CommonJS形式
async function fetchUdemyArticlesFromQiita(page = 1, perPage = 100) {
  // QiitaのAPIキーを環境変数から取得
  const apiKey = process.env.QIITA_API_KEY;
  
  try {
    const response = await fetch(
      `https://qiita.com/api/v2/items?query=udemy&page=${page}&per_page=${perPage}`,
      {
        headers: apiKey ? {
          'Authorization': `Bearer ${apiKey}`
        } : {}
      }
    );
    
    if (!response.ok) {
      throw new Error(`Qiita API responded with status: ${response.status}`);
    }
    
    const articles: QiitaArticle[] = await response.json();
    
    // Udemyリンクを含む記事をフィルタリング
    return articles.filter(article => {
      // タイトルやタグにUdemyが含まれているか
      if (article.title.toLowerCase().includes('udemy')) return true;
      if (article.tags.some(tag => tag.name.toLowerCase() === 'udemy')) return true;
      
      // 本文の取得は別のAPIコールが必要なため、
      // この段階では行わず、タイトルとタグのみでフィルタリング
      
      return false;
    });
  } catch (error: unknown) {
    console.error('Error fetching from Qiita API:', error);
    throw error;
  }
}

// Udemy講座情報を記事から抽出する関数
export async function extractUdemyCoursesFromArticle(articleId: string): Promise<string[]> {
  try {
    const apiKey = process.env.QIITA_API_KEY;
    const response = await fetch(
      `https://qiita.com/api/v2/items/${articleId}`,
      {
        headers: apiKey ? {
          'Authorization': `Bearer ${apiKey}`
        } : {}
      }
    );
    
    if (!response.ok) {
      throw new Error(`Qiita API responded with status: ${response.status}`);
    }
    
    const article = await response.json();
    const body = article.body as string;
    
    // Udemyコースのリンクを正規表現で抽出
    const udemyUrlRegex = /https:\/\/www\.udemy\.com\/course\/[a-zA-Z0-9_-]+/g;
    const matches = body.match(udemyUrlRegex);
    
    // nullチェックと型変換を明示的に行う
    if (!matches) return [];
    
    // RegExpMatchArrayをstring[]に変換
    const stringMatches: string[] = Array.from(matches).map(match => String(match));
    
    // 重複を除去して返す
    return [...new Set(stringMatches)];
  } catch (error: unknown) {
    console.error(`Error extracting Udemy courses from article ${articleId}:`, error);
    return [];
  }
}

// 最後にエクスポート
module.exports = {
  fetchUdemyArticlesFromQiita,
  extractUdemyCoursesFromArticle,
  // 他の関数やオブジェクト
}; 
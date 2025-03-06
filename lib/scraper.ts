import { ApifyClient } from 'apify-client';
import prisma from './prisma';

export async function scrapeQiitaArticles() {
  const apifyClient = new ApifyClient({
    token: process.env.APIFY_TOKEN,
  });

  try {
    // Apifyでスクレイピング実行
    const run = await apifyClient.actor('apify/website-content-crawler').call({
      startUrls: [{ url: 'https://qiita.com/tags/udemy' }],
      maxCrawlPages: 100,
      maxCrawlDepth: 2,
    });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    // Udemyリンクを含む記事を抽出
    const articlesWithUdemy = items.filter((item: any) => {
      return item.url.includes('qiita.com') && 
             (item.text.includes('udemy.com') || item.text.includes('Udemy'));
    });

    // 記事情報を整形してDBに保存
    // 実装は省略

    return { success: true, count: articlesWithUdemy.length };
  } catch (error: unknown) {
    console.error('Scraping failed:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function extractUdemyCourses() {
  // 記事からUdemyコースリンクを抽出する処理
  // 実装は省略
} 
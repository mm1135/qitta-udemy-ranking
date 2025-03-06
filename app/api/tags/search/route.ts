import { NextRequest, NextResponse } from 'next/server';
import { getPopularCourseTags } from '@/lib/courseTags';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    console.log(`タグ検索API: クエリ="${query}", 制限=${limit}`);
    
    // すべてのタグを取得
    const allTags = await getPopularCourseTags(1000);
    console.log(`取得したタグ総数: ${allTags.length}`);
    
    // 検索クエリでフィルタリング
    let filteredTags = allTags;
    
    if (query) {
      const term = query.toLowerCase();
      
      // 前方一致を最優先
      const startsWithMatches = allTags.filter(tag => 
        tag.name.toLowerCase().startsWith(term)
      ).sort((a, b) => b.count - a.count);
      
      // 次に単語の先頭が一致するもの（例：「react-hooks」で「react」を検索）
      const wordStartMatches = allTags.filter(tag => 
        !tag.name.toLowerCase().startsWith(term) && 
        tag.name.toLowerCase().split(/[-_\s]/).some(word => word.startsWith(term))
      ).sort((a, b) => b.count - a.count);
      
      // 最後に部分一致
      const includesMatches = allTags.filter(tag => 
        !tag.name.toLowerCase().startsWith(term) && 
        !tag.name.toLowerCase().split(/[-_\s]/).some(word => word.startsWith(term)) &&
        tag.name.toLowerCase().includes(term)
      ).sort((a, b) => b.count - a.count);
      
      // 優先順位に従って結合
      filteredTags = [...startsWithMatches, ...wordStartMatches, ...includesMatches];
      
      console.log(`フィルタリング結果: 前方一致=${startsWithMatches.length}, 単語先頭一致=${wordStartMatches.length}, 部分一致=${includesMatches.length}`);
    }
    
    // 結果を制限
    const limitedTags = filteredTags.slice(0, limit);
    console.log(`返却するタグ数: ${limitedTags.length}`);
    
    // タグ名のリストをログ出力（デバッグ用）
    if (limitedTags.length > 0) {
      console.log(`返却するタグ: ${limitedTags.map(t => t.name).join(', ')}`);
    }
    
    return NextResponse.json({ 
      tags: limitedTags,
      total: filteredTags.length,
      query
    });
  } catch (error) {
    console.error('Tags search API error:', error);
    return NextResponse.json(
      { error: 'タグ検索中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
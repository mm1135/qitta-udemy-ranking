import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartIcon } from "lucide-react";
import { CourseMention } from '@/types';

interface MentionsListProps {
  mentions: CourseMention[];
}

export default function MentionsList({ mentions }: MentionsListProps) {
  if (!mentions || mentions.length === 0) {
    return <p className="text-muted-foreground">まだQiitaでの言及はありません。</p>;
  }

  // 言及を日付で降順ソート
  const sortedMentions = [...mentions].sort((a, b) => 
    new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedMentions.map(mention => {
        const article = mention.article;
        const publishDate = new Date(article.publishedAt);
        
        return (
          <Card key={mention.id}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-medium">
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {article.title}
                </a>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={`https://qiita-image-store.s3.amazonaws.com/0/avatars/${article.author}.png`} />
                    <AvatarFallback>{article.author.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">@{article.author}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <HeartIcon className="h-4 w-4 text-red-500" />
                    <span className="text-sm">{article.likes}</span>
                  </div>
                  
                  <span className="text-sm text-muted-foreground">
                    {publishDate.toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 
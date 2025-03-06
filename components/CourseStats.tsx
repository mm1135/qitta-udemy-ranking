import { Card, CardContent } from "@/components/ui/card";
import { UdemyCourse, CourseMention } from '@/types';

interface CourseStatsProps {
  course: UdemyCourse;
}

export default function CourseStats({ course }: CourseStatsProps) {
  // 言及数を計算
  const mentionsCount = course.mentions.length;
  
  // Qiita内のいいね総数を計算
  const totalLikes = course.mentions.reduce((total: number, mention: CourseMention) => 
    total + (mention.article.likes || 0), 0
  );
  
  // 最初の言及日を取得
  const mentions = [...course.mentions];
  mentions.sort((a, b) => 
    new Date(a.article.publishedAt).getTime() - new Date(b.article.publishedAt).getTime()
  );
  const firstMention = mentions.length > 0 ? new Date(mentions[0].article.publishedAt) : null;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Qiitaでの言及数</p>
          <p className="text-xl font-bold">{mentionsCount}件</p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">言及記事の合計いいね数</p>
          <p className="text-xl font-bold">{totalLikes}いいね</p>
        </div>
        
        {firstMention && (
          <div>
            <p className="text-sm text-muted-foreground">最初の言及日</p>
            <p className="text-xl font-bold">
              {firstMention.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        )}
        
        <div>
          <p className="text-sm text-muted-foreground">価格変動回数</p>
          <p className="text-xl font-bold">{course.priceHistory.length}回</p>
        </div>
      </CardContent>
    </Card>
  );
} 
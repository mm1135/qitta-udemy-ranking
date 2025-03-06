import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarIcon } from "lucide-react";
import { UdemyCourse, CourseTag } from '@/types';

interface CourseCardProps {
  course: UdemyCourse;
}

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="relative h-40 w-full">
        <Image 
          src={course.imageUrl || '/placeholder.jpg'} 
          alt={course.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
        />
      </div>
      <CardContent className="p-4">
        <Link href={`/course/${course.id}`} className="block">
          <h3 className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2">
            {course.title}
          </h3>
        </Link>
        <p className="text-muted-foreground text-sm mt-1">{course.instructor}</p>
        <div className="flex items-center mt-2">
          <StarIcon className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="ml-1">{course.rating.toFixed(1)}</span>
          <span className="text-muted-foreground text-sm ml-2">({course.studentsCount}人)</span>
        </div>
        <div className="mt-3 flex justify-between items-center">
          <span className="font-bold text-lg">¥{course.currentPrice.toLocaleString()}</span>
          {course.currentPrice < course.price && (
            <span className="text-red-500 text-sm line-through">¥{course.price.toLocaleString()}</span>
          )}
        </div>
      </CardContent>
      <CardFooter className="px-4 py-3 pt-0">
        <div className="flex flex-wrap gap-1">
          {course.tags.slice(0, 3).map(tag => (
            <Link 
              key={tag.id} 
              href={`/tag/${tag.tag}`}
            >
              <Badge variant="outline" className="hover:bg-secondary/50">
                {tag.tag}
              </Badge>
            </Link>
          ))}
          {course.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">+{course.tags.length - 3}</span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
} 
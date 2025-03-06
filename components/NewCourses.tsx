import { getClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CourseCard from './CourseCard';
import { UdemyCourse } from '@/types';

const GET_NEW_COURSES = gql`
  query GetNewCourses($limit: Int) {
    newCourses(limit: $limit) {
      id
      title
      imageUrl
      instructor
      rating
      studentsCount
      price
      currentPrice
      tags {
        id
        tag
      }
      createdAt
    }
  }
`;

interface NewCoursesProps {
  limit?: number;
}

export default async function NewCourses({ limit = 10 }: NewCoursesProps) {
  const { data } = await getClient().query({
    query: GET_NEW_COURSES,
    variables: { limit },
  });

  if (!data?.newCourses) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-2/5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.newCourses.map((course: UdemyCourse) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
} 
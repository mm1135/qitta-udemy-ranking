import { getClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import CourseCard from './CourseCard';
import { UdemyCourse } from '@/types';

const GET_TRENDING_COURSES = gql`
  query GetTrendingCourses($limit: Int) {
    trendingCourses(limit: $limit) {
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
    }
  }
`;

interface TrendingCoursesProps {
  limit?: number;
}

export default async function TrendingCourses({ limit = 10 }: TrendingCoursesProps) {
  const { data } = await getClient().query({
    query: GET_TRENDING_COURSES,
    variables: { limit },
  });

  return (
    <div className="space-y-4">
      {data?.trendingCourses.map((course: UdemyCourse) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
} 
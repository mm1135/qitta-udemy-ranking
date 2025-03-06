import { getClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import PriceHistoryChart from '@/components/PriceHistoryChart';
import CourseStats from '@/components/CourseStats';
import MentionsList from '@/components/MentionsList';
import { CourseTag } from '@/types';

const GET_COURSE_DETAILS = gql`
  query GetCourseDetails($id: ID!) {
    courseDetails(id: $id) {
      id
      title
      url
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
      mentions {
        id
        article {
          id
          title
          url
          author
          likes
          publishedAt
        }
      }
      priceHistory {
        id
        price
        date
      }
    }
  }
`;

export default async function CourseDetailsPage({ params }: { params: { id: string } }) {
  const { data } = await getClient().query({
    query: GET_COURSE_DETAILS,
    variables: { id: params.id },
  });

  if (!data?.courseDetails) {
    notFound();
  }

  const course = data.courseDetails;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/3">
            <div className="relative h-60 w-full mb-4">
              <Image 
                src={course.imageUrl || '/placeholder.jpg'} 
                alt={course.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover rounded"
                priority
              />
            </div>
          </div>

          <div className="md:w-2/3">
            <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
            <p className="mb-2"><span className="font-medium">講師:</span> {course.instructor}</p>
            <div className="flex items-center mb-2">
              <span className="font-medium mr-2">評価:</span>
              <span className="text-yellow-500">★</span>
              <span className="ml-1">{course.rating.toFixed(1)}</span>
              <span className="text-gray-400 text-sm ml-2">({course.studentsCount} 受講者)</span>
            </div>
            <p className="mb-4">
              <span className="font-medium">価格:</span> 
              <span className="text-lg font-bold ml-2">¥{course.currentPrice.toLocaleString()}</span>
              {course.currentPrice < course.price && (
                <span className="text-red-500 text-sm ml-2 line-through">¥{course.price.toLocaleString()}</span>
              )}
            </p>
            <a 
              href={course.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Udemyで見る
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          <div className="md:col-span-2">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">価格推移</h2>
              <div className="h-64 bg-white p-4 rounded border">
                <PriceHistoryChart priceHistory={course.priceHistory} />
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">Qiitaでの言及</h2>
              <MentionsList mentions={course.mentions} />
            </div>
          </div>
          
          <div>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h2 className="text-xl font-semibold mb-3">統計情報</h2>
              <CourseStats course={course} />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3">関連タグ</h2>
              <div className="flex flex-wrap gap-2">
                {course.tags.map((tag: CourseTag) => (
                  <Link
                    key={tag.id}
                    href={`/tag/${tag.tag}`}
                    className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full text-sm transition-colors"
                  >
                    {tag.tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
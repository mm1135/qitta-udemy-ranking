import { getClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

const GET_POPULAR_TAGS = gql`
  query GetPopularTags($limit: Int) {
    popularTags(limit: $limit)
  }
`;

interface PopularTagsProps {
  limit?: number;
}

export default async function PopularTags({ limit = 30 }: PopularTagsProps) {
  const { data } = await getClient().query({
    query: GET_POPULAR_TAGS,
    variables: { limit },
  });

  return (
    <div className="flex flex-wrap gap-2">
      {data?.popularTags.map((tag: string) => (
        <Link key={tag} href={`/tag/${tag}`}>
          <Badge variant="secondary" className="px-3 py-1 cursor-pointer hover:bg-secondary/80">
            {tag}
          </Badge>
        </Link>
      ))}
    </div>
  );
} 
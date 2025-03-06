import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { gql } from 'graphql-tag';
import prisma from '@/lib/prisma';
import { UdemyCourse } from '@/types';

const typeDefs = gql`
  type UdemyCourse {
    id: ID!
    title: String!
    url: String!
    imageUrl: String
    instructor: String!
    price: Float!
    currentPrice: Float!
    rating: Float!
    studentsCount: Int!
    mentions: [CourseMention!]!
    tags: [CourseTag!]!
    priceHistory: [PriceHistory!]!
    createdAt: String!
    updatedAt: String!
  }

  type QiitaArticle {
    id: ID!
    title: String!
    url: String!
    author: String!
    likes: Int!
    views: Int!
    tags: [String!]!
    publishedAt: String!
    mentions: [CourseMention!]!
  }

  type CourseMention {
    id: ID!
    course: UdemyCourse!
    article: QiitaArticle!
    createdAt: String!
  }

  type CourseTag {
    id: ID!
    course: UdemyCourse!
    tag: String!
  }

  type PriceHistory {
    id: ID!
    course: UdemyCourse!
    price: Float!
    date: String!
  }

  type Query {
    trendingCourses(limit: Int): [UdemyCourse!]!
    newCourses(limit: Int): [UdemyCourse!]!
    coursesByTag(tag: String!, limit: Int): [UdemyCourse!]!
    courseDetails(id: ID!): UdemyCourse
    compareCourses(ids: [ID!]!): [UdemyCourse!]!
    popularTags(limit: Int): [String!]!
  }
`;

const resolvers = {
  Query: {
    trendingCourses: async (_: any, { limit = 10 }: { limit?: number }) => {
      try {
        return await prisma.udemyCourse.findMany({
          take: limit,
          orderBy: {
            mentions: {
              _count: 'desc',
            },
          },
          include: {
            mentions: true,
            tags: true,
            priceHistory: true,
          },
        });
      } catch (error) {
        console.error('Error fetching trending courses:', error);
        return []; // 空配列を返す
      }
    },
    
    newCourses: async (_: any, { limit = 10 }: { limit?: number }) => {
      try {
        return await prisma.udemyCourse.findMany({
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            mentions: true,
            tags: true,
            priceHistory: true,
          },
        });
      } catch (error) {
        console.error('Error fetching new courses:', error);
        return []; // 空配列を返す
      }
    },
    
    popularTags: async (_: any, { limit = 30 }: { limit?: number }) => {
      try {
        const tags = await prisma.courseTag.groupBy({
          by: ['tag'],
          _count: {
            tag: true,
          },
          orderBy: {
            _count: {
              tag: 'desc',
            },
          },
          take: limit,
        });
        
        return tags.map(item => item.tag);
      } catch (error) {
        console.error('Error fetching popular tags:', error);
        return []; // 空配列を返す
      }
    },
    
    // 他のリゾルバも同様に実装
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const handler = startServerAndCreateNextHandler(server);

export { handler as GET, handler as POST }; 
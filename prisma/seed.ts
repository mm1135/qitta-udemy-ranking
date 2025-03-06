import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // サンプルコース
  const course1 = await prisma.udemyCourse.upsert({
    where: { id: 'course-1' },
    update: {},
    create: {
      id: 'course-1',
      title: 'モダンJavaScript入門',
      url: 'https://www.udemy.com/course/modern-javascript-from-beginning/',
      imageUrl: 'https://img-c.udemycdn.com/course/240x135/1234567_1234_1.jpg',
      instructor: '山田太郎',
      price: 16000,
      currentPrice: 3200,
      rating: 4.7,
      studentsCount: 1500,
      tags: {
        create: [
          { tag: 'JavaScript' },
          { tag: 'Web開発' },
          { tag: 'フロントエンド' }
        ]
      },
      priceHistory: {
        create: [
          { price: 16000, date: new Date('2023-01-01') },
          { price: 3200, date: new Date('2023-01-15') },
          { price: 9800, date: new Date('2023-02-01') }
        ]
      }
    }
  });

  // 他のサンプルデータも追加...

  console.log('Seed data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
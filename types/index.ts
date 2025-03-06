export interface UdemyCourse {
  id: string;
  title: string;
  url: string;
  imageUrl?: string;
  instructor: string;
  price: number;
  currentPrice: number;
  rating: number;
  studentsCount: number;
  mentions: CourseMention[];
  tags: CourseTag[];
  priceHistory: PriceHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface QiitaArticle {
  id: string;
  title: string;
  url: string;
  author: string;
  likes: number;
  views: number;
  tags: string[];
  publishedAt: string;
  mentions: CourseMention[];
}

export interface CourseMention {
  id: string;
  course: UdemyCourse;
  article: QiitaArticle;
  createdAt: string;
}

export interface CourseTag {
  id: string;
  tag: string;
}

export interface PriceHistory {
  id: string;
  price: number;
  date: string;
} 
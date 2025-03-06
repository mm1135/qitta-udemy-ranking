/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'img-c.udemycdn.com',  // Udemyの画像ドメイン
      'qiita-image-store.s3.amazonaws.com',  // Qiitaの画像ドメイン
    ],
  },
};

module.exports = nextConfig; 
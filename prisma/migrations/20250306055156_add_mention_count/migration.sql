-- AlterTable
ALTER TABLE "QiitaArticle" ALTER COLUMN "views" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "UdemyCourse" ADD COLUMN     "mentionCount" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "_QiitaArticleToUdemyCourse" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_QiitaArticleToUdemyCourse_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_QiitaArticleToUdemyCourse_B_index" ON "_QiitaArticleToUdemyCourse"("B");

-- AddForeignKey
ALTER TABLE "_QiitaArticleToUdemyCourse" ADD CONSTRAINT "_QiitaArticleToUdemyCourse_A_fkey" FOREIGN KEY ("A") REFERENCES "QiitaArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QiitaArticleToUdemyCourse" ADD CONSTRAINT "_QiitaArticleToUdemyCourse_B_fkey" FOREIGN KEY ("B") REFERENCES "UdemyCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

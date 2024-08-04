/*
  Warnings:

  - You are about to drop the column `password` on the `userInfo` table. All the data in the column will be lost.
  - Added the required column `password_hash` to the `userInfo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salt` to the `userInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "userInfo" DROP COLUMN "password",
ADD COLUMN     "password_hash" VARCHAR(128) NOT NULL,
ADD COLUMN     "salt" VARCHAR(32) NOT NULL;

-- CreateTable
CREATE TABLE "refresh_token" (
    "userId" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refresh_token" TEXT NOT NULL,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_relation_1" FOREIGN KEY ("userId") REFERENCES "userInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

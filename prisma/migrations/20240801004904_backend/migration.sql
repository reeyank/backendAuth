-- CreateTable
CREATE TABLE "userInfo" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email_address" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "userInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "userInfo_index_2" ON "userInfo"("email_address");

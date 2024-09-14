-- CreateTable
CREATE TABLE "email_verification" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" VARCHAR(255) NOT NULL,
    "expireTimestamp" TIMESTAMP(6) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "email_verification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "email_verification" ADD CONSTRAINT "email_verification_relation_1" FOREIGN KEY ("id") REFERENCES "userInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "login_method" AS ENUM ('PASSWORD', 'FIREBASE');

-- AlterTable
ALTER TABLE "user" ADD COLUMN "last_login_at" TIMESTAMP(3),
ADD COLUMN "last_seen_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "login_event" (
    "login_event_id" SERIAL NOT NULL,
    "method" "login_method" NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_event_pkey" PRIMARY KEY ("login_event_id")
);

-- CreateIndex
CREATE INDEX "login_event_user_id_created_at_idx" ON "login_event"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "login_event" ADD CONSTRAINT "login_event_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

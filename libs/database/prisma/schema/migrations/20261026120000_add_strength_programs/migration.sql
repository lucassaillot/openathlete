
-- AlterTable
ALTER TABLE "event" ADD COLUMN     "strength_session_id" INTEGER;

-- AlterTable
ALTER TABLE "event_training" ADD COLUMN     "strength_content" JSONB;

-- CreateTable
CREATE TABLE "strength_category" (
    "strength_category_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "user_id" INTEGER NOT NULL,
    "parent_category_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strength_category_pkey" PRIMARY KEY ("strength_category_id")
);

-- CreateTable
CREATE TABLE "strength_program" (
    "strength_program_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strength_program_pkey" PRIMARY KEY ("strength_program_id")
);

-- CreateTable
CREATE TABLE "strength_program_session" (
    "strength_program_session_id" SERIAL NOT NULL,
    "week_number" INTEGER NOT NULL,
    "session_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "duration" INTEGER,
    "content" JSONB NOT NULL,
    "program_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strength_program_session_pkey" PRIMARY KEY ("strength_program_session_id")
);

-- CreateTable
CREATE TABLE "strength_exercise" (
    "strength_exercise_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "default_notes" TEXT NOT NULL DEFAULT '',
    "media_url" TEXT,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strength_exercise_pkey" PRIMARY KEY ("strength_exercise_id")
);

-- CreateIndex
CREATE INDEX "strength_category_user_id_idx" ON "strength_category"("user_id");

-- CreateIndex
CREATE INDEX "strength_program_user_id_idx" ON "strength_program"("user_id");

-- CreateIndex
CREATE INDEX "strength_program_category_id_idx" ON "strength_program"("category_id");

-- CreateIndex
CREATE INDEX "strength_program_session_program_id_week_number_session_num_idx" ON "strength_program_session"("program_id", "week_number", "session_number");

-- CreateIndex
CREATE UNIQUE INDEX "strength_exercise_user_id_name_key" ON "strength_exercise"("user_id", "name");

-- CreateIndex
CREATE INDEX "event_strength_session_id_idx" ON "event"("strength_session_id");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_strength_session_id_fkey" FOREIGN KEY ("strength_session_id") REFERENCES "strength_program_session"("strength_program_session_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strength_category" ADD CONSTRAINT "strength_category_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strength_category" ADD CONSTRAINT "strength_category_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "strength_category"("strength_category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strength_program" ADD CONSTRAINT "strength_program_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strength_program" ADD CONSTRAINT "strength_program_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "strength_category"("strength_category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strength_program_session" ADD CONSTRAINT "strength_program_session_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "strength_program"("strength_program_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strength_exercise" ADD CONSTRAINT "strength_exercise_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;


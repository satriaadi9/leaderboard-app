-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'STUDENT_ASSISTANT';

-- CreateTable
CREATE TABLE "_ClassAssistants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ClassAssistants_AB_unique" ON "_ClassAssistants"("A", "B");

-- CreateIndex
CREATE INDEX "_ClassAssistants_B_index" ON "_ClassAssistants"("B");

-- AddForeignKey
ALTER TABLE "_ClassAssistants" ADD CONSTRAINT "_ClassAssistants_A_fkey" FOREIGN KEY ("A") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassAssistants" ADD CONSTRAINT "_ClassAssistants_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

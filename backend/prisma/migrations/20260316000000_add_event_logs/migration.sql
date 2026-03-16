-- CreateTable
CREATE TABLE "event_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

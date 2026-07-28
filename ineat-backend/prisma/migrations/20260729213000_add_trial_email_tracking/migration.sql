ALTER TABLE "User"
ADD COLUMN "trialStartedEmailSentAt" TIMESTAMP(3),
ADD COLUMN "trialReminderEmailSentAt" TIMESTAMP(3),
ADD COLUMN "trialExpiredEmailSentAt" TIMESTAMP(3);

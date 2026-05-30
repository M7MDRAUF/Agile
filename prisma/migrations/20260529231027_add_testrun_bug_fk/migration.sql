-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TestRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testCaseId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "runById" TEXT,
    "bugId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestRun_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestRun_runById_fkey" FOREIGN KEY ("runById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TestRun_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "WorkItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TestRun" ("bugId", "createdAt", "id", "notes", "runById", "status", "testCaseId") SELECT "bugId", "createdAt", "id", "notes", "runById", "status", "testCaseId" FROM "TestRun";
DROP TABLE "TestRun";
ALTER TABLE "new_TestRun" RENAME TO "TestRun";
CREATE INDEX "TestRun_bugId_idx" ON "TestRun"("bugId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

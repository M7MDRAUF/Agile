-- CreateIndex
CREATE INDEX "Blocker_workItemId_status_idx" ON "Blocker"("workItemId", "status");

-- CreateIndex
CREATE INDEX "ProjectRisk_projectId_status_idx" ON "ProjectRisk"("projectId", "status");

-- CreateIndex
CREATE INDEX "Sprint_projectId_status_idx" ON "Sprint"("projectId", "status");

-- CreateIndex
CREATE INDEX "TestCase_projectId_status_idx" ON "TestCase"("projectId", "status");

-- CreateIndex
CREATE INDEX "TestCase_workItemId_idx" ON "TestCase"("workItemId");

-- CreateIndex
CREATE INDEX "TestRun_testCaseId_createdAt_idx" ON "TestRun"("testCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkItem_dueDate_idx" ON "WorkItem"("dueDate");

-- CreateIndex
CREATE INDEX "WorkItem_projectId_type_idx" ON "WorkItem"("projectId", "type");

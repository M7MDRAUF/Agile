import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

// ----------------------------------------------------------------------------
// Deterministic pseudo-random helpers so reseeding produces stable demo data.
// ----------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260529);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const pickWeighted = <T>(entries: [T, number][]): T => {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of entries) {
    if ((r -= w) <= 0) return v;
  }
  return entries[entries.length - 1][0];
};
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);

async function main() {
  console.log("🌱 Seeding AgileForge (NovaCore Software Inc.)…");

  // -- Reset (order respects FK constraints) --------------------------------
  await prisma.testRun.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.workItemLabel.deleteMany();
  await prisma.label.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.blocker.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.epic.deleteMany();
  await prisma.projectRisk.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const password = process.env.SEED_PASSWORD ?? "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);

  // -- Users ----------------------------------------------------------------
  const colors = [
    "#6366f1",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
  ];
  let colorIdx = 0;
  const nextColor = () => colors[colorIdx++ % colors.length];

  const userSpecs: { name: string; email: string; role: string; title: string }[] = [
    {
      name: "Alex Morgan",
      email: "admin@novacore.dev",
      role: "admin",
      title: "Platform Administrator",
    },
    {
      name: "Priya Sharma",
      email: "em@novacore.dev",
      role: "engineering_manager",
      title: "Engineering Manager, Platform",
    },
    {
      name: "Daniel Okoye",
      email: "em2@novacore.dev",
      role: "engineering_manager",
      title: "Engineering Manager, Web",
    },
    {
      name: "Sofia Reyes",
      email: "po@novacore.dev",
      role: "product_owner",
      title: "Senior Product Owner",
    },
    {
      name: "Marcus Lee",
      email: "po2@novacore.dev",
      role: "product_owner",
      title: "Product Owner",
    },
    {
      name: "Hannah Bergström",
      email: "sm@novacore.dev",
      role: "scrum_master",
      title: "Scrum Master",
    },
    {
      name: "Tomás Alvarez",
      email: "sm2@novacore.dev",
      role: "scrum_master",
      title: "Scrum Master",
    },
    {
      name: "Jordan Patel",
      email: "engineer@novacore.dev",
      role: "engineer",
      title: "Senior Software Engineer",
    },
    { name: "Wei Chen", email: "eng2@novacore.dev", role: "engineer", title: "Software Engineer" },
    {
      name: "Olivia Brooks",
      email: "eng3@novacore.dev",
      role: "engineer",
      title: "Software Engineer",
    },
    {
      name: "Ahmed Hassan",
      email: "eng4@novacore.dev",
      role: "engineer",
      title: "Senior Software Engineer",
    },
    {
      name: "Nina Kowalski",
      email: "eng5@novacore.dev",
      role: "engineer",
      title: "Software Engineer",
    },
    {
      name: "Diego Santos",
      email: "eng6@novacore.dev",
      role: "engineer",
      title: "Backend Engineer",
    },
    {
      name: "Yuki Tanaka",
      email: "eng7@novacore.dev",
      role: "engineer",
      title: "Frontend Engineer",
    },
    {
      name: "Grace Mwangi",
      email: "eng8@novacore.dev",
      role: "engineer",
      title: "Mobile Engineer",
    },
    { name: "Liam O'Connor", email: "eng9@novacore.dev", role: "engineer", title: "Data Engineer" },
    { name: "Fatima Zahra", email: "qa@novacore.dev", role: "qa", title: "Senior QA Engineer" },
    { name: "Ben Carter", email: "qa2@novacore.dev", role: "qa", title: "QA Engineer" },
    { name: "Aisha Khan", email: "qa3@novacore.dev", role: "qa", title: "QA Automation Engineer" },
    {
      name: "Emma Dubois",
      email: "designer@novacore.dev",
      role: "designer",
      title: "Senior Product Designer",
    },
    {
      name: "Noah Fischer",
      email: "designer2@novacore.dev",
      role: "designer",
      title: "UX Designer",
    },
    {
      name: "Victoria Hughes",
      email: "stakeholder@novacore.dev",
      role: "stakeholder",
      title: "VP of Engineering",
    },
    {
      name: "Robert Klein",
      email: "exec2@novacore.dev",
      role: "stakeholder",
      title: "Chief Product Officer",
    },
    {
      name: "Sandra Nilsson",
      email: "exec3@novacore.dev",
      role: "stakeholder",
      title: "Director of Delivery",
    },
  ];

  const users: Awaited<ReturnType<typeof prisma.user.create>>[] = [];
  for (const spec of userSpecs) {
    users.push(
      await prisma.user.create({
        data: { ...spec, passwordHash, avatarColor: nextColor(), status: "active" },
      }),
    );
  }
  const byRole = (role: string) => users.filter((u) => u.role === role);
  const engineers = byRole("engineer");
  const designers = byRole("designer");
  const qaEngineers = byRole("qa");
  const productOwners = byRole("product_owner");
  const managers = byRole("engineering_manager");
  const scrumMasters = byRole("scrum_master");
  console.log(`  • ${users.length} users`);

  // -- Teams ----------------------------------------------------------------
  const teamSpecs = [
    {
      key: "PLAT",
      name: "Platform Engineering",
      description: "Core platform, infrastructure and developer tooling.",
    },
    {
      key: "WEB",
      name: "Web Experience",
      description: "Customer-facing web applications and portals.",
    },
    { key: "MOB", name: "Mobile Apps", description: "iOS and Android native experiences." },
    { key: "DATA", name: "Data & AI", description: "Data pipelines, analytics and AI features." },
    { key: "QAA", name: "QA Automation", description: "Quality engineering and test automation." },
    {
      key: "DSGN",
      name: "Product Design",
      description: "UX research, interaction and visual design.",
    },
  ];
  const teams: Awaited<ReturnType<typeof prisma.team.create>>[] = [];
  for (const t of teamSpecs) teams.push(await prisma.team.create({ data: t }));

  // Distribute users across teams (everyone in at least one team).
  const teamAssignments: Record<string, string[]> = {
    PLAT: [
      "em@novacore.dev",
      "engineer@novacore.dev",
      "eng2@novacore.dev",
      "eng6@novacore.dev",
      "sm@novacore.dev",
    ],
    WEB: [
      "em2@novacore.dev",
      "eng3@novacore.dev",
      "eng7@novacore.dev",
      "sm2@novacore.dev",
      "po@novacore.dev",
    ],
    MOB: ["eng8@novacore.dev", "eng4@novacore.dev", "designer2@novacore.dev"],
    DATA: ["eng9@novacore.dev", "eng5@novacore.dev", "po2@novacore.dev"],
    QAA: ["qa@novacore.dev", "qa2@novacore.dev", "qa3@novacore.dev"],
    DSGN: ["designer@novacore.dev", "designer2@novacore.dev"],
  };
  for (const team of teams) {
    const emails = teamAssignments[team.key] ?? [];
    for (const email of emails) {
      const user = users.find((u) => u.email === email);
      if (user) {
        await prisma.teamMember.upsert({
          where: { teamId_userId: { teamId: team.id, userId: user.id } },
          create: { teamId: team.id, userId: user.id, roleName: user.title },
          update: {},
        });
      }
    }
  }
  console.log(`  • ${teams.length} teams`);

  // -- Labels ---------------------------------------------------------------
  const labelSpecs = [
    ["frontend", "#0ea5e9"],
    ["backend", "#6366f1"],
    ["infra", "#64748b"],
    ["security", "#ef4444"],
    ["performance", "#f59e0b"],
    ["ux", "#ec4899"],
    ["tech-debt", "#8b5cf6"],
    ["accessibility", "#10b981"],
    ["api", "#14b8a6"],
    ["mobile", "#f97316"],
  ];
  const labels: Awaited<ReturnType<typeof prisma.label.create>>[] = [];
  for (const [name, color] of labelSpecs)
    labels.push(await prisma.label.create({ data: { name, color } }));

  // -- Projects -------------------------------------------------------------
  const projectSpecs = [
    {
      key: "CPM",
      name: "Customer Portal Modernization",
      team: "WEB",
      desc: "Rebuild the customer self-service portal with a modern, accessible UI and a unified design system.",
    },
    {
      key: "IDP",
      name: "Internal Developer Platform",
      team: "PLAT",
      desc: "Golden paths, self-service infrastructure and CI/CD for all engineering teams.",
    },
    {
      key: "AISA",
      name: "AI Support Assistant",
      team: "DATA",
      desc: "An AI assistant that triages and resolves customer support tickets.",
    },
    {
      key: "MAR",
      name: "Mobile App Redesign",
      team: "MOB",
      desc: "Refresh the mobile experience with offline support and a new navigation model.",
    },
    {
      key: "BRP",
      name: "Billing Reliability Program",
      team: "PLAT",
      desc: "Eliminate billing defects and improve invoicing reliability to 99.99%.",
    },
    {
      key: "AID",
      name: "Analytics Insights Dashboard",
      team: "DATA",
      desc: "Self-serve analytics dashboards for product and revenue insights.",
    },
  ];
  const projects: Awaited<ReturnType<typeof prisma.project.create>>[] = [];
  for (let i = 0; i < projectSpecs.length; i++) {
    const p = projectSpecs[i];
    const team = teams.find((t) => t.key === p.team)!;
    projects.push(
      await prisma.project.create({
        data: {
          key: p.key,
          name: p.name,
          description: p.desc,
          status: i === 5 ? "on_hold" : "active",
          health: pickWeighted([
            ["on_track", 3],
            ["at_risk", 2],
            ["off_track", 1],
          ]),
          ownerId: pick(productOwners).id,
          teamId: team.id,
          startDate: daysAgo(120 - i * 10),
          targetDate: daysFromNow(60 + i * 15),
        },
      }),
    );
  }
  console.log(`  • ${projects.length} projects`);

  // -- Project risks --------------------------------------------------------
  const riskTitles = [
    "Third-party API rate limits may throttle launch traffic",
    "Key engineer on extended leave during integration phase",
    "Legacy data migration scope still uncertain",
    "Security review pending for payment flows",
    "Mobile release blocked on App Store review timelines",
  ];
  for (const project of projects) {
    const count = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i++) {
      await prisma.projectRisk.create({
        data: {
          projectId: project.id,
          title: pick(riskTitles),
          severity: pickWeighted([
            ["low", 1],
            ["medium", 2],
            ["high", 1],
          ]),
          status: pickWeighted([
            ["open", 3],
            ["mitigated", 2],
            ["closed", 1],
          ]),
        },
      });
    }
  }

  // -- Epics ----------------------------------------------------------------
  const epicTitlesByProject: Record<string, string[]> = {
    CPM: ["Account & Profile Experience", "Self-Service Billing"],
    IDP: ["Golden Path Templates", "Observability Foundations"],
    AISA: ["Ticket Triage Engine", "Knowledge Retrieval"],
    MAR: ["Offline-First Architecture", "New Navigation System"],
    BRP: ["Invoice Accuracy", "Payment Resilience"],
    AID: ["Revenue Dashboards", "Product Usage Insights"],
  };
  const epics: Awaited<ReturnType<typeof prisma.epic.create>>[] = [];
  for (const project of projects) {
    const titles = epicTitlesByProject[project.key];
    for (let i = 0; i < titles.length; i++) {
      epics.push(
        await prisma.epic.create({
          data: {
            key: `${project.key}-E${i + 1}`,
            title: titles[i],
            description: `Epic covering ${titles[i].toLowerCase()} for ${project.name}.`,
            projectId: project.id,
            status: pickWeighted([
              ["backlog", 1],
              ["in_progress", 3],
              ["done", 1],
            ]),
            color: pick(colors),
          },
        }),
      );
    }
  }
  console.log(`  • ${epics.length} epics`);

  // -- Sprints --------------------------------------------------------------
  // CPM gets a full history (4 completed, 1 active, 2 planned); every other
  // project gets 1 completed, 1 active and 1 planned sprint.
  type SprintRec = Awaited<ReturnType<typeof prisma.sprint.create>>;
  const sprintsByProject: Record<
    string,
    { completed: SprintRec[]; active?: SprintRec; planned: SprintRec[] }
  > = {};
  for (const project of projects) {
    const isFlagship = project.key === "CPM";
    const completedCount = isFlagship ? 4 : 1;
    const plannedCount = isFlagship ? 2 : 1;
    const rec: { completed: SprintRec[]; active?: SprintRec; planned: SprintRec[] } = {
      completed: [],
      planned: [],
    };
    let n = 1;
    for (let i = 0; i < completedCount; i++) {
      const start = daysAgo((completedCount - i) * 14 + 14);
      const end = daysAgo((completedCount - i) * 14);
      rec.completed.push(
        await prisma.sprint.create({
          data: {
            name: `${project.key} Sprint ${n++}`,
            goal: `Deliver committed scope for ${project.name}.`,
            projectId: project.id,
            status: "completed",
            startDate: start,
            endDate: end,
            completedAt: end,
            capacity: 30 + Math.floor(rand() * 20),
          },
        }),
      );
    }
    rec.active = await prisma.sprint.create({
      data: {
        name: `${project.key} Sprint ${n++}`,
        goal: `Advance ${project.name} toward the next release milestone.`,
        projectId: project.id,
        status: "active",
        startDate: daysAgo(5),
        endDate: daysFromNow(9),
        capacity: 40,
      },
    });
    for (let i = 0; i < plannedCount; i++) {
      rec.planned.push(
        await prisma.sprint.create({
          data: {
            name: `${project.key} Sprint ${n++}`,
            goal: `Planned scope for the upcoming iteration.`,
            projectId: project.id,
            status: "planned",
            startDate: daysFromNow(10 + i * 14),
            endDate: daysFromNow(24 + i * 14),
            capacity: 40,
          },
        }),
      );
    }
    sprintsByProject[project.key] = rec;
  }
  const totalSprints = Object.values(sprintsByProject).reduce(
    (s, r) => s + r.completed.length + (r.active ? 1 : 0) + r.planned.length,
    0,
  );
  console.log(`  • ${totalSprints} sprints`);

  // -- Work items -----------------------------------------------------------
  const storyTitles = [
    "As a user I can reset my password from the login screen",
    "Display real-time sprint progress on the dashboard",
    "Allow exporting reports to CSV",
    "Add two-factor authentication for admins",
    "Support dark mode across the application",
    "Paginate large work item lists for performance",
    "Provide inline validation on all forms",
    "Add keyboard shortcuts for board navigation",
    "Surface overdue work items with clear indicators",
    "Enable bulk status updates from the backlog",
    "Show velocity trend on the project reports page",
    "Allow attaching pull request links to tasks",
    "Notify assignees when work is reassigned",
    "Add a global search across projects and people",
    "Let users customize notification preferences",
  ];
  const taskTitles = [
    "Implement API endpoint",
    "Write integration tests",
    "Add database migration",
    "Refactor service layer",
    "Wire up frontend component",
    "Add loading and error states",
    "Improve query performance",
    "Add audit logging",
    "Update documentation",
    "Add feature flag",
    "Instrument metrics",
    "Handle edge-case validation",
    "Set up CI pipeline step",
    "Add accessibility attributes",
    "Optimize bundle size",
  ];
  const bugTitles = [
    "Login fails intermittently on slow connections",
    "Dashboard chart renders blank on first load",
    "Date picker shows wrong timezone",
    "Board card count incorrect after move",
    "CSV export omits the last row",
    "Notification badge not clearing on read",
    "Mobile layout overflows on small screens",
    "Search returns stale results after edit",
  ];

  const statusForActive = (): string =>
    pickWeighted([
      ["in_progress", 3],
      ["in_review", 2],
      ["qa", 1],
      ["ready", 2],
      ["blocked", 1],
      ["done", 2],
    ]);
  const allAssignees = [...engineers, ...qaEngineers, ...designers];

  let storyCount = 0,
    taskCount = 0,
    bugCount = 0,
    subtaskCount = 0;
  const counters: Record<string, number> = {};
  const nextKey = (projectKey: string) => {
    counters[projectKey] = (counters[projectKey] ?? 0) + 1;
    return `${projectKey}-${counters[projectKey]}`;
  };

  const createdWorkItems: { id: string; type: string; projectId: string; status: string }[] = [];

  for (const project of projects) {
    const projectEpics = epics.filter((e) => e.projectId === project.id);
    const sprintRec = sprintsByProject[project.key];
    const reporter = pick([...productOwners, ...managers]);

    // Stories — ~9 per project
    const projectStories: { id: string }[] = [];
    for (let s = 0; s < 9; s++) {
      const inActive = s < 4;
      const inCompleted = s >= 4 && s < 6 && sprintRec.completed.length > 0;
      const status = inActive
        ? statusForActive()
        : inCompleted
          ? "done"
          : pickWeighted([
              ["backlog", 3],
              ["ready", 1],
            ]);
      const sprintId = inActive
        ? sprintRec.active!.id
        : inCompleted
          ? pick(sprintRec.completed).id
          : null;
      const points = pick([1, 2, 3, 5, 8]);
      const assignee = pick(allAssignees);
      const item = await prisma.workItem.create({
        data: {
          key: nextKey(project.key),
          title: pick(storyTitles),
          description:
            "Detailed story description with context, scope and rationale for the change.",
          type: "story",
          status,
          priority: pickWeighted([
            ["low", 1],
            ["medium", 3],
            ["high", 2],
            ["critical", 1],
          ]),
          storyPoints: points,
          assigneeId: assignee.id,
          reporterId: reporter.id,
          projectId: project.id,
          epicId: pick(projectEpics).id,
          sprintId,
          acceptanceCriteria:
            "- Given the feature\n- When the user acts\n- Then the expected outcome occurs",
          dueDate:
            status === "done"
              ? daysAgo(Math.floor(rand() * 10))
              : daysFromNow(Math.floor(rand() * 20) - 5),
          completedAt: status === "done" ? daysAgo(Math.floor(rand() * 12)) : null,
          createdAt: daysAgo(20 + Math.floor(rand() * 60)),
          rank: s,
        },
      });
      storyCount++;
      projectStories.push(item);
      createdWorkItems.push({ id: item.id, type: "story", projectId: project.id, status });

      // Subtasks under some stories
      if (rand() < 0.5) {
        const subCount = 1 + Math.floor(rand() * 2);
        for (let st = 0; st < subCount; st++) {
          const subStatus = pickWeighted([
            ["backlog", 1],
            ["in_progress", 2],
            ["done", 2],
          ]);
          const sub = await prisma.workItem.create({
            data: {
              key: nextKey(project.key),
              title: `${pick(taskTitles)} (subtask)`,
              type: "subtask",
              status: subStatus,
              priority: "medium",
              storyPoints: pick([1, 2, 3]),
              assigneeId: pick(allAssignees).id,
              reporterId: reporter.id,
              projectId: project.id,
              parentId: item.id,
              epicId: item.epicId,
              sprintId: item.sprintId,
              completedAt: subStatus === "done" ? daysAgo(Math.floor(rand() * 10)) : null,
              createdAt: daysAgo(10 + Math.floor(rand() * 30)),
              rank: st,
            },
          });
          subtaskCount++;
          createdWorkItems.push({
            id: sub.id,
            type: "subtask",
            projectId: project.id,
            status: subStatus,
          });
        }
      }
    }

    // Tasks — ~12 per project
    for (let t = 0; t < 12; t++) {
      const inActive = t < 6;
      const status = inActive
        ? statusForActive()
        : pickWeighted([
            ["backlog", 3],
            ["ready", 1],
            ["done", 1],
          ]);
      const sprintId = inActive ? sprintRec.active!.id : null;
      const item = await prisma.workItem.create({
        data: {
          key: nextKey(project.key),
          title: `${pick(taskTitles)} for ${pick(epicTitlesByProject[project.key]).toLowerCase()}`,
          description: "Implementation task with clear technical scope.",
          type: "task",
          status,
          priority: pickWeighted([
            ["low", 2],
            ["medium", 3],
            ["high", 1],
          ]),
          storyPoints: pick([1, 2, 3, 5]),
          assigneeId: pick(engineers).id,
          reporterId: reporter.id,
          projectId: project.id,
          epicId: pick(projectEpics).id,
          sprintId,
          completedAt: status === "done" ? daysAgo(Math.floor(rand() * 10)) : null,
          createdAt: daysAgo(5 + Math.floor(rand() * 40)),
          rank: t,
        },
      });
      taskCount++;
      createdWorkItems.push({ id: item.id, type: "task", projectId: project.id, status });
    }

    // Bugs — ~4 per project
    for (let b = 0; b < 4; b++) {
      const status = pickWeighted([
        ["backlog", 1],
        ["in_progress", 2],
        ["qa", 1],
        ["done", 2],
      ]);
      const item = await prisma.workItem.create({
        data: {
          key: nextKey(project.key),
          title: pick(bugTitles),
          description: "Steps to reproduce, expected vs actual behaviour and severity assessment.",
          type: "bug",
          status,
          priority: pickWeighted([
            ["low", 1],
            ["medium", 2],
            ["high", 2],
            ["critical", 1],
          ]),
          storyPoints: pick([1, 2, 3]),
          assigneeId: pick(engineers).id,
          reporterId: pick(qaEngineers).id,
          projectId: project.id,
          sprintId: rand() < 0.5 ? sprintRec.active!.id : null,
          completedAt: status === "done" ? daysAgo(Math.floor(rand() * 8)) : null,
          createdAt: daysAgo(3 + Math.floor(rand() * 30)),
          rank: b,
        },
      });
      bugCount++;
      createdWorkItems.push({ id: item.id, type: "bug", projectId: project.id, status });
    }

    // Attach a few labels to stories
    for (const story of projectStories) {
      const labelCount = Math.floor(rand() * 3);
      const chosen = new Set<string>();
      for (let l = 0; l < labelCount; l++) chosen.add(pick(labels).id);
      for (const labelId of chosen) {
        await prisma.workItemLabel.upsert({
          where: { workItemId_labelId: { workItemId: story.id, labelId } },
          create: { workItemId: story.id, labelId },
          update: {},
        });
      }
    }
  }
  console.log(
    `  • ${storyCount} stories, ${taskCount} tasks, ${subtaskCount} subtasks, ${bugCount} bugs`,
  );

  // -- Blockers -------------------------------------------------------------
  const blockerReasons = [
    "Waiting on third-party API credentials",
    "Blocked by upstream service outage",
    "Pending security review sign-off",
    "Needs design clarification before implementation",
    "Dependency on another team's release",
    "Flaky integration test blocking merge",
  ];
  const blockableItems = createdWorkItems.filter((w) => w.status !== "done");
  let blockerCount = 0;
  for (let i = 0; i < 18 && i < blockableItems.length; i++) {
    const item = blockableItems[(i * 2) % blockableItems.length];
    const resolved = i % 3 === 0;
    await prisma.blocker.create({
      data: {
        workItemId: item.id,
        reason: pick(blockerReasons),
        ownerId: pick([...scrumMasters, ...managers]).id,
        status: resolved ? "resolved" : "open",
        createdAt: daysAgo(2 + Math.floor(rand() * 14)),
        resolvedAt: resolved ? daysAgo(Math.floor(rand() * 3)) : null,
      },
    });
    if (!resolved && item.status !== "blocked") {
      await prisma.workItem.update({ where: { id: item.id }, data: { status: "blocked" } });
    }
    blockerCount++;
  }
  console.log(`  • ${blockerCount} blockers`);

  // -- Comments & activity --------------------------------------------------
  const commentBodies = [
    "Picking this up now — should have a PR by EOD.",
    "Left a few review comments, mostly minor.",
    "This is blocked until the API contract is finalized.",
    "Verified in staging, looks good to me.",
    "Can we split this into smaller tasks?",
    "Updated the acceptance criteria after the refinement session.",
  ];
  let commentCount = 0,
    activityCount = 0;
  for (const item of createdWorkItems) {
    // creation activity for everyone
    await prisma.activityLog.create({
      data: {
        workItemId: item.id,
        actorId: pick(users).id,
        type: "created",
        message: "created this work item",
        createdAt: daysAgo(20 + Math.floor(rand() * 40)),
      },
    });
    activityCount++;
    if (rand() < 0.4) {
      await prisma.comment.create({
        data: {
          workItemId: item.id,
          authorId: pick(allAssignees).id,
          body: pick(commentBodies),
          createdAt: daysAgo(Math.floor(rand() * 12)),
        },
      });
      commentCount++;
      await prisma.activityLog.create({
        data: {
          workItemId: item.id,
          actorId: pick(users).id,
          type: "comment",
          message: "added a comment",
          createdAt: daysAgo(Math.floor(rand() * 12)),
        },
      });
      activityCount++;
    }
    if (rand() < 0.5) {
      await prisma.activityLog.create({
        data: {
          workItemId: item.id,
          actorId: pick(users).id,
          type: "status_change",
          message: "changed status",
          oldValue: "ready",
          newValue: item.status,
          createdAt: daysAgo(Math.floor(rand() * 10)),
        },
      });
      activityCount++;
    }
  }
  console.log(`  • ${commentCount} comments, ${activityCount} activity log entries`);

  // -- Test cases & runs ----------------------------------------------------
  const allStories = createdWorkItems.filter((w) => w.type === "story");
  const testTitles = [
    "Verify successful login with valid credentials",
    "Verify error message on invalid login",
    "Verify dashboard loads all widgets",
    "Verify work item can be created with required fields",
    "Verify board card moves persist after refresh",
    "Verify report charts render with data",
    "Verify notification marks as read",
    "Verify role restrictions on admin pages",
  ];
  let testCaseCount = 0,
    testRunCount = 0;
  for (const project of projects) {
    const projStories = allStories.filter((s) => s.projectId === project.id);
    for (let i = 0; i < 7; i++) {
      const status = pickWeighted([
        ["passed", 4],
        ["failed", 1],
        ["not_run", 2],
        ["blocked", 1],
      ]);
      const tc = await prisma.testCase.create({
        data: {
          key: `${project.key}-TC${i + 1}`,
          title: pick(testTitles),
          description: "Validates expected behaviour for a critical user flow.",
          steps: "1. Navigate to the page\n2. Perform the action\n3. Observe the result",
          expected: "The system behaves as specified without errors.",
          priority: pickWeighted([
            ["low", 1],
            ["medium", 3],
            ["high", 1],
          ]),
          status,
          projectId: project.id,
          workItemId: projStories.length ? pick(projStories).id : null,
          createdById: pick(qaEngineers).id,
        },
      });
      testCaseCount++;
      if (status !== "not_run") {
        await prisma.testRun.create({
          data: {
            testCaseId: tc.id,
            status,
            runById: pick(qaEngineers).id,
            notes:
              status === "failed"
                ? "Defect logged and linked to a bug."
                : "Executed as part of regression.",
          },
        });
        testRunCount++;
      }
    }
  }
  console.log(`  • ${testCaseCount} test cases, ${testRunCount} test runs`);

  // -- Notifications --------------------------------------------------------
  const notifTemplates: [string, string][] = [
    ["assignment", "You were assigned to a work item"],
    ["comment", "New comment on a work item you follow"],
    ["blocker", "A work item you own was marked as blocked"],
    ["sprint", "The active sprint was updated"],
    ["mention", "You were mentioned in a comment"],
    ["system", "Welcome to AgileForge"],
  ];
  let notifCount = 0;
  for (let i = 0; i < 36; i++) {
    const user = pick(users);
    const [type, message] = pick(notifTemplates);
    await prisma.notification.create({
      data: {
        userId: user.id,
        type,
        message,
        link: "/my-work",
        read: rand() < 0.4,
        createdAt: daysAgo(Math.floor(rand() * 14)),
      },
    });
    notifCount++;
  }
  console.log(`  • ${notifCount} notifications`);

  // -- Audit log ------------------------------------------------------------
  const admin = users.find((u) => u.role === "admin")!;
  for (let i = 0; i < 12; i++) {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: pick([
          "user.created",
          "role.changed",
          "project.created",
          "settings.updated",
          "user.deactivated",
        ]),
        entityType: pick(["User", "Project", "Workspace"]),
        detail: "Administrative action recorded for compliance.",
        createdAt: daysAgo(Math.floor(rand() * 30)),
      },
    });
  }

  // -- Workspace settings ---------------------------------------------------
  await prisma.appSetting.deleteMany();
  await prisma.appSetting.createMany({
    data: [
      { key: "workspace.name", value: "NovaCore Software Inc." },
      { key: "workspace.slug", value: "novacore" },
      {
        key: "workspace.description",
        value: "Agile delivery workspace for NovaCore's software engineering organization.",
      },
      { key: "workspace.sprintLengthDays", value: "14" },
      { key: "workspace.workingDays", value: "mon,tue,wed,thu,fri" },
      { key: "workspace.defaultTimezone", value: "UTC" },
      { key: "workspace.defaultPriority", value: "medium" },
      { key: "workspace.active", value: "true" },
    ],
  });
  console.log("  • workspace settings");

  // -- Integrations ---------------------------------------------------------
  await prisma.integration.deleteMany();
  await prisma.integration.createMany({
    data: [
      { key: "github", name: "GitHub", status: "not_connected" },
      { key: "slack", name: "Slack / Teams", status: "not_connected" },
      { key: "calendar", name: "Calendar", status: "not_connected" },
      { key: "figma", name: "Figma", status: "not_connected" },
    ],
  });
  console.log("  • integrations");

  console.log("✅ Seed complete.");
  console.log(`   Demo password for all accounts: ${password}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

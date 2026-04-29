import { eq, inArray } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/session";
import { ensureDevTestAccounts } from "@/lib/dev/test-accounts";
import { stripe } from "../payments/stripe";
import { writeAuditLog } from "./audit";
import { db } from "./drizzle";
import {
  ActivityType,
  AuditAction,
  activityLogs,
  automationRuns,
  candidates,
  clientContacts,
  clients,
  documents,
  invitations,
  jobs,
  jobStages,
  notes,
  submissions,
  tasks,
  teamMembers,
  teams,
  users,
} from "./schema";

const DEMO_PASSWORD = "admin123";
const DEMO_WORKSPACE_NAME = "Northstar Recruiting";
const DEMO_WORKSPACE_SLUG = "northstar-recruiting";

const DEMO_USERS = [
  {
    email: "test@test.com",
    name: "Avery Chen",
    role: "owner" as const,
  },
  {
    email: "recruiter@test.com",
    name: "Jordan Rivera",
    role: "recruiter" as const,
  },
  {
    email: "coordinator@test.com",
    name: "Priya Patel",
    role: "coordinator" as const,
  },
] as const;

const relativeDate = (dayOffset: number, hour: number, minute = 0) => {
  const value = new Date();
  value.setDate(value.getDate() + dayOffset);
  value.setHours(hour, minute, 0, 0);
  return value;
};

const createStripeProducts = async () => {
  console.log("Creating Stripe products and prices...");

  const baseProduct = await stripe.products.create({
    name: "Base",
    description: "Base subscription plan",
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800,
    currency: "usd",
    recurring: {
      interval: "month",
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: "Plus",
    description: "Plus subscription plan",
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200,
    currency: "usd",
    recurring: {
      interval: "month",
      trial_period_days: 7,
    },
  });

  console.log("Stripe products and prices created successfully.");
};

const cleanupDemoBaseline = async () => {
  const [existingWorkspace] = await db
    .select({
      id: teams.id,
    })
    .from(teams)
    .where(eq(teams.slug, DEMO_WORKSPACE_SLUG))
    .limit(1);

  if (existingWorkspace) {
    await db
      .delete(automationRuns)
      .where(eq(automationRuns.workspaceId, existingWorkspace.id));
    await db.delete(documents).where(eq(documents.workspaceId, existingWorkspace.id));
    await db.delete(notes).where(eq(notes.workspaceId, existingWorkspace.id));
    await db.delete(tasks).where(eq(tasks.workspaceId, existingWorkspace.id));
    await db
      .delete(submissions)
      .where(eq(submissions.workspaceId, existingWorkspace.id));
    await db.delete(jobStages).where(eq(jobStages.workspaceId, existingWorkspace.id));
    await db.delete(jobs).where(eq(jobs.workspaceId, existingWorkspace.id));
    await db
      .delete(clientContacts)
      .where(eq(clientContacts.workspaceId, existingWorkspace.id));
    await db
      .delete(candidates)
      .where(eq(candidates.workspaceId, existingWorkspace.id));
    await db.delete(clients).where(eq(clients.workspaceId, existingWorkspace.id));
    await db
      .delete(invitations)
      .where(eq(invitations.teamId, existingWorkspace.id));
    await db
      .delete(activityLogs)
      .where(eq(activityLogs.teamId, existingWorkspace.id));
    await db
      .delete(teamMembers)
      .where(eq(teamMembers.teamId, existingWorkspace.id));
    await db.delete(teams).where(eq(teams.id, existingWorkspace.id));
  }

  await db
    .delete(users)
    .where(inArray(users.email, DEMO_USERS.map((user) => user.email)));
};

const seed = async () => {
  await cleanupDemoBaseline();

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const createdUsers = await db
    .insert(users)
    .values(
      DEMO_USERS.map((user, index) => ({
        ...user,
        passwordHash,
        createdAt: relativeDate(-21 + index, 9),
        updatedAt: relativeDate(-2, 16 + index),
      })),
    )
    .returning();

  const owner = createdUsers.find((user) => user.email === "test@test.com");
  const recruiter = createdUsers.find(
    (user) => user.email === "recruiter@test.com",
  );
  const coordinator = createdUsers.find(
    (user) => user.email === "coordinator@test.com",
  );

  if (!owner || !recruiter || !coordinator) {
    throw new Error("Failed to create the demo users.");
  }

  const [workspace] = await db
    .insert(teams)
    .values({
      name: DEMO_WORKSPACE_NAME,
      slug: DEMO_WORKSPACE_SLUG,
      planName: "Base",
      subscriptionStatus: "trialing",
      createdAt: relativeDate(-21, 10),
      updatedAt: relativeDate(-1, 17),
    })
    .returning();

  const memberships = await db
    .insert(teamMembers)
    .values([
      {
        teamId: workspace.id,
        userId: owner.id,
        role: "owner",
        joinedAt: relativeDate(-21, 10, 30),
        createdAt: relativeDate(-21, 10, 30),
        updatedAt: relativeDate(-1, 16),
      },
      {
        teamId: workspace.id,
        userId: recruiter.id,
        invitedByUserId: owner.id,
        role: "recruiter",
        joinedAt: relativeDate(-19, 11, 15),
        createdAt: relativeDate(-19, 11, 15),
        updatedAt: relativeDate(-1, 11),
      },
      {
        teamId: workspace.id,
        userId: coordinator.id,
        invitedByUserId: owner.id,
        role: "coordinator",
        joinedAt: relativeDate(-17, 14, 0),
        createdAt: relativeDate(-17, 14, 0),
        updatedAt: relativeDate(-1, 10),
      },
    ])
    .returning();

  const ownerMembership = memberships.find((membership) => membership.userId === owner.id);
  const recruiterMembership = memberships.find(
    (membership) => membership.userId === recruiter.id,
  );
  const coordinatorMembership = memberships.find(
    (membership) => membership.userId === coordinator.id,
  );

  if (!ownerMembership || !recruiterMembership || !coordinatorMembership) {
    throw new Error("Failed to create the demo memberships.");
  }

  const createdClients = await db
    .insert(clients)
    .values([
      {
        workspaceId: workspace.id,
        name: "Lattice Labs",
        industry: "Developer tooling",
        website: "https://latticelabs.example",
        hqLocation: "San Francisco, CA",
        status: "active",
        priority: "high",
        ownerUserId: recruiter.id,
        lastContactedAt: relativeDate(-3, 15, 30),
        notesPreview:
          "Hiring manager wants a short list of backend-heavy IC candidates by next week.",
        createdByUserId: owner.id,
        createdAt: relativeDate(-14, 9),
        updatedAt: relativeDate(-3, 15, 30),
      },
      {
        workspaceId: workspace.id,
        name: "Harbor Health",
        industry: "Digital health",
        website: "https://harborhealth.example",
        hqLocation: "New York, NY",
        status: "prospect",
        priority: "medium",
        ownerUserId: owner.id,
        lastContactedAt: relativeDate(-5, 11, 0),
        notesPreview:
          "Prospect account is warming up around its first product design leadership search.",
        createdByUserId: owner.id,
        createdAt: relativeDate(-12, 10),
        updatedAt: relativeDate(-5, 11, 0),
      },
    ])
    .returning();

  const latticeLabs = createdClients.find((client) => client.name === "Lattice Labs");
  const harborHealth = createdClients.find(
    (client) => client.name === "Harbor Health",
  );

  if (!latticeLabs || !harborHealth) {
    throw new Error("Failed to create the demo clients.");
  }

  await db.insert(clientContacts).values([
    {
      workspaceId: workspace.id,
      clientId: latticeLabs.id,
      fullName: "Mia Thompson",
      title: "Head of Engineering",
      email: "mia@latticelabs.example",
      phone: "+1-415-555-0101",
      relationshipType: "hiring_manager",
      isPrimary: true,
      lastContactedAt: relativeDate(-3, 15, 30),
      createdAt: relativeDate(-14, 10),
      updatedAt: relativeDate(-3, 15, 30),
    },
    {
      workspaceId: workspace.id,
      clientId: harborHealth.id,
      fullName: "Rafael Gomez",
      title: "VP Product",
      email: "rafael@harborhealth.example",
      phone: "+1-212-555-0199",
      relationshipType: "executive_sponsor",
      isPrimary: true,
      lastContactedAt: relativeDate(-5, 11, 0),
      createdAt: relativeDate(-12, 11),
      updatedAt: relativeDate(-5, 11, 0),
    },
  ]);

  const createdJobs = await db
    .insert(jobs)
    .values([
      {
        workspaceId: workspace.id,
        clientId: latticeLabs.id,
        title: "Senior Full Stack Engineer",
        department: "Engineering",
        location: "Remote (US)",
        employmentType: "full-time",
        salaryMin: 175000,
        salaryMax: 210000,
        currency: "USD",
        ownerUserId: recruiter.id,
        status: "open",
        priority: "urgent",
        headcount: 2,
        placementFeePercent: 22,
        openedAt: relativeDate(-10, 9),
        targetFillDate: relativeDate(25, 17),
        description:
          "Hands-on full stack IC who can work across product surfaces and platform reliability.",
        intakeSummary:
          "The client wants backend depth, strong product sense, and evidence of mentoring staff engineers.",
        createdByUserId: owner.id,
        createdAt: relativeDate(-10, 9),
        updatedAt: relativeDate(-2, 16),
      },
      {
        workspaceId: workspace.id,
        clientId: harborHealth.id,
        title: "Founding Product Designer",
        department: "Product",
        location: "Hybrid - New York",
        employmentType: "full-time",
        salaryMin: 160000,
        salaryMax: 190000,
        currency: "USD",
        ownerUserId: owner.id,
        status: "intake",
        priority: "high",
        headcount: 1,
        placementFeePercent: 20,
        openedAt: relativeDate(-6, 10),
        targetFillDate: relativeDate(35, 17),
        description:
          "First in-house product designer who can build systems and partner closely with founders.",
        intakeSummary:
          "Intake is active and the client wants a design systems-heavy slate once the brief is finalized.",
        createdByUserId: owner.id,
        createdAt: relativeDate(-6, 10),
        updatedAt: relativeDate(-1, 13),
      },
    ])
    .returning();

  const fullStackJob = createdJobs.find(
    (job) => job.title === "Senior Full Stack Engineer",
  );
  const designerJob = createdJobs.find(
    (job) => job.title === "Founding Product Designer",
  );

  if (!fullStackJob || !designerJob) {
    throw new Error("Failed to create the demo jobs.");
  }

  await db.insert(jobStages).values([
    {
      workspaceId: workspace.id,
      jobId: fullStackJob.id,
      key: "sourced",
      label: "Sourced",
      sortOrder: 1,
      createdAt: relativeDate(-10, 9),
      updatedAt: relativeDate(-10, 9),
    },
    {
      workspaceId: workspace.id,
      jobId: fullStackJob.id,
      key: "screening",
      label: "Screening",
      sortOrder: 2,
      createdAt: relativeDate(-10, 9),
      updatedAt: relativeDate(-10, 9),
    },
    {
      workspaceId: workspace.id,
      jobId: fullStackJob.id,
      key: "submitted",
      label: "Submitted",
      sortOrder: 3,
      createdAt: relativeDate(-10, 9),
      updatedAt: relativeDate(-10, 9),
    },
    {
      workspaceId: workspace.id,
      jobId: fullStackJob.id,
      key: "client_interview",
      label: "Client Interview",
      sortOrder: 4,
      createdAt: relativeDate(-10, 9),
      updatedAt: relativeDate(-10, 9),
    },
    {
      workspaceId: workspace.id,
      jobId: fullStackJob.id,
      key: "offer",
      label: "Offer",
      sortOrder: 5,
      createdAt: relativeDate(-10, 9),
      updatedAt: relativeDate(-10, 9),
    },
    {
      workspaceId: workspace.id,
      jobId: designerJob.id,
      key: "sourced",
      label: "Sourced",
      sortOrder: 1,
      createdAt: relativeDate(-6, 10),
      updatedAt: relativeDate(-6, 10),
    },
    {
      workspaceId: workspace.id,
      jobId: designerJob.id,
      key: "screening",
      label: "Screening",
      sortOrder: 2,
      createdAt: relativeDate(-6, 10),
      updatedAt: relativeDate(-6, 10),
    },
    {
      workspaceId: workspace.id,
      jobId: designerJob.id,
      key: "submitted",
      label: "Submitted",
      sortOrder: 3,
      createdAt: relativeDate(-6, 10),
      updatedAt: relativeDate(-6, 10),
    },
  ]);

  const createdCandidates = await db
    .insert(candidates)
    .values([
      {
        workspaceId: workspace.id,
        fullName: "Nina Patel",
        email: "nina.patel@example.com",
        phone: "+1-646-555-0133",
        headline: "Senior full stack engineer focused on product infrastructure",
        currentCompany: "Orbit Cloud",
        currentTitle: "Senior Software Engineer",
        location: "Brooklyn, NY",
        salaryExpectation: "$195k base",
        noticePeriod: "2 weeks",
        source: "Referral",
        linkedinUrl: "https://linkedin.com/in/nina-patel-demo",
        portfolioUrl: "https://nina-patel.dev",
        skillsText: "TypeScript, React, Node.js, PostgreSQL, AWS",
        summary:
          "Strong in API design and mentoring. Good match for hands-on startup engineering roles.",
        ownerUserId: recruiter.id,
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-9, 11),
        updatedAt: relativeDate(-2, 17),
      },
      {
        workspaceId: workspace.id,
        fullName: "Marcus Lee",
        email: "marcus.lee@example.com",
        phone: "+1-415-555-0144",
        headline: "Platform-minded engineer with staff-level architecture depth",
        currentCompany: "Delta Forge",
        currentTitle: "Staff Engineer",
        location: "San Francisco, CA",
        salaryExpectation: "$220k base",
        noticePeriod: "4 weeks",
        source: "Outbound",
        linkedinUrl: "https://linkedin.com/in/marcus-lee-demo",
        skillsText: "Node.js, distributed systems, observability, hiring",
        summary:
          "Excellent backend depth with enough product exposure for fast-paced client environments.",
        ownerUserId: recruiter.id,
        createdByUserId: owner.id,
        createdAt: relativeDate(-8, 14),
        updatedAt: relativeDate(-1, 16),
      },
      {
        workspaceId: workspace.id,
        fullName: "Elena Garcia",
        email: "elena.garcia@example.com",
        phone: "+1-917-555-0188",
        headline: "Product designer building systems for regulated products",
        currentCompany: "CareNorth",
        currentTitle: "Lead Product Designer",
        location: "New York, NY",
        salaryExpectation: "$180k base",
        noticePeriod: "3 weeks",
        source: "Inbound",
        linkedinUrl: "https://linkedin.com/in/elena-garcia-demo",
        portfolioUrl: "https://elena.design",
        skillsText: "Figma, design systems, user research, healthcare UX",
        summary:
          "Good systems thinker with strong portfolio evidence across mobile and enterprise experiences.",
        ownerUserId: coordinator.id,
        createdByUserId: coordinator.id,
        createdAt: relativeDate(-7, 10),
        updatedAt: relativeDate(-1, 12),
      },
      {
        workspaceId: workspace.id,
        fullName: "Samir Shah",
        email: "samir.shah@example.com",
        phone: "+1-512-555-0107",
        headline: "Senior frontend engineer with design tooling experience",
        currentCompany: "Northwind",
        currentTitle: "Senior Frontend Engineer",
        location: "Austin, TX",
        salaryExpectation: "$185k base",
        noticePeriod: "2 weeks",
        source: "Referral",
        linkedinUrl: "https://linkedin.com/in/samir-shah-demo",
        skillsText: "React, TypeScript, accessibility, product collaboration",
        summary:
          "Useful crossover profile for frontend-heavy product roles and design system conversations.",
        ownerUserId: recruiter.id,
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-5, 15),
        updatedAt: relativeDate(-1, 10),
      },
    ])
    .returning();

  const nina = createdCandidates.find(
    (candidate) => candidate.fullName === "Nina Patel",
  );
  const marcus = createdCandidates.find(
    (candidate) => candidate.fullName === "Marcus Lee",
  );
  const elena = createdCandidates.find(
    (candidate) => candidate.fullName === "Elena Garcia",
  );

  if (!nina || !marcus || !elena) {
    throw new Error("Failed to create the demo candidates.");
  }

  const createdSubmissions = await db
    .insert(submissions)
    .values([
      {
        workspaceId: workspace.id,
        jobId: fullStackJob.id,
        candidateId: nina.id,
        ownerUserId: recruiter.id,
        stage: "submitted",
        riskFlag: "none",
        nextStep: "Prep candidate for client panel on Thursday.",
        submittedAt: relativeDate(-4, 10, 30),
        lastTouchAt: relativeDate(-1, 16, 0),
        latestFeedbackAt: relativeDate(-1, 17, 0),
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-4, 10, 30),
        updatedAt: relativeDate(-1, 17, 0),
      },
      {
        workspaceId: workspace.id,
        jobId: fullStackJob.id,
        candidateId: marcus.id,
        ownerUserId: recruiter.id,
        stage: "client_interview",
        riskFlag: "timing_risk",
        nextStep: "Confirm competing process timeline and keep warm with the client.",
        submittedAt: relativeDate(-6, 11, 0),
        lastTouchAt: relativeDate(-1, 9, 30),
        latestFeedbackAt: relativeDate(-1, 10, 0),
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-6, 11, 0),
        updatedAt: relativeDate(-1, 10, 0),
      },
      {
        workspaceId: workspace.id,
        jobId: designerJob.id,
        candidateId: elena.id,
        ownerUserId: coordinator.id,
        stage: "screening",
        riskFlag: "feedback_risk",
        nextStep: "Collect founder feedback on portfolio depth before formal submission.",
        submittedAt: relativeDate(-2, 14, 0),
        lastTouchAt: relativeDate(-1, 15, 0),
        latestFeedbackAt: relativeDate(-1, 15, 30),
        createdByUserId: coordinator.id,
        createdAt: relativeDate(-2, 14, 0),
        updatedAt: relativeDate(-1, 15, 30),
      },
    ])
    .returning();

  const ninaSubmission = createdSubmissions.find(
    (submission) => submission.candidateId === nina.id,
  );
  const marcusSubmission = createdSubmissions.find(
    (submission) => submission.candidateId === marcus.id,
  );
  const elenaSubmission = createdSubmissions.find(
    (submission) => submission.candidateId === elena.id,
  );

  if (!ninaSubmission || !marcusSubmission || !elenaSubmission) {
    throw new Error("Failed to create the demo submissions.");
  }

  await db.insert(tasks).values([
    {
      workspaceId: workspace.id,
      title: "Send panel prep to Nina Patel",
      description: "Share the latest interview brief and compensation context.",
      status: "open",
      dueAt: relativeDate(-1, 17, 30),
      assignedToUserId: recruiter.id,
      createdByUserId: owner.id,
      entityType: "submission",
      entityId: ninaSubmission.id,
      submissionId: ninaSubmission.id,
      createdAt: relativeDate(-2, 16, 0),
      updatedAt: relativeDate(-1, 9, 0),
    },
    {
      workspaceId: workspace.id,
      title: "Follow up with Lattice Labs after Marcus interview",
      description: "Get written interviewer notes and timeline signal.",
      status: "open",
      dueAt: relativeDate(1, 11, 0),
      assignedToUserId: owner.id,
      createdByUserId: recruiter.id,
      entityType: "submission",
      entityId: marcusSubmission.id,
      submissionId: marcusSubmission.id,
      createdAt: relativeDate(-1, 10, 0),
      updatedAt: relativeDate(-1, 10, 0),
    },
    {
      workspaceId: workspace.id,
      title: "Finalize Harbor Health intake brief",
      description: "Tighten success profile and must-have portfolio patterns.",
      status: "done",
      dueAt: relativeDate(-2, 15, 0),
      assignedToUserId: owner.id,
      createdByUserId: owner.id,
      entityType: "job",
      entityId: designerJob.id,
      completedAt: relativeDate(-2, 14, 30),
      createdAt: relativeDate(-4, 11, 0),
      updatedAt: relativeDate(-2, 14, 30),
    },
    {
      workspaceId: workspace.id,
      title: "Book Elena Garcia portfolio screen",
      description: "Coordinate founder availability and confirm candidate prep materials.",
      status: "snoozed",
      dueAt: relativeDate(2, 13, 0),
      snoozedUntil: relativeDate(1, 9, 0),
      assignedToUserId: coordinator.id,
      createdByUserId: coordinator.id,
      entityType: "submission",
      entityId: elenaSubmission.id,
      submissionId: elenaSubmission.id,
      createdAt: relativeDate(-1, 12, 0),
      updatedAt: relativeDate(-1, 12, 30),
    },
  ]);

  await db.insert(documents).values([
    {
      workspaceId: workspace.id,
      entityType: "job",
      entityId: fullStackJob.id,
      type: "jd",
      title: "Senior Full Stack Engineer JD",
      storageKey: "seed/jobs/senior-full-stack-engineer-jd.pdf",
      mimeType: "application/pdf",
      sizeBytes: 248000,
      sourceFilename: "senior-full-stack-engineer-jd.pdf",
      uploadedByUserId: owner.id,
      summaryStatus: "succeeded",
      summaryText: "Backend-heavy full stack role with strong mentoring expectations.",
      embeddingStatus: "succeeded",
      createdAt: relativeDate(-10, 9, 30),
      updatedAt: relativeDate(-10, 9, 30),
    },
    {
      workspaceId: workspace.id,
      entityType: "candidate",
      entityId: nina.id,
      type: "resume",
      title: "Nina Patel Resume",
      storageKey: "seed/candidates/nina-patel-resume.pdf",
      mimeType: "application/pdf",
      sizeBytes: 132000,
      sourceFilename: "nina-patel-resume.pdf",
      uploadedByUserId: recruiter.id,
      summaryStatus: "succeeded",
      summaryText: "Highlights API ownership, product collaboration, and mentoring.",
      embeddingStatus: "succeeded",
      createdAt: relativeDate(-9, 11, 30),
      updatedAt: relativeDate(-9, 11, 30),
    },
    {
      workspaceId: workspace.id,
      entityType: "candidate",
      entityId: elena.id,
      type: "resume",
      title: "Elena Garcia Portfolio Resume",
      storageKey: "seed/candidates/elena-garcia-resume.pdf",
      mimeType: "application/pdf",
      sizeBytes: 155000,
      sourceFilename: "elena-garcia-resume.pdf",
      uploadedByUserId: coordinator.id,
      summaryStatus: "queued",
      summaryText: null,
      embeddingStatus: "queued",
      createdAt: relativeDate(-7, 10, 30),
      updatedAt: relativeDate(-7, 10, 30),
    },
    {
      workspaceId: workspace.id,
      entityType: "submission",
      entityId: marcusSubmission.id,
      type: "interview_note",
      title: "Marcus Lee Client Interview Notes",
      storageKey: "seed/submissions/marcus-lee-client-interview-notes.md",
      mimeType: "text/markdown",
      sizeBytes: 18000,
      sourceFilename: "marcus-lee-client-interview-notes.md",
      uploadedByUserId: owner.id,
      summaryStatus: "succeeded",
      summaryText: "Strong system design feedback with some timeline risk due to competing offers.",
      embeddingStatus: "succeeded",
      createdAt: relativeDate(-1, 10, 15),
      updatedAt: relativeDate(-1, 10, 15),
    },
  ]);

  await db.insert(activityLogs).values([
    {
      teamId: workspace.id,
      userId: owner.id,
      action: ActivityType.SIGN_UP,
      timestamp: relativeDate(-21, 10, 5),
    },
    {
      teamId: workspace.id,
      userId: owner.id,
      action: ActivityType.CREATE_TEAM,
      timestamp: relativeDate(-21, 10, 10),
    },
    {
      teamId: workspace.id,
      userId: recruiter.id,
      action: ActivityType.ACCEPT_INVITATION,
      timestamp: relativeDate(-19, 11, 20),
    },
    {
      teamId: workspace.id,
      userId: coordinator.id,
      action: ActivityType.ACCEPT_INVITATION,
      timestamp: relativeDate(-17, 14, 5),
    },
    {
      teamId: workspace.id,
      userId: owner.id,
      action: ActivityType.SIGN_IN,
      timestamp: relativeDate(-1, 8, 45),
    },
  ]);

  await Promise.all([
    writeAuditLog({
      workspaceId: workspace.id,
      actorUserId: owner.id,
      actorRole: "owner",
      action: AuditAction.WORKSPACE_CREATED,
      entityType: "workspace",
      entityId: workspace.id,
      source: "seed",
      createdAt: relativeDate(-21, 10, 10),
      metadata: {
        workspaceName: workspace.name,
      },
    }),
    writeAuditLog({
      workspaceId: workspace.id,
      actorUserId: owner.id,
      actorRole: "owner",
      action: AuditAction.MEMBER_INVITED,
      entityType: "membership",
      entityId: recruiterMembership.id,
      source: "seed",
      createdAt: relativeDate(-20, 9, 45),
      metadata: {
        invitedEmail: recruiter.email,
        invitedRole: recruiterMembership.role,
      },
    }),
    writeAuditLog({
      workspaceId: workspace.id,
      actorUserId: recruiter.id,
      actorRole: "recruiter",
      action: AuditAction.MEMBER_JOINED,
      entityType: "membership",
      entityId: recruiterMembership.id,
      source: "seed",
      createdAt: relativeDate(-19, 11, 15),
      metadata: {
        joinedViaInvitation: true,
      },
    }),
    writeAuditLog({
      workspaceId: workspace.id,
      actorUserId: owner.id,
      actorRole: "owner",
      action: AuditAction.MEMBER_INVITED,
      entityType: "membership",
      entityId: coordinatorMembership.id,
      source: "seed",
      createdAt: relativeDate(-18, 16, 30),
      metadata: {
        invitedEmail: coordinator.email,
        invitedRole: coordinatorMembership.role,
      },
    }),
    writeAuditLog({
      workspaceId: workspace.id,
      actorUserId: coordinator.id,
      actorRole: "coordinator",
      action: AuditAction.MEMBER_JOINED,
      entityType: "membership",
      entityId: coordinatorMembership.id,
      source: "seed",
      createdAt: relativeDate(-17, 14, 0),
      metadata: {
        joinedViaInvitation: true,
      },
    }),
    writeAuditLog({
      workspaceId: workspace.id,
      actorUserId: owner.id,
      actorRole: "owner",
      action: AuditAction.SIGN_IN,
      entityType: "workspace",
      entityId: workspace.id,
      source: "seed",
      createdAt: relativeDate(-2, 8, 45),
    }),
    writeAuditLog({
      workspaceId: workspace.id,
      actorUserId: recruiter.id,
      actorRole: "recruiter",
      action: AuditAction.SIGN_IN,
      entityType: "workspace",
      entityId: workspace.id,
      source: "seed",
      createdAt: relativeDate(-1, 9, 10),
    }),
    writeAuditLog({
      workspaceId: workspace.id,
      actorUserId: coordinator.id,
      actorRole: "coordinator",
      action: AuditAction.SIGN_IN,
      entityType: "workspace",
      entityId: workspace.id,
      source: "seed",
      createdAt: relativeDate(-1, 9, 40),
    }),
    createStripeProducts(),
  ]);

  const accounts = await ensureDevTestAccounts();

  console.log(`Seeded ${DEMO_WORKSPACE_NAME} with demo data.`);
  console.log(`Ensured ${accounts.length} development test accounts.`);
  console.log(`Owner login: ${owner.email} / ${DEMO_PASSWORD}`);
  console.log(`Recruiter login: ${recruiter.email} / ${DEMO_PASSWORD}`);
  console.log(`Coordinator login: ${coordinator.email} / ${DEMO_PASSWORD}`);
};

seed()
  .catch((error) => {
    console.error("Seed process failed:", error);
    process.exit(1);
  })
  .finally(() => {
    console.log("Seed process finished. Exiting...");
    process.exit(0);
  });

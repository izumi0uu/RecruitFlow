import { apiDefaultJobStageTemplate } from "@recruitflow/contracts";
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
  auditLogs,
  automationRuns,
  candidates,
  clientContacts,
  clients,
  documents,
  invitations,
  jobStages,
  jobs,
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
    await db
      .delete(documents)
      .where(eq(documents.workspaceId, existingWorkspace.id));
    await db.delete(notes).where(eq(notes.workspaceId, existingWorkspace.id));
    await db.delete(tasks).where(eq(tasks.workspaceId, existingWorkspace.id));
    await db
      .delete(submissions)
      .where(eq(submissions.workspaceId, existingWorkspace.id));
    await db
      .delete(jobStages)
      .where(eq(jobStages.workspaceId, existingWorkspace.id));
    await db.delete(jobs).where(eq(jobs.workspaceId, existingWorkspace.id));
    await db
      .delete(clientContacts)
      .where(eq(clientContacts.workspaceId, existingWorkspace.id));
    await db
      .delete(candidates)
      .where(eq(candidates.workspaceId, existingWorkspace.id));
    await db
      .delete(clients)
      .where(eq(clients.workspaceId, existingWorkspace.id));
    await db
      .delete(invitations)
      .where(eq(invitations.teamId, existingWorkspace.id));
    await db
      .delete(activityLogs)
      .where(eq(activityLogs.teamId, existingWorkspace.id));
    await db
      .delete(auditLogs)
      .where(eq(auditLogs.workspaceId, existingWorkspace.id));
    await db
      .delete(teamMembers)
      .where(eq(teamMembers.teamId, existingWorkspace.id));
    await db.delete(teams).where(eq(teams.id, existingWorkspace.id));
  }

  await db.delete(users).where(
    inArray(
      users.email,
      DEMO_USERS.map((user) => user.email),
    ),
  );
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

  const ownerMembership = memberships.find(
    (membership) => membership.userId === owner.id,
  );
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
      {
        workspaceId: workspace.id,
        name: "Quantum Works",
        industry: "AI infrastructure",
        website: "https://quantumworks.example",
        hqLocation: "Seattle, WA",
        status: "active",
        priority: "high",
        ownerUserId: recruiter.id,
        lastContactedAt: relativeDate(-1, 14, 20),
        notesPreview:
          "CTO is moving quickly on infrastructure leadership and wants technically credible candidates.",
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-11, 13),
        updatedAt: relativeDate(-1, 14, 20),
      },
      {
        workspaceId: workspace.id,
        name: "BrightLayer Energy",
        industry: "Climate SaaS",
        website: "https://brightlayer.example",
        hqLocation: "Denver, CO",
        status: "active",
        priority: "medium",
        ownerUserId: owner.id,
        lastContactedAt: relativeDate(-2, 10, 45),
        notesPreview:
          "Revenue leadership wants operator profiles who can clean up process without slowing sales.",
        createdByUserId: owner.id,
        createdAt: relativeDate(-16, 12),
        updatedAt: relativeDate(-2, 10, 45),
      },
      {
        workspaceId: workspace.id,
        name: "Cedar Bank",
        industry: "Fintech",
        website: "https://cedarbank.example",
        hqLocation: "Charlotte, NC",
        status: "paused",
        priority: "low",
        ownerUserId: coordinator.id,
        lastContactedAt: relativeDate(-9, 16, 15),
        notesPreview:
          "Search is paused while compliance scope is reapproved by the business sponsor.",
        createdByUserId: coordinator.id,
        createdAt: relativeDate(-18, 9),
        updatedAt: relativeDate(-9, 16, 15),
      },
      {
        workspaceId: workspace.id,
        name: "Northstar Commerce",
        industry: "B2B commerce",
        website: "https://northstarcommerce.example",
        hqLocation: "Chicago, IL",
        status: "prospect",
        priority: "high",
        ownerUserId: recruiter.id,
        lastContactedAt: relativeDate(-4, 12, 5),
        notesPreview:
          "Founder is testing whether the agency can help with GTM leadership and enterprise sales.",
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-13, 15),
        updatedAt: relativeDate(-4, 12, 5),
      },
    ])
    .returning();

  const latticeLabs = createdClients.find(
    (client) => client.name === "Lattice Labs",
  );
  const harborHealth = createdClients.find(
    (client) => client.name === "Harbor Health",
  );
  const quantumWorks = createdClients.find(
    (client) => client.name === "Quantum Works",
  );
  const brightLayerEnergy = createdClients.find(
    (client) => client.name === "BrightLayer Energy",
  );
  const cedarBank = createdClients.find(
    (client) => client.name === "Cedar Bank",
  );
  const northstarCommerce = createdClients.find(
    (client) => client.name === "Northstar Commerce",
  );

  if (
    !latticeLabs ||
    !harborHealth ||
    !quantumWorks ||
    !brightLayerEnergy ||
    !cedarBank ||
    !northstarCommerce
  ) {
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
    {
      workspaceId: workspace.id,
      clientId: quantumWorks.id,
      fullName: "Iris Park",
      title: "Chief Technology Officer",
      email: "iris@quantumworks.example",
      phone: "+1-206-555-0162",
      relationshipType: "executive_sponsor",
      isPrimary: true,
      lastContactedAt: relativeDate(-1, 14, 20),
      createdAt: relativeDate(-11, 14),
      updatedAt: relativeDate(-1, 14, 20),
    },
    {
      workspaceId: workspace.id,
      clientId: quantumWorks.id,
      fullName: "Ben Wallace",
      title: "Engineering Operations Lead",
      email: "ben@quantumworks.example",
      phone: "+1-206-555-0120",
      relationshipType: "internal_recruiter",
      isPrimary: false,
      lastContactedAt: relativeDate(-2, 15, 10),
      createdAt: relativeDate(-10, 10),
      updatedAt: relativeDate(-2, 15, 10),
    },
    {
      workspaceId: workspace.id,
      clientId: brightLayerEnergy.id,
      fullName: "Leah Brooks",
      title: "VP Revenue",
      email: "leah@brightlayer.example",
      phone: "+1-720-555-0173",
      relationshipType: "hiring_manager",
      isPrimary: true,
      lastContactedAt: relativeDate(-2, 10, 45),
      createdAt: relativeDate(-16, 13),
      updatedAt: relativeDate(-2, 10, 45),
    },
    {
      workspaceId: workspace.id,
      clientId: cedarBank.id,
      fullName: "Anika Rao",
      title: "Director of Compliance",
      email: "anika@cedarbank.example",
      phone: "+1-980-555-0118",
      relationshipType: "hiring_manager",
      isPrimary: true,
      lastContactedAt: relativeDate(-9, 16, 15),
      createdAt: relativeDate(-18, 10),
      updatedAt: relativeDate(-9, 16, 15),
    },
    {
      workspaceId: workspace.id,
      clientId: northstarCommerce.id,
      fullName: "Cole Bennett",
      title: "Founder",
      email: "cole@northstarcommerce.example",
      phone: "+1-312-555-0182",
      relationshipType: "founder",
      isPrimary: true,
      lastContactedAt: relativeDate(-4, 12, 5),
      createdAt: relativeDate(-13, 16),
      updatedAt: relativeDate(-4, 12, 5),
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
      {
        workspaceId: workspace.id,
        clientId: quantumWorks.id,
        title: "Principal AI Infrastructure Engineer",
        department: "Platform",
        location: "Remote (US or Canada)",
        employmentType: "full-time",
        salaryMin: 220000,
        salaryMax: 275000,
        currency: "USD",
        ownerUserId: recruiter.id,
        status: "open",
        priority: "urgent",
        headcount: 1,
        placementFeePercent: 24,
        openedAt: relativeDate(-9, 10),
        targetFillDate: relativeDate(28, 17),
        description:
          "Infrastructure lead for model serving, inference reliability, and production developer experience.",
        intakeSummary:
          "CTO wants a candidate who can speak deeply about inference cost, platform reliability, and team design.",
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-9, 10),
        updatedAt: relativeDate(-1, 14),
      },
      {
        workspaceId: workspace.id,
        clientId: brightLayerEnergy.id,
        title: "Revenue Operations Lead",
        department: "Revenue",
        location: "Denver, CO",
        employmentType: "full-time",
        salaryMin: 145000,
        salaryMax: 175000,
        currency: "USD",
        ownerUserId: owner.id,
        status: "on_hold",
        priority: "medium",
        headcount: 1,
        placementFeePercent: 18,
        openedAt: relativeDate(-15, 9),
        targetFillDate: relativeDate(18, 17),
        description:
          "Own sales process design, forecasting hygiene, and systems alignment for a climate SaaS team.",
        intakeSummary:
          "Search is warm but temporarily held while the client aligns reporting lines with the CRO.",
        createdByUserId: owner.id,
        createdAt: relativeDate(-15, 9),
        updatedAt: relativeDate(-2, 10),
      },
      {
        workspaceId: workspace.id,
        clientId: harborHealth.id,
        title: "Clinical Implementation Manager",
        department: "Customer Success",
        location: "Remote - East Coast",
        employmentType: "full-time",
        salaryMin: 125000,
        salaryMax: 150000,
        currency: "USD",
        ownerUserId: coordinator.id,
        status: "open",
        priority: "high",
        headcount: 2,
        placementFeePercent: 19,
        openedAt: relativeDate(-7, 9),
        targetFillDate: relativeDate(31, 17),
        description:
          "Lead enterprise onboarding for provider groups and translate clinical workflows into implementation plans.",
        intakeSummary:
          "Client needs healthcare implementation depth and calm executive communication.",
        createdByUserId: coordinator.id,
        createdAt: relativeDate(-7, 9),
        updatedAt: relativeDate(-1, 11),
      },
      {
        workspaceId: workspace.id,
        clientId: cedarBank.id,
        title: "Compliance Data Analyst",
        department: "Risk",
        location: "Charlotte, NC",
        employmentType: "contract",
        salaryMin: 115000,
        salaryMax: 135000,
        currency: "USD",
        ownerUserId: coordinator.id,
        status: "closed",
        priority: "low",
        headcount: 1,
        placementFeePercent: 15,
        openedAt: relativeDate(-20, 9),
        targetFillDate: relativeDate(-2, 17),
        description:
          "Analyze compliance workflows and build audit-ready reporting for risk operations.",
        intakeSummary:
          "Closed after the sponsor paused budget; retained for pipeline history and disabled launch-state coverage.",
        createdByUserId: coordinator.id,
        createdAt: relativeDate(-20, 9),
        updatedAt: relativeDate(-3, 16),
      },
      {
        workspaceId: workspace.id,
        clientId: northstarCommerce.id,
        title: "Enterprise Account Executive",
        department: "Sales",
        location: "Chicago, IL",
        employmentType: "full-time",
        salaryMin: 120000,
        salaryMax: 145000,
        currency: "USD",
        ownerUserId: recruiter.id,
        status: "filled",
        priority: "high",
        headcount: 1,
        placementFeePercent: 20,
        openedAt: relativeDate(-19, 11),
        targetFillDate: relativeDate(5, 17),
        description:
          "Enterprise seller with commerce platform experience and founder-friendly communication.",
        intakeSummary:
          "Filled by a warm outbound candidate; kept in the seed to exercise outcome lanes.",
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-19, 11),
        updatedAt: relativeDate(-1, 16),
      },
    ])
    .returning();

  const fullStackJob = createdJobs.find(
    (job) => job.title === "Senior Full Stack Engineer",
  );
  const designerJob = createdJobs.find(
    (job) => job.title === "Founding Product Designer",
  );
  const aiInfraJob = createdJobs.find(
    (job) => job.title === "Principal AI Infrastructure Engineer",
  );
  const revOpsJob = createdJobs.find(
    (job) => job.title === "Revenue Operations Lead",
  );
  const implementationJob = createdJobs.find(
    (job) => job.title === "Clinical Implementation Manager",
  );
  const complianceJob = createdJobs.find(
    (job) => job.title === "Compliance Data Analyst",
  );
  const accountExecutiveJob = createdJobs.find(
    (job) => job.title === "Enterprise Account Executive",
  );

  if (
    !fullStackJob ||
    !designerJob ||
    !aiInfraJob ||
    !revOpsJob ||
    !implementationJob ||
    !complianceJob ||
    !accountExecutiveJob
  ) {
    throw new Error("Failed to create the demo jobs.");
  }

  await db.insert(jobStages).values(
    [
      { job: fullStackJob, timestamp: relativeDate(-10, 9) },
      { job: designerJob, timestamp: relativeDate(-6, 10) },
      { job: aiInfraJob, timestamp: relativeDate(-9, 10) },
      { job: revOpsJob, timestamp: relativeDate(-15, 9) },
      { job: implementationJob, timestamp: relativeDate(-7, 9) },
      { job: complianceJob, timestamp: relativeDate(-20, 9) },
      { job: accountExecutiveJob, timestamp: relativeDate(-19, 11) },
    ].flatMap(({ job, timestamp }) =>
      apiDefaultJobStageTemplate.map((stage) => ({
        workspaceId: workspace.id,
        jobId: job.id,
        key: stage.key,
        label: stage.label,
        sortOrder: stage.sortOrder,
        isClosedStage: stage.isClosedStage,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    ),
  );

  const createdCandidates = await db
    .insert(candidates)
    .values([
      {
        workspaceId: workspace.id,
        fullName: "Nina Patel",
        email: "nina.patel@example.com",
        phone: "+1-646-555-0133",
        headline:
          "Senior full stack engineer focused on product infrastructure",
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
        headline:
          "Platform-minded engineer with staff-level architecture depth",
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
      {
        workspaceId: workspace.id,
        fullName: "Priya Nair",
        email: "priya.nair@example.com",
        phone: "+1-206-555-0148",
        headline: "Infrastructure leader for high-throughput AI products",
        currentCompany: "VectorBay",
        currentTitle: "Principal Engineer",
        location: "Seattle, WA",
        salaryExpectation: "$260k base",
        noticePeriod: "6 weeks",
        source: "Outbound",
        linkedinUrl: "https://linkedin.com/in/priya-nair-demo",
        portfolioUrl: "https://priya.dev",
        skillsText:
          "Kubernetes, model serving, Python, TypeScript, observability",
        summary:
          "Deep systems profile with credible leadership stories around inference cost and platform reliability.",
        ownerUserId: recruiter.id,
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-6, 13),
        updatedAt: relativeDate(-1, 14),
      },
      {
        workspaceId: workspace.id,
        fullName: "Theo Brooks",
        email: "theo.brooks@example.com",
        phone: "+1-303-555-0179",
        headline: "Revenue operations builder for technical GTM teams",
        currentCompany: "Gridline",
        currentTitle: "Director of RevOps",
        location: "Denver, CO",
        salaryExpectation: "$165k base",
        noticePeriod: "30 days",
        source: "Referral",
        linkedinUrl: "https://linkedin.com/in/theo-brooks-demo",
        skillsText: "Salesforce, forecasting, territory design, process design",
        summary:
          "Strong operating cadence and executive communication; wants a tighter mandate before moving.",
        ownerUserId: owner.id,
        createdByUserId: owner.id,
        createdAt: relativeDate(-10, 16),
        updatedAt: relativeDate(-2, 13),
      },
      {
        workspaceId: workspace.id,
        fullName: "Lila Chen",
        email: "lila.chen@example.com",
        phone: "+1-617-555-0156",
        headline: "Healthcare implementation leader for enterprise rollouts",
        currentCompany: "MedBridge",
        currentTitle: "Senior Implementation Manager",
        location: "Boston, MA",
        salaryExpectation: "$142k base",
        noticePeriod: "3 weeks",
        source: "Inbound",
        linkedinUrl: "https://linkedin.com/in/lila-chen-demo",
        skillsText: "Provider onboarding, change management, EHR workflows",
        summary:
          "Excellent client-facing implementation profile with enough clinical context for complex stakeholders.",
        ownerUserId: coordinator.id,
        createdByUserId: coordinator.id,
        createdAt: relativeDate(-4, 11),
        updatedAt: relativeDate(-1, 12),
      },
      {
        workspaceId: workspace.id,
        fullName: "Omar Hassan",
        email: "omar.hassan@example.com",
        phone: "+1-704-555-0164",
        headline: "Compliance data analyst with banking risk experience",
        currentCompany: "Pine Street Bank",
        currentTitle: "Senior Risk Analyst",
        location: "Charlotte, NC",
        salaryExpectation: "$130k base",
        noticePeriod: "2 weeks",
        source: "Talent pool",
        linkedinUrl: "https://linkedin.com/in/omar-hassan-demo",
        skillsText: "SQL, audit reporting, regulatory workflows, Tableau",
        summary:
          "Solid compliance analytics background, but scope alignment depends on how technical the client wants the role.",
        ownerUserId: coordinator.id,
        createdByUserId: coordinator.id,
        createdAt: relativeDate(-12, 9),
        updatedAt: relativeDate(-3, 16),
      },
      {
        workspaceId: workspace.id,
        fullName: "Grace Kim",
        email: "grace.kim@example.com",
        phone: "+1-312-555-0159",
        headline: "Enterprise seller for commerce and payments platforms",
        currentCompany: "MarketDock",
        currentTitle: "Senior Account Executive",
        location: "Chicago, IL",
        salaryExpectation: "$135k base",
        noticePeriod: "2 weeks",
        source: "Outbound",
        linkedinUrl: "https://linkedin.com/in/grace-kim-demo",
        skillsText:
          "Enterprise sales, commerce platforms, MEDDICC, founder-led GTM",
        summary:
          "Placed candidate with strong founder rapport and enough vertical experience for Northstar Commerce.",
        ownerUserId: recruiter.id,
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-15, 12),
        updatedAt: relativeDate(-1, 16),
      },
      {
        workspaceId: workspace.id,
        fullName: "Rosa Martinez",
        email: "rosa.martinez@example.com",
        phone: "+1-917-555-0112",
        headline: "Product operations designer with systems and research depth",
        currentCompany: "WellPath",
        currentTitle: "Product Design Manager",
        location: "New York, NY",
        salaryExpectation: "$188k base",
        noticePeriod: "4 weeks",
        source: "Referral",
        linkedinUrl: "https://linkedin.com/in/rosa-martinez-demo",
        portfolioUrl: "https://rosa.design",
        skillsText:
          "Design systems, product ops, research synthesis, healthcare UX",
        summary:
          "Strong alternate design slate for Harbor Health; timeline depends on bonus payout.",
        ownerUserId: owner.id,
        createdByUserId: owner.id,
        createdAt: relativeDate(-5, 10),
        updatedAt: relativeDate(-1, 15),
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
  const samir = createdCandidates.find(
    (candidate) => candidate.fullName === "Samir Shah",
  );
  const priya = createdCandidates.find(
    (candidate) => candidate.fullName === "Priya Nair",
  );
  const theo = createdCandidates.find(
    (candidate) => candidate.fullName === "Theo Brooks",
  );
  const lila = createdCandidates.find(
    (candidate) => candidate.fullName === "Lila Chen",
  );
  const omar = createdCandidates.find(
    (candidate) => candidate.fullName === "Omar Hassan",
  );
  const grace = createdCandidates.find(
    (candidate) => candidate.fullName === "Grace Kim",
  );
  const rosa = createdCandidates.find(
    (candidate) => candidate.fullName === "Rosa Martinez",
  );

  if (
    !nina ||
    !marcus ||
    !elena ||
    !samir ||
    !priya ||
    !theo ||
    !lila ||
    !omar ||
    !grace ||
    !rosa
  ) {
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
        nextStep:
          "Confirm competing process timeline and keep warm with the client.",
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
        nextStep:
          "Collect founder feedback on portfolio depth before formal submission.",
        submittedAt: relativeDate(-2, 14, 0),
        lastTouchAt: relativeDate(-1, 15, 0),
        latestFeedbackAt: relativeDate(-1, 15, 30),
        createdByUserId: coordinator.id,
        createdAt: relativeDate(-2, 14, 0),
        updatedAt: relativeDate(-1, 15, 30),
      },
      {
        workspaceId: workspace.id,
        jobId: fullStackJob.id,
        candidateId: samir.id,
        ownerUserId: recruiter.id,
        stage: "screening",
        riskFlag: "fit_risk",
        nextStep: "Validate backend depth before deciding whether to submit.",
        submittedAt: null,
        lastTouchAt: relativeDate(-1, 12, 10),
        latestFeedbackAt: null,
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-3, 15, 20),
        updatedAt: relativeDate(-1, 12, 10),
      },
      {
        workspaceId: workspace.id,
        jobId: aiInfraJob.id,
        candidateId: priya.id,
        ownerUserId: recruiter.id,
        stage: "offer",
        riskFlag: "compensation_risk",
        nextStep:
          "Align offer structure with Priya's equity expectations before Friday.",
        submittedAt: relativeDate(-5, 13, 30),
        lastTouchAt: relativeDate(-1, 14, 5),
        latestFeedbackAt: relativeDate(-1, 14, 15),
        offerAmount: 268000,
        currency: "USD",
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-5, 13, 30),
        updatedAt: relativeDate(-1, 14, 15),
      },
      {
        workspaceId: workspace.id,
        jobId: revOpsJob.id,
        candidateId: theo.id,
        ownerUserId: owner.id,
        stage: "submitted",
        riskFlag: "feedback_risk",
        nextStep:
          "Wait for CRO alignment before scheduling the case interview.",
        submittedAt: relativeDate(-4, 9, 45),
        lastTouchAt: relativeDate(-2, 10, 45),
        latestFeedbackAt: relativeDate(-2, 11, 15),
        createdByUserId: owner.id,
        createdAt: relativeDate(-4, 9, 45),
        updatedAt: relativeDate(-2, 11, 15),
      },
      {
        workspaceId: workspace.id,
        jobId: implementationJob.id,
        candidateId: lila.id,
        ownerUserId: coordinator.id,
        stage: "sourced",
        riskFlag: "none",
        nextStep:
          "Confirm implementation case examples before recruiter screen.",
        submittedAt: null,
        lastTouchAt: relativeDate(-1, 11, 40),
        latestFeedbackAt: null,
        createdByUserId: coordinator.id,
        createdAt: relativeDate(-2, 10, 20),
        updatedAt: relativeDate(-1, 11, 40),
      },
      {
        workspaceId: workspace.id,
        jobId: complianceJob.id,
        candidateId: omar.id,
        ownerUserId: coordinator.id,
        stage: "lost",
        riskFlag: "fit_risk",
        nextStep:
          "Keep Omar warm for future analytics-heavy compliance searches.",
        submittedAt: relativeDate(-10, 11, 0),
        lastTouchAt: relativeDate(-3, 16, 5),
        latestFeedbackAt: relativeDate(-3, 16, 5),
        lostReason:
          "Client paused budget and wanted deeper model validation experience.",
        createdByUserId: coordinator.id,
        createdAt: relativeDate(-10, 11, 0),
        updatedAt: relativeDate(-3, 16, 5),
      },
      {
        workspaceId: workspace.id,
        jobId: accountExecutiveJob.id,
        candidateId: grace.id,
        ownerUserId: recruiter.id,
        stage: "placed",
        riskFlag: "none",
        nextStep: "Send start-date reminder and close placement paperwork.",
        submittedAt: relativeDate(-12, 14, 0),
        lastTouchAt: relativeDate(-1, 16, 30),
        latestFeedbackAt: relativeDate(-1, 16, 30),
        offerAmount: 142000,
        currency: "USD",
        createdByUserId: recruiter.id,
        createdAt: relativeDate(-12, 14, 0),
        updatedAt: relativeDate(-1, 16, 30),
      },
      {
        workspaceId: workspace.id,
        jobId: designerJob.id,
        candidateId: rosa.id,
        ownerUserId: owner.id,
        stage: "submitted",
        riskFlag: "timing_risk",
        nextStep:
          "Clarify bonus payout timing before founder portfolio review.",
        submittedAt: relativeDate(-1, 15, 5),
        lastTouchAt: relativeDate(-1, 15, 25),
        latestFeedbackAt: null,
        createdByUserId: owner.id,
        createdAt: relativeDate(-1, 15, 5),
        updatedAt: relativeDate(-1, 15, 25),
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
  const samirSubmission = createdSubmissions.find(
    (submission) => submission.candidateId === samir.id,
  );
  const priyaSubmission = createdSubmissions.find(
    (submission) => submission.candidateId === priya.id,
  );
  const theoSubmission = createdSubmissions.find(
    (submission) => submission.candidateId === theo.id,
  );
  const lilaSubmission = createdSubmissions.find(
    (submission) => submission.candidateId === lila.id,
  );
  const omarSubmission = createdSubmissions.find(
    (submission) => submission.candidateId === omar.id,
  );
  const graceSubmission = createdSubmissions.find(
    (submission) => submission.candidateId === grace.id,
  );
  const rosaSubmission = createdSubmissions.find(
    (submission) => submission.candidateId === rosa.id,
  );

  if (
    !ninaSubmission ||
    !marcusSubmission ||
    !elenaSubmission ||
    !samirSubmission ||
    !priyaSubmission ||
    !theoSubmission ||
    !lilaSubmission ||
    !omarSubmission ||
    !graceSubmission ||
    !rosaSubmission
  ) {
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
      description:
        "Coordinate founder availability and confirm candidate prep materials.",
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
    {
      workspaceId: workspace.id,
      title: "Pressure-test Samir Shah backend examples",
      description:
        "Collect two architecture stories before deciding whether he belongs in the full stack slate.",
      status: "open",
      dueAt: relativeDate(0, 15, 0),
      assignedToUserId: recruiter.id,
      createdByUserId: recruiter.id,
      entityType: "submission",
      entityId: samirSubmission.id,
      submissionId: samirSubmission.id,
      createdAt: relativeDate(-1, 12, 15),
      updatedAt: relativeDate(-1, 12, 15),
    },
    {
      workspaceId: workspace.id,
      title: "Model Priya Nair offer scenarios",
      description:
        "Prepare base, bonus, and equity tradeoffs before the CTO call.",
      status: "open",
      dueAt: relativeDate(0, 16, 30),
      assignedToUserId: owner.id,
      createdByUserId: recruiter.id,
      entityType: "submission",
      entityId: priyaSubmission.id,
      submissionId: priyaSubmission.id,
      createdAt: relativeDate(-1, 14, 30),
      updatedAt: relativeDate(-1, 14, 30),
    },
    {
      workspaceId: workspace.id,
      title: "Check BrightLayer hold status",
      description:
        "Ask Leah whether the CRO reporting-line decision has a firm date.",
      status: "snoozed",
      dueAt: relativeDate(3, 10, 0),
      snoozedUntil: relativeDate(2, 9, 0),
      assignedToUserId: owner.id,
      createdByUserId: owner.id,
      entityType: "submission",
      entityId: theoSubmission.id,
      submissionId: theoSubmission.id,
      createdAt: relativeDate(-2, 11, 30),
      updatedAt: relativeDate(-2, 11, 30),
    },
    {
      workspaceId: workspace.id,
      title: "Send Lila Chen implementation screen brief",
      description:
        "Include provider-group rollout context and stakeholder map.",
      status: "open",
      dueAt: relativeDate(1, 14, 0),
      assignedToUserId: coordinator.id,
      createdByUserId: coordinator.id,
      entityType: "submission",
      entityId: lilaSubmission.id,
      submissionId: lilaSubmission.id,
      createdAt: relativeDate(-1, 11, 45),
      updatedAt: relativeDate(-1, 11, 45),
    },
    {
      workspaceId: workspace.id,
      title: "Archive Cedar Bank closeout note",
      description:
        "Capture why the compliance analyst search closed and tag Omar for future risk analytics roles.",
      status: "done",
      dueAt: relativeDate(-2, 12, 0),
      assignedToUserId: coordinator.id,
      createdByUserId: coordinator.id,
      entityType: "submission",
      entityId: omarSubmission.id,
      submissionId: omarSubmission.id,
      completedAt: relativeDate(-2, 11, 30),
      createdAt: relativeDate(-3, 16, 20),
      updatedAt: relativeDate(-2, 11, 30),
    },
    {
      workspaceId: workspace.id,
      title: "Send Grace Kim start-date reminder",
      description:
        "Confirm onboarding paperwork and first-week calendar with Northstar Commerce.",
      status: "open",
      dueAt: relativeDate(4, 10, 0),
      assignedToUserId: recruiter.id,
      createdByUserId: recruiter.id,
      entityType: "submission",
      entityId: graceSubmission.id,
      submissionId: graceSubmission.id,
      createdAt: relativeDate(-1, 16, 40),
      updatedAt: relativeDate(-1, 16, 40),
    },
    {
      workspaceId: workspace.id,
      title: "Confirm Rosa Martinez bonus timing",
      description:
        "Decide whether to push founder review or frame the timing risk directly.",
      status: "open",
      dueAt: relativeDate(1, 12, 30),
      assignedToUserId: owner.id,
      createdByUserId: owner.id,
      entityType: "submission",
      entityId: rosaSubmission.id,
      submissionId: rosaSubmission.id,
      createdAt: relativeDate(-1, 15, 35),
      updatedAt: relativeDate(-1, 15, 35),
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
      summaryText:
        "Backend-heavy full stack role with strong mentoring expectations.",
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
      summaryText:
        "Highlights API ownership, product collaboration, and mentoring.",
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
      summaryText:
        "Strong system design feedback with some timeline risk due to competing offers.",
      embeddingStatus: "succeeded",
      createdAt: relativeDate(-1, 10, 15),
      updatedAt: relativeDate(-1, 10, 15),
    },
    {
      workspaceId: workspace.id,
      entityType: "job",
      entityId: aiInfraJob.id,
      type: "jd",
      title: "Principal AI Infrastructure Engineer JD",
      storageKey: "seed/jobs/principal-ai-infrastructure-engineer-jd.pdf",
      mimeType: "application/pdf",
      sizeBytes: 284000,
      sourceFilename: "principal-ai-infrastructure-engineer-jd.pdf",
      uploadedByUserId: recruiter.id,
      summaryStatus: "succeeded",
      summaryText:
        "Inference platform role requiring production reliability, cost control, and team leadership.",
      embeddingStatus: "succeeded",
      createdAt: relativeDate(-9, 10, 30),
      updatedAt: relativeDate(-9, 10, 30),
    },
    {
      workspaceId: workspace.id,
      entityType: "job",
      entityId: revOpsJob.id,
      type: "jd",
      title: "Revenue Operations Lead Intake Notes",
      storageKey: "seed/jobs/revenue-operations-lead-intake.md",
      mimeType: "text/markdown",
      sizeBytes: 21000,
      sourceFilename: "revenue-operations-lead-intake.md",
      uploadedByUserId: owner.id,
      summaryStatus: "running",
      summaryText: null,
      embeddingStatus: "queued",
      createdAt: relativeDate(-15, 9, 30),
      updatedAt: relativeDate(-2, 10, 50),
    },
    {
      workspaceId: workspace.id,
      entityType: "candidate",
      entityId: priya.id,
      type: "resume",
      title: "Priya Nair Resume",
      storageKey: "seed/candidates/priya-nair-resume.pdf",
      mimeType: "application/pdf",
      sizeBytes: 166000,
      sourceFilename: "priya-nair-resume.pdf",
      uploadedByUserId: recruiter.id,
      summaryStatus: "succeeded",
      summaryText:
        "Production AI infrastructure leadership with model-serving and observability depth.",
      embeddingStatus: "succeeded",
      createdAt: relativeDate(-6, 13, 30),
      updatedAt: relativeDate(-6, 13, 30),
    },
    {
      workspaceId: workspace.id,
      entityType: "candidate",
      entityId: theo.id,
      type: "resume",
      title: "Theo Brooks Resume",
      storageKey: "seed/candidates/theo-brooks-resume.pdf",
      mimeType: "application/pdf",
      sizeBytes: 121000,
      sourceFilename: "theo-brooks-resume.pdf",
      uploadedByUserId: owner.id,
      summaryStatus: "failed",
      summaryText: null,
      embeddingStatus: "failed",
      createdAt: relativeDate(-10, 16, 30),
      updatedAt: relativeDate(-2, 12, 0),
    },
    {
      workspaceId: workspace.id,
      entityType: "candidate",
      entityId: lila.id,
      type: "resume",
      title: "Lila Chen Resume",
      storageKey: "seed/candidates/lila-chen-resume.pdf",
      mimeType: "application/pdf",
      sizeBytes: 118000,
      sourceFilename: "lila-chen-resume.pdf",
      uploadedByUserId: coordinator.id,
      summaryStatus: "queued",
      summaryText: null,
      embeddingStatus: "queued",
      createdAt: relativeDate(-4, 11, 30),
      updatedAt: relativeDate(-4, 11, 30),
    },
    {
      workspaceId: workspace.id,
      entityType: "submission",
      entityId: priyaSubmission.id,
      type: "interview_note",
      title: "Priya Nair Offer Calibration Notes",
      storageKey: "seed/submissions/priya-nair-offer-calibration.md",
      mimeType: "text/markdown",
      sizeBytes: 24000,
      sourceFilename: "priya-nair-offer-calibration.md",
      uploadedByUserId: recruiter.id,
      summaryStatus: "succeeded",
      summaryText:
        "Offer risk is mostly compensation mix; technical and leadership feedback are strong.",
      embeddingStatus: "succeeded",
      createdAt: relativeDate(-1, 14, 20),
      updatedAt: relativeDate(-1, 14, 20),
    },
    {
      workspaceId: workspace.id,
      entityType: "submission",
      entityId: graceSubmission.id,
      type: "call_note",
      title: "Grace Kim Placement Closeout",
      storageKey: "seed/submissions/grace-kim-placement-closeout.md",
      mimeType: "text/markdown",
      sizeBytes: 15000,
      sourceFilename: "grace-kim-placement-closeout.md",
      uploadedByUserId: recruiter.id,
      summaryStatus: "succeeded",
      summaryText:
        "Placement closed after founder reference call and compensation approval.",
      embeddingStatus: "succeeded",
      createdAt: relativeDate(-1, 16, 45),
      updatedAt: relativeDate(-1, 16, 45),
    },
  ]);

  await db.insert(notes).values([
    {
      workspaceId: workspace.id,
      entityType: "client",
      entityId: quantumWorks.id,
      body: "Iris is prioritizing reliability stories over pure research credentials. Lead with production tradeoffs.",
      visibility: "workspace",
      createdByUserId: recruiter.id,
      createdAt: relativeDate(-2, 15, 15),
      updatedAt: relativeDate(-2, 15, 15),
    },
    {
      workspaceId: workspace.id,
      entityType: "job",
      entityId: revOpsJob.id,
      body: "Hold is client-side, not candidate quality. Keep Theo warm but avoid over-promising timeline.",
      visibility: "workspace",
      createdByUserId: owner.id,
      createdAt: relativeDate(-2, 11, 20),
      updatedAt: relativeDate(-2, 11, 20),
    },
    {
      workspaceId: workspace.id,
      entityType: "submission",
      entityId: samirSubmission.id,
      body: "Great frontend and accessibility signal; backend depth still needs proof before client handoff.",
      visibility: "workspace",
      createdByUserId: recruiter.id,
      createdAt: relativeDate(-1, 12, 20),
      updatedAt: relativeDate(-1, 12, 20),
    },
    {
      workspaceId: workspace.id,
      entityType: "submission",
      entityId: priyaSubmission.id,
      body: "CTO feedback is highly positive. Main gap is whether compensation mix can land without a prolonged counteroffer.",
      visibility: "workspace",
      createdByUserId: recruiter.id,
      createdAt: relativeDate(-1, 14, 25),
      updatedAt: relativeDate(-1, 14, 25),
    },
    {
      workspaceId: workspace.id,
      entityType: "submission",
      entityId: omarSubmission.id,
      body: "Closeout retained for future fintech analytics searches; Omar was professional and open to re-engagement.",
      visibility: "workspace",
      createdByUserId: coordinator.id,
      createdAt: relativeDate(-3, 16, 15),
      updatedAt: relativeDate(-3, 16, 15),
    },
  ]);

  await db.insert(automationRuns).values([
    {
      workspaceId: workspace.id,
      type: "jd_summary",
      status: "succeeded",
      entityType: "job",
      entityId: aiInfraJob.id,
      attemptCount: 1,
      startedAt: relativeDate(-9, 10, 35),
      finishedAt: relativeDate(-9, 10, 36),
      createdAt: relativeDate(-9, 10, 35),
      updatedAt: relativeDate(-9, 10, 36),
    },
    {
      workspaceId: workspace.id,
      type: "candidate_summary",
      status: "failed",
      entityType: "candidate",
      entityId: theo.id,
      attemptCount: 2,
      errorMessage:
        "Seeded retry example: source document text extraction failed.",
      startedAt: relativeDate(-2, 11, 55),
      finishedAt: relativeDate(-2, 12, 0),
      createdAt: relativeDate(-10, 16, 35),
      updatedAt: relativeDate(-2, 12, 0),
    },
    {
      workspaceId: workspace.id,
      type: "document_indexing",
      status: "queued",
      entityType: "candidate",
      entityId: lila.id,
      attemptCount: 0,
      createdAt: relativeDate(-4, 11, 35),
      updatedAt: relativeDate(-4, 11, 35),
    },
    {
      workspaceId: workspace.id,
      type: "reminder_generation",
      status: "running",
      entityType: "submission",
      entityId: rosaSubmission.id,
      attemptCount: 1,
      startedAt: relativeDate(-1, 15, 40),
      createdAt: relativeDate(-1, 15, 40),
      updatedAt: relativeDate(-1, 15, 40),
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

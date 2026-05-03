import type {
  ApiAutomationStatus,
  ApiDocumentType,
  ApiRiskFlag,
  ApiSubmissionStage,
  CandidateDetailResponse,
  CandidateRecord,
  DocumentRecord,
  DocumentsListResponse,
  SubmissionRecord,
  SubmissionsListResponse,
} from "@recruitflow/contracts";
import { apiDefaultJobStageTemplate } from "@recruitflow/contracts";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  FileText,
  Gauge,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { isApiRequestError, requestApiJson } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{
    candidateId: string;
  }>;
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const normalizeExternalHref = (value: string | null) => {
  if (!value) {
    return null;
  }

  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const formatCandidateFocus = (candidate: CandidateRecord) => {
  const roleParts = [candidate.currentTitle, candidate.currentCompany].filter(
    Boolean,
  );
  const roleLabel = roleParts.join(" at ");

  return roleLabel || candidate.headline || "Profile baseline pending";
};

const getCandidateDetail = async (candidateId: string) => {
  try {
    return await requestApiJson<CandidateDetailResponse>(
      `/candidates/${candidateId}`,
    );
  } catch (error) {
    if (isApiRequestError(error)) {
      if (error.status === 401) {
        redirect("/sign-in");
      }

      if (error.status === 400 || error.status === 404) {
        notFound();
      }
    }

    throw error;
  }
};

const getCandidateDocuments = async (candidateId: string) => {
  try {
    return await requestApiJson<DocumentsListResponse>(
      `/documents?entityType=candidate&entityId=${candidateId}&pageSize=6`,
    );
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const getCandidateSubmissions = async (candidateId: string) => {
  try {
    return await requestApiJson<SubmissionsListResponse>(
      `/submissions?candidateId=${candidateId}&pageSize=100`,
    );
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const Badge = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
      className,
    )}
  >
    {children}
  </span>
);

const DetailTile = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <div className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {icon}
      {label}
    </div>
    <p className="mt-3 text-sm font-medium leading-6 text-foreground">
      {value}
    </p>
  </div>
);

const ContactLink = ({
  children,
  href,
  icon,
}: {
  children: ReactNode;
  href: string;
  icon: ReactNode;
}) => (
  <a
    className="flex items-center gap-3 rounded-[1.1rem] border border-border/70 bg-surface-1/70 px-3 py-3 text-sm font-medium text-foreground transition hover:border-foreground/30"
    href={href}
    rel="noreferrer"
    target={href.startsWith("http") ? "_blank" : undefined}
  >
    <span className="text-muted-foreground">{icon}</span>
    <span className="min-w-0 truncate">{children}</span>
  </a>
);

const TextPanel = ({
  description,
  fallback,
  icon,
  title,
  value,
}: {
  description: string;
  fallback: string;
  icon: ReactNode;
  title: string;
  value: string | null;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="whitespace-pre-wrap rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4 text-sm leading-6 text-foreground">
        {value ?? fallback}
      </p>
    </CardContent>
  </Card>
);

const documentTypeLabelMap: Record<ApiDocumentType, string> = {
  call_note: "Call note",
  interview_note: "Interview note",
  jd: "Job description",
  resume: "Resume",
};

const statusToneMap: Record<ApiAutomationStatus, string> = {
  failed: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  queued: "border-border/70 bg-surface-1 text-muted-foreground",
  running: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  succeeded:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const LinkedDocumentRow = ({ document }: { document: DocumentRecord }) => (
  <div className="rounded-[1.2rem] border border-border/70 bg-surface-1/70 p-4">
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300">
        {documentTypeLabelMap[document.type]}
      </Badge>
      <Badge className={statusToneMap[document.summaryStatus]}>
        Summary: {document.summaryStatus}
      </Badge>
      <Badge className={statusToneMap[document.embeddingStatus]}>
        Embedding: {document.embeddingStatus}
      </Badge>
    </div>
    <p className="mt-3 truncate text-sm font-semibold text-foreground">
      {document.title}
    </p>
    <p className="mt-1 truncate text-sm leading-6 text-muted-foreground">
      {document.sourceFilename}
    </p>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">
      Added {formatDate(document.createdAt)}
    </p>
  </div>
);

const DocumentsSection = ({
  candidate,
  documents,
}: {
  candidate: CandidateRecord;
  documents: DocumentRecord[];
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="size-4" />
        Documents
      </CardTitle>
      <CardDescription>
        Register metadata against this profile now; richer document lists and
        upload transport stay downstream.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div
        className={cn(
          "rounded-[1.35rem] border p-5",
          candidate.hasResume
            ? "border-emerald-500/25 bg-emerald-500/10"
            : "border-dashed border-border bg-surface-1/60",
        )}
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {candidate.hasResume ? (
            <BadgeCheck className="size-4 text-emerald-600 dark:text-emerald-300" />
          ) : (
            <FileText className="size-4 text-muted-foreground" />
          )}
          {candidate.hasResume
            ? "Resume metadata detected"
            : "No resume linked yet"}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {candidate.hasResume
            ? "The list/detail surfaces reflect resume presence from document metadata. RF-37 will make the linked rows visible here."
            : "Add metadata for a resume, call note, or interview note so this profile can carry document context before the full documents hub lands."}
        </p>
        <Button asChild className="mt-4 rounded-full" variant="outline">
          <TrackedLink
            href={`/documents/new?entityType=candidate&entityId=${candidate.id}&type=resume`}
          >
            Add document metadata
          </TrackedLink>
        </Button>
      </div>

      {documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((document) => (
            <LinkedDocumentRow key={document.id} document={document} />
          ))}
          <Button asChild variant="outline" className="rounded-full">
            <TrackedLink
              href={`/documents?entityType=candidate&entityId=${candidate.id}`}
            >
              View all linked documents
            </TrackedLink>
          </Button>
        </div>
      ) : (
        <div className="rounded-[1.35rem] border border-dashed border-border bg-surface-1/60 p-5">
          <p className="text-sm font-medium text-foreground">
            Linked document list is empty.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add metadata from this page or filter the documents hub by this
            candidate once files are registered.
          </p>
        </div>
      )}
    </CardContent>
  </Card>
);

const stageLabelMap = Object.fromEntries(
  apiDefaultJobStageTemplate.map((stage) => [stage.key, stage.label]),
) as Record<ApiSubmissionStage, string>;

const stageAccentClassMap: Record<ApiSubmissionStage, string> = {
  client_interview: "bg-sky-500",
  lost: "bg-slate-400",
  offer: "bg-violet-500",
  placed: "bg-emerald-500",
  screening: "bg-amber-500",
  sourced: "bg-zinc-500",
  submitted: "bg-cyan-500",
};

const stageBadgeClassMap: Record<ApiSubmissionStage, string> = {
  client_interview:
    "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  lost: "border-slate-400/25 bg-slate-400/10 text-slate-700 dark:text-slate-300",
  offer:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  placed:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  screening:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  sourced: "border-border/70 bg-surface-1 text-muted-foreground",
  submitted:
    "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
};

const riskLabelMap: Record<ApiRiskFlag, string> = {
  compensation_risk: "Compensation",
  feedback_risk: "Feedback",
  fit_risk: "Fit",
  none: "Clear",
  timing_risk: "Timing",
};

const riskBadgeClassMap: Record<ApiRiskFlag, string> = {
  compensation_risk:
    "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  feedback_risk:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  fit_risk:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  none: "border-border/70 bg-surface-1 text-muted-foreground",
  timing_risk:
    "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

const clientFacingStages = new Set<ApiSubmissionStage>([
  "submitted",
  "client_interview",
  "offer",
]);

const terminalStages = new Set<ApiSubmissionStage>(["lost", "placed"]);

const getSubmissionTouchValue = (submission: SubmissionRecord) =>
  submission.lastTouchAt ?? submission.updatedAt ?? submission.createdAt;

const getSubmissionOwnerLabel = (submission: SubmissionRecord) =>
  submission.owner?.name ?? submission.owner?.email ?? "Unassigned";

const getSubmissionRoleLabel = (submission: SubmissionRecord) =>
  submission.job?.title ?? "Unknown role";

const getSubmissionRoleContext = (submission: SubmissionRecord) =>
  [
    submission.job?.client?.name,
    submission.job?.status
      ? `${submission.job.status.replaceAll("_", " ")} role`
      : null,
  ]
    .filter(Boolean)
    .join(" - ") || "Role context pending";

const PipelineSummaryMetric = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <div className="rounded-[1.05rem] border border-border/70 bg-workspace-muted-surface/54 px-3 py-3">
    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {label}
    </p>
    <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
  </div>
);

const CandidatePipelineStageRail = ({
  submissions,
}: {
  submissions: SubmissionRecord[];
}) => {
  const total = submissions.length;

  return (
    <div className="grid gap-2 md:grid-cols-7">
      {apiDefaultJobStageTemplate.map((stage) => {
        const stageCount = submissions.filter(
          (submission) => submission.stage === stage.key,
        ).length;
        const width =
          total > 0 ? Math.max(10, Math.round((stageCount / total) * 100)) : 0;

        return (
          <div
            key={stage.key}
            className="overflow-hidden rounded-[1rem] border border-border/70 bg-surface-1/65 px-3 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {stage.label}
              </span>
              <span className="text-xs font-semibold text-foreground">
                {stageCount}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/70">
              <span
                className={cn(
                  "block h-full rounded-full",
                  stageAccentClassMap[stage.key],
                )}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CandidatePipelineRow = ({
  candidateId,
  submission,
}: {
  candidateId: string;
  submission: SubmissionRecord;
}) => (
  <div className="grid gap-3 rounded-[1.15rem] border border-border/70 bg-surface-1/60 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,0.45fr)_auto] lg:items-center">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={stageBadgeClassMap[submission.stage]}>
          {stageLabelMap[submission.stage]}
        </Badge>
        <Badge className={riskBadgeClassMap[submission.riskFlag]}>
          {riskLabelMap[submission.riskFlag]}
        </Badge>
      </div>
      <p className="mt-3 truncate text-sm font-semibold text-foreground">
        {getSubmissionRoleLabel(submission)}
      </p>
      <p className="mt-1 truncate text-sm leading-6 text-muted-foreground">
        {getSubmissionRoleContext(submission)}
      </p>
    </div>

    <div className="min-w-0 text-sm leading-6 text-muted-foreground">
      <p className="truncate">Owner: {getSubmissionOwnerLabel(submission)}</p>
      <p className="truncate">
        Touch: {formatDate(getSubmissionTouchValue(submission))}
      </p>
      <p className="truncate">
        Next: {submission.nextStep ?? "No next step captured"}
      </p>
    </div>

    <Button asChild className="rounded-full" variant="outline">
      <TrackedLink href={`/pipeline?candidateId=${candidateId}&view=list`}>
        Open pipeline
      </TrackedLink>
    </Button>
  </div>
);

const CandidatePipelineSummary = ({
  canCreate,
  candidate,
  submissions,
}: {
  canCreate: boolean;
  candidate: CandidateRecord;
  submissions: SubmissionsListResponse;
}) => {
  const items = submissions.items;
  const activeCount = items.filter(
    (submission) => !terminalStages.has(submission.stage),
  ).length;
  const riskCount = items.filter(
    (submission) => submission.riskFlag !== "none",
  ).length;
  const clientFacingCount = items.filter((submission) =>
    clientFacingStages.has(submission.stage),
  ).length;
  const recentItems = items.slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-4" />
              Candidate pipeline
            </CardTitle>
            <CardDescription>
              Track every role this candidate is active for, with owner, stage,
              risk, and next step visible in one place.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="rounded-full" variant="outline">
              <TrackedLink href={`/pipeline?candidateId=${candidate.id}`}>
                View pipeline
              </TrackedLink>
            </Button>
            {canCreate ? (
              <Button asChild className="rounded-full">
                <TrackedLink
                  href={`/pipeline/new?candidateId=${candidate.id}&returnTo=candidate`}
                >
                  <Send className="size-4" />
                  Launch for role
                </TrackedLink>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PipelineSummaryMetric
            label="Total roles"
            value={submissions.pagination.totalItems}
          />
          <PipelineSummaryMetric label="Active" value={activeCount} />
          <PipelineSummaryMetric label="Attention" value={riskCount} />
          <PipelineSummaryMetric
            label="Client-facing"
            value={clientFacingCount}
          />
        </div>

        <CandidatePipelineStageRail submissions={items} />

        {recentItems.length > 0 ? (
          <div className="space-y-3">
            {recentItems.map((submission) => (
              <CandidatePipelineRow
                key={submission.id}
                candidateId={candidate.id}
                submission={submission}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-border bg-surface-1/60 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-muted-foreground" />
              No roles are moving for this candidate yet.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Launch the first role track when the profile, contact context, and
              target job are ready.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const hasDocumentCreatedFlag = (
  params: Record<string, string | string[] | undefined>,
) => {
  const documentCreated = params.documentCreated;

  return Array.isArray(documentCreated)
    ? documentCreated[0] === "1"
    : documentCreated === "1";
};

const hasSubmissionCreatedFlag = (
  params: Record<string, string | string[] | undefined>,
) => {
  const submissionCreated = params.submissionCreated;

  return Array.isArray(submissionCreated)
    ? submissionCreated[0] === "1"
    : submissionCreated === "1";
};

const CandidateDetailPage = async ({ params, searchParams }: PageProps) => {
  const { candidateId } = await params;
  const urlParams = await Promise.resolve(searchParams ?? {});
  const [{ candidate, context }, documentsList, candidateSubmissions] =
    await Promise.all([
      getCandidateDetail(candidateId),
      getCandidateDocuments(candidateId),
      getCandidateSubmissions(candidateId),
    ]);
  const ownerLabel =
    candidate.owner?.name ?? candidate.owner?.email ?? "Unassigned";
  const linkedinHref = normalizeExternalHref(candidate.linkedinUrl);
  const portfolioHref = normalizeExternalHref(candidate.portfolioUrl);

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        backHref="/candidates"
        breadcrumbItems={[
          { label: "Candidates", href: "/candidates" },
          { label: candidate.fullName },
        ]}
        kicker="Candidate overview"
        title={candidate.fullName}
        description={formatCandidateFocus(candidate)}
        rightSlot={
          <Button asChild className="rounded-full">
            <TrackedLink href={`/candidates/${candidate.id}/edit`}>
              <Pencil className="size-4" />
              Edit candidate
            </TrackedLink>
          </Button>
        }
      />

      {hasDocumentCreatedFlag(urlParams) ? (
        <p className="status-message status-success">
          Document metadata created and linked to this candidate.
        </p>
      ) : null}

      {hasSubmissionCreatedFlag(urlParams) ? (
        <p className="status-message status-success">
          Opportunity launched and linked to this candidate.
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                  {candidate.source ?? "Source pending"}
                </Badge>
                <Badge
                  className={
                    candidate.hasResume
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  }
                >
                  {candidate.hasResume ? "Resume ready" : "Resume missing"}
                </Badge>
                <Badge className="border-border/70 bg-surface-1 text-muted-foreground">
                  {context.role}
                </Badge>
              </div>
              <CardTitle className="text-2xl">Profile baseline</CardTitle>
              <CardDescription>
                Recruiter-owned facts that downstream submissions, documents,
                and AI summary work can reuse.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <DetailTile
                icon={<UserRound className="size-3.5" />}
                label="Owner"
                value={ownerLabel}
              />
              <DetailTile
                icon={<BriefcaseBusiness className="size-3.5" />}
                label="Current role"
                value={candidate.currentTitle ?? "No title captured yet"}
              />
              <DetailTile
                icon={<Building2 className="size-3.5" />}
                label="Company"
                value={candidate.currentCompany ?? "No company captured yet"}
              />
              <DetailTile
                icon={<MapPin className="size-3.5" />}
                label="Location"
                value={candidate.location ?? "No location captured yet"}
              />
              <DetailTile
                icon={<BriefcaseBusiness className="size-3.5" />}
                label="Salary expectation"
                value={
                  candidate.salaryExpectation ??
                  "Salary expectation not captured"
                }
              />
              <DetailTile
                icon={<CalendarClock className="size-3.5" />}
                label="Notice period"
                value={candidate.noticePeriod ?? "Notice period not captured"}
              />
            </CardContent>
          </Card>

          <TextPanel
            title="Skills and notes"
            description="Free-form candidate capability context. Structured matching remains downstream."
            fallback="No skills captured yet. Add practical skills, domain context, and screening notes from the edit form."
            icon={<Sparkles className="size-4" />}
            value={candidate.skillsText}
          />

          <TextPanel
            title="Summary"
            description="Human or future AI summary slot. AI generation is intentionally not part of RF-34."
            fallback="No candidate summary yet. AI summaries and retry states remain owned by the automation branch."
            icon={<Sparkles className="size-4" />}
            value={candidate.summary}
          />

          <DocumentsSection
            candidate={candidate}
            documents={documentsList.items}
          />
          <CandidatePipelineSummary
            canCreate={context.role !== "coordinator"}
            candidate={candidate}
            submissions={candidateSubmissions}
          />
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <CardDescription>
                Lightweight reachability fields before activity and notes land.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {candidate.email ? (
                <ContactLink
                  href={`mailto:${candidate.email}`}
                  icon={<Mail className="size-4" />}
                >
                  {candidate.email}
                </ContactLink>
              ) : null}

              {candidate.phone ? (
                <ContactLink
                  href={`tel:${candidate.phone}`}
                  icon={<Phone className="size-4" />}
                >
                  {candidate.phone}
                </ContactLink>
              ) : null}

              {linkedinHref ? (
                <ContactLink
                  href={linkedinHref}
                  icon={<Link2 className="size-4" />}
                >
                  LinkedIn profile
                </ContactLink>
              ) : null}

              {portfolioHref ? (
                <ContactLink
                  href={portfolioHref}
                  icon={<Link2 className="size-4" />}
                >
                  Portfolio
                </ContactLink>
              ) : null}

              {!candidate.email &&
              !candidate.phone &&
              !linkedinHref &&
              !portfolioHref ? (
                <div className="rounded-[1.35rem] border border-dashed border-border bg-surface-1/60 p-5">
                  <p className="text-sm font-medium text-foreground">
                    No contact methods captured yet.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Add email, phone, LinkedIn, or portfolio links from the edit
                    form before outreach-heavy workflows depend on this record.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>
                Basic record dates before activity aggregation lands.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailTile
                icon={<CalendarClock className="size-3.5" />}
                label="Created"
                value={formatDate(candidate.createdAt)}
              />
              <DetailTile
                icon={<CalendarClock className="size-3.5" />}
                label="Updated"
                value={formatDate(candidate.updatedAt)}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
};

export default CandidateDetailPage;

import type {
  ApiAutomationStatus,
  ApiDocumentType,
  CandidateDetailResponse,
  CandidateRecord,
  DocumentRecord,
  DocumentsListResponse,
} from "@recruitflow/contracts";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  FileText,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Send,
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

const FutureSubmissionsSlot = ({
  canCreate,
  candidateId,
}: {
  canCreate: boolean;
  candidateId: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Send className="size-4" />
        Opportunity launch
      </CardTitle>
      <CardDescription>
        Start a role track from this candidate context.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="rounded-[1.35rem] border border-dashed border-border bg-surface-1/60 p-5">
        <p className="text-sm font-medium text-foreground">
          Launch from candidate context.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This candidate profile is now a stable upstream target for
          candidate-role opportunities, stages, risk flags, and next steps.
        </p>
      </div>
      {canCreate ? (
        <Button asChild className="mt-4 w-full rounded-full">
          <TrackedLink
            href={`/pipeline/new?candidateId=${candidateId}&returnTo=candidate`}
          >
            <Send className="size-4" />
            Launch for role
          </TrackedLink>
        </Button>
      ) : null}
    </CardContent>
  </Card>
);

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
  const [{ candidate, context }, documentsList] = await Promise.all([
    getCandidateDetail(candidateId),
    getCandidateDocuments(candidateId),
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
          <FutureSubmissionsSlot
            canCreate={context.role !== "coordinator"}
            candidateId={candidate.id}
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

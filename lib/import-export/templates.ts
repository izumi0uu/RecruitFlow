export const importExportTemplateDefinitions = [
  {
    id: "candidates",
    title: "Candidates",
    domain: "Candidate CRM",
    filename: "recruitflow-candidates-import-template-v1.csv",
    description: "Approved profile fields for future candidate imports.",
    futureFlow:
      "Future import target: candidate create/update preview with owner and source checks.",
    headers: [
      "fullName",
      "email",
      "phone",
      "headline",
      "currentCompany",
      "currentTitle",
      "location",
      "salaryExpectation",
      "noticePeriod",
      "source",
      "linkedinUrl",
      "portfolioUrl",
      "skillsText",
      "ownerEmail",
    ],
    sample: {
      fullName: "Jane Lin",
      email: "jane.lin@example.com",
      phone: "415 555 0198",
      headline: "Principal Product Designer",
      currentCompany: "Northstar Health",
      currentTitle: "Design Lead",
      location: "San Francisco CA",
      salaryExpectation: "180000",
      noticePeriod: "30 days",
      source: "referral",
      linkedinUrl: "https://linkedin.com/in/janelin",
      portfolioUrl: "https://janelin.design",
      skillsText: "design systems; healthcare; research",
      ownerEmail: "recruiter@example.com",
    },
    guidance: {
      fullName: "required",
      email: "recommended unique match field",
      source: "required source label",
      ownerEmail: "workspace member email",
    },
  },
  {
    id: "clients",
    title: "Clients",
    domain: "Client CRM",
    filename: "recruitflow-clients-import-template-v1.csv",
    description: "Account baseline for future client company imports.",
    futureFlow:
      "Future import target: client upsert preview with ownership and priority mapping.",
    headers: [
      "name",
      "industry",
      "website",
      "hqLocation",
      "status",
      "priority",
      "ownerEmail",
      "primaryContactName",
      "primaryContactEmail",
      "lastContactedAt",
      "notesPreview",
    ],
    sample: {
      name: "Northstar Health",
      industry: "Healthcare",
      website: "https://northstar.example",
      hqLocation: "San Francisco CA",
      status: "active",
      priority: "high",
      ownerEmail: "owner@example.com",
      primaryContactName: "Mira Patel",
      primaryContactEmail: "mira.patel@example.com",
      lastContactedAt: "2026-05-01",
      notesPreview: "Hiring design leadership for growth team",
    },
    guidance: {
      name: "required company name",
      status: "active prospect paused archived",
      priority: "low medium high",
      ownerEmail: "workspace member email",
      lastContactedAt: "YYYY-MM-DD",
    },
  },
  {
    id: "jobs",
    title: "Jobs",
    domain: "Jobs Intake",
    filename: "recruitflow-jobs-import-template-v1.csv",
    description: "Requisition intake shape for future job imports.",
    futureFlow:
      "Future import target: job intake preview with client lookup and stage template assignment.",
    headers: [
      "clientName",
      "title",
      "department",
      "location",
      "employmentType",
      "status",
      "priority",
      "headcount",
      "salaryMin",
      "salaryMax",
      "currency",
      "ownerEmail",
      "openedAt",
      "targetFillDate",
      "intakeSummary",
    ],
    sample: {
      clientName: "Northstar Health",
      title: "Senior Product Designer",
      department: "Product",
      location: "Remote US",
      employmentType: "Full-time",
      status: "open",
      priority: "urgent",
      headcount: "2",
      salaryMin: "150000",
      salaryMax: "190000",
      currency: "USD",
      ownerEmail: "recruiter@example.com",
      openedAt: "2026-05-03",
      targetFillDate: "2026-06-14",
      intakeSummary: "Own provider workflow design and research synthesis",
    },
    guidance: {
      clientName: "must match or map to an existing client",
      title: "required",
      status: "intake open on_hold closed filled",
      priority: "low medium high urgent",
      ownerEmail: "workspace member email",
      openedAt: "YYYY-MM-DD",
      targetFillDate: "YYYY-MM-DD",
    },
  },
  {
    id: "documents",
    title: "Documents",
    domain: "Documents",
    filename: "recruitflow-documents-import-template-v1.csv",
    description:
      "Metadata-only shape for future document registration imports.",
    futureFlow:
      "Future import target: metadata registration preview after file upload/session mapping.",
    headers: [
      "entityType",
      "entityLookup",
      "type",
      "title",
      "sourceFilename",
      "mimeType",
      "sizeBytes",
      "storageReference",
      "ownerEmail",
    ],
    sample: {
      entityType: "candidate",
      entityLookup: "jane.lin@example.com",
      type: "resume",
      title: "Jane Lin Resume",
      sourceFilename: "jane-lin-resume.pdf",
      mimeType: "application/pdf",
      sizeBytes: "428000",
      storageReference: "upload-session-2026-05-03-resume-001",
      ownerEmail: "recruiter@example.com",
    },
    guidance: {
      entityType: "candidate job submission",
      entityLookup: "email title or controlled future lookup key",
      type: "jd resume call_note interview_note",
      title: "required display title",
      storageReference: "safe upload reference, not a raw storage key",
      ownerEmail: "workspace member email",
    },
  },
  {
    id: "pipeline-updates",
    title: "Pipeline Updates",
    domain: "Submission Pipeline",
    filename: "recruitflow-pipeline-updates-import-template-v1.csv",
    description: "Submission movement shape for future pipeline batch updates.",
    futureFlow:
      "Future import target: staged submission updates with conflict preview and audit events.",
    headers: [
      "candidateEmail",
      "jobTitle",
      "clientName",
      "stage",
      "riskFlag",
      "nextStep",
      "ownerEmail",
      "lastTouchAt",
      "notesPreview",
    ],
    sample: {
      candidateEmail: "jane.lin@example.com",
      jobTitle: "Senior Product Designer",
      clientName: "Northstar Health",
      stage: "client_interview",
      riskFlag: "timing_risk",
      nextStep: "Confirm client panel availability",
      ownerEmail: "recruiter@example.com",
      lastTouchAt: "2026-05-03",
      notesPreview: "Candidate can interview after 3pm PT",
    },
    guidance: {
      candidateEmail: "candidate lookup field",
      jobTitle: "job lookup field",
      clientName: "client lookup field",
      stage: "sourced screening submitted client_interview offer placed lost",
      riskFlag: "none timing_risk feedback_risk compensation_risk fit_risk",
      ownerEmail: "workspace member email",
      lastTouchAt: "YYYY-MM-DD",
    },
  },
] as const;

export type ImportExportTemplateDefinition =
  (typeof importExportTemplateDefinitions)[number];

export type ImportExportTemplateId = ImportExportTemplateDefinition["id"];

const csvFormulaInjectionPattern = /^[=+\-@\t\r]/;

const normalizeCsvValue = (value: string) => {
  if (csvFormulaInjectionPattern.test(value)) {
    return `'${value}`;
  }

  return value;
};

const encodeCsvCell = (value: string) => {
  const normalizedValue = normalizeCsvValue(value);

  if (/[",\r\n]/.test(normalizedValue)) {
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  return normalizedValue;
};

export const getImportExportTemplateDefinition = (templateId: string) =>
  importExportTemplateDefinitions.find(
    (template) => template.id === templateId,
  );

export const getImportExportTemplateCsv = (
  template: ImportExportTemplateDefinition,
) => {
  const sample = template.sample as Partial<Record<string, string>>;
  const guidance = template.guidance as Partial<Record<string, string>>;
  const headers = ["__row_type", "__notes", ...template.headers];
  const exampleRow = [
    "example",
    "Replace this row with data rows when the future importer is enabled.",
    ...template.headers.map((header) => sample[header] ?? ""),
  ];
  const guidanceRow = [
    "guidance",
    template.futureFlow,
    ...template.headers.map((header) => guidance[header] ?? "optional"),
  ];

  return [headers, exampleRow, guidanceRow]
    .map((row) => row.map(encodeCsvCell).join(","))
    .join("\r\n")
    .concat("\r\n");
};

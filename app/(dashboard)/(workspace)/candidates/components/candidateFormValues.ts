export type CandidateFormValues = {
  currentCompany: string;
  currentTitle: string;
  email: string;
  fullName: string;
  headline: string;
  linkedinUrl: string;
  location: string;
  noticePeriod: string;
  ownerUserId: string;
  phone: string;
  portfolioUrl: string;
  salaryExpectation: string;
  skillsText: string;
  source: string;
};

export const emptyCandidateFormValues: CandidateFormValues = {
  currentCompany: "",
  currentTitle: "",
  email: "",
  fullName: "",
  headline: "",
  linkedinUrl: "",
  location: "",
  noticePeriod: "",
  ownerUserId: "",
  phone: "",
  portfolioUrl: "",
  salaryExpectation: "",
  skillsText: "",
  source: "",
};

export const buildCandidateFormValues = (
  values: Partial<CandidateFormValues>,
): CandidateFormValues => ({
  ...emptyCandidateFormValues,
  ...values,
});

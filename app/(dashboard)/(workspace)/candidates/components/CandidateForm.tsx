"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import type { CandidatesListOwnerOption } from "@recruitflow/contracts";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import type {
  CandidateFormState,
  CandidateFormValues,
} from "../actions";

type CandidateFormAction = (
  previousState: CandidateFormState,
  formData: FormData,
) => Promise<CandidateFormState>;

type CandidateFormProps = {
  action: CandidateFormAction;
  candidateId?: string;
  initialValues: CandidateFormValues;
  mode: "create" | "edit";
  ownerOptions: CandidatesListOwnerOption[];
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

export const CandidateForm = ({
  action,
  candidateId,
  initialValues,
  mode,
  ownerOptions,
}: CandidateFormProps) => {
  const [state, formAction, isPending] = useActionState<
    CandidateFormState,
    FormData
  >(action, {});
  const values = {
    ...initialValues,
    ...(state.values ?? {}),
  };

  return (
    <form action={formAction} className="space-y-6">
      {candidateId ? (
        <input type="hidden" name="candidateId" value={candidateId} />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="fullName">Candidate name</Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder="Nina Patel"
            defaultValue={values.fullName}
            required
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Use the name recruiters, submissions, and document workflows should
            share.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerUserId">Candidate owner</Label>
          <select
            id="ownerUserId"
            className="input"
            name="ownerUserId"
            defaultValue={values.ownerUserId}
            required
          >
            <option value="" disabled>
              Select owner
            </option>
            {ownerOptions.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name ?? owner.email}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            name="source"
            placeholder="Referral, LinkedIn, inbound..."
            defaultValue={values.source}
            required
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            name="headline"
            placeholder="Senior full-stack engineer with platform experience"
            defaultValue={values.headline}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nina@example.com"
            defaultValue={values.email}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="+1 555 0199"
            defaultValue={values.phone}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentCompany">Current company</Label>
          <Input
            id="currentCompany"
            name="currentCompany"
            placeholder="Acme Robotics"
            defaultValue={values.currentCompany}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentTitle">Current title</Label>
          <Input
            id="currentTitle"
            name="currentTitle"
            placeholder="Staff Software Engineer"
            defaultValue={values.currentTitle}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            placeholder="Austin, TX or Remote"
            defaultValue={values.location}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="salaryExpectation">Salary expectation</Label>
          <Input
            id="salaryExpectation"
            name="salaryExpectation"
            placeholder="$170k base"
            defaultValue={values.salaryExpectation}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="noticePeriod">Notice period</Label>
          <Input
            id="noticePeriod"
            name="noticePeriod"
            placeholder="2 weeks"
            defaultValue={values.noticePeriod}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          <Input
            id="linkedinUrl"
            name="linkedinUrl"
            placeholder="linkedin.com/in/nina"
            defaultValue={values.linkedinUrl}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="portfolioUrl">Portfolio URL</Label>
          <Input
            id="portfolioUrl"
            name="portfolioUrl"
            placeholder="https://portfolio.example"
            defaultValue={values.portfolioUrl}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="skillsText">Skills</Label>
          <textarea
            id="skillsText"
            className="input min-h-32 resize-y py-3"
            name="skillsText"
            placeholder="React, TypeScript, platform APIs, accessibility..."
            defaultValue={values.skillsText}
          />
        </div>
      </div>

      {state.error ? (
        <p className="status-message status-error">{state.error}</p>
      ) : null}

      <p className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
        Candidate profile edits are non-destructive and available to workspace
        coordinators, recruiters, and owners. Archive or deletion controls are
        intentionally not part of this flow.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="rounded-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : mode === "create" ? (
            "Create candidate"
          ) : (
            "Save candidate"
          )}
        </Button>
        <Button asChild type="button" variant="outline" className="rounded-full">
          <TrackedLink href="/candidates">Cancel</TrackedLink>
        </Button>
      </div>
    </form>
  );
};

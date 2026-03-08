import React from "react";
import type { AdTemplateProps } from "./BeforeAfterTemplate";
import { BeforeAfterTemplate } from "./BeforeAfterTemplate";
import { PainSolutionTemplate } from "./PainSolutionTemplate";
import { StatProofTemplate } from "./StatProofTemplate";

interface TemplateRendererProps extends AdTemplateProps {
  templateType: string;
}

const TEMPLATES: Record<string, React.ComponentType<AdTemplateProps>> = {
  before_after: BeforeAfterTemplate,
  pain_solution: PainSolutionTemplate,
  stat_proof: StatProofTemplate,
};

export function TemplateRenderer({ templateType, ...props }: TemplateRendererProps) {
  const Component = TEMPLATES[templateType] || PainSolutionTemplate;
  return <Component {...props} />;
}

export const TEMPLATE_OPTIONS = [
  { value: "before_after", label: "Before / After", description: "Split layout comparing pain state vs. desired outcome" },
  { value: "pain_solution", label: "Pain → Solution", description: "Bold headline with pain point, solution body, strong CTA" },
  { value: "stat_proof", label: "Stat / Social Proof", description: "Big number or statistic with supporting context" },
];

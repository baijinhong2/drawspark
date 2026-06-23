import { LegalPage, generateLegalMetadata } from "@/components/LegalPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  return generateLegalMetadata({ doc: "terms", params });
}

export default function TermsPage({ params }: Props) {
  return <LegalPage doc="terms" params={params} />;
}

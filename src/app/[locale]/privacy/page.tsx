import { LegalPage, generateLegalMetadata } from "@/components/LegalPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  return generateLegalMetadata({ doc: "privacy", params });
}

export default function PrivacyPage({ params }: Props) {
  return <LegalPage doc="privacy" params={params} />;
}

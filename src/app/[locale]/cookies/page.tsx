import { LegalPage, generateLegalMetadata } from "@/components/LegalPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  return generateLegalMetadata({ doc: "cookies", params });
}

export default function CookiesPage({ params }: Props) {
  return <LegalPage doc="cookies" params={params} />;
}

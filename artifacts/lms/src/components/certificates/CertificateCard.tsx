import { Award, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLmsCertificate, useLmsGenerateCertificate } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

interface CertificateCardProps {
  subjectId: number;
  subjectTitle: string;
  percentComplete: number;
  compact?: boolean;
}

export function CertificateCard({ subjectId, subjectTitle, percentComplete, compact }: CertificateCardProps) {
  const { data, isLoading } = useLmsCertificate(subjectId);
  const generate = useLmsGenerateCertificate(subjectId);
  const cert = data?.certificate;
  const isComplete = percentComplete === 100;

  if (compact) {
    if (!cert) return null;
    return (
      <a
        href={cert.certificateUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline"
      >
        <Award className="w-3.5 h-3.5" /> Download Certificate
      </a>
    );
  }

  if (!isComplete) return null;

  if (isLoading) {
    return (
      <div className="rounded-xl border p-4 flex items-center gap-3 bg-amber-50 border-amber-200">
        <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
        <span className="text-sm text-amber-700">Checking certificate...</span>
      </div>
    );
  }

  if (cert) {
    return (
      <div className={cn(
        "rounded-xl border p-4 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-sm"
      )}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-amber-900">Certificate Earned!</p>
            <p className="text-xs text-amber-700">
              Issued {new Date(cert.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
        <a href={cert.certificateUrl} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 gap-2 shrink-0">
            <Download className="w-4 h-4" /> Download
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-sm text-amber-900">Course Completed!</p>
          <p className="text-xs text-amber-700">Generate your certificate of completion</p>
        </div>
      </div>
      <Button
        size="sm"
        className="bg-amber-500 hover:bg-amber-600 text-white gap-2 shrink-0"
        onClick={() => generate.mutate()}
        disabled={generate.isPending}
      >
        {generate.isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
        ) : (
          <><Award className="w-4 h-4" /> Get Certificate</>
        )}
      </Button>
      {generate.isError && (
        <p className="text-xs text-red-600 mt-1">{(generate.error as Error).message}</p>
      )}
    </div>
  );
}

interface CertificateBadgeProps {
  issuedAt: string;
  certificateUrl: string;
}

export function CertificateBadge({ issuedAt, certificateUrl }: CertificateBadgeProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-amber-600" />
        <div>
          <p className="text-xs font-semibold text-amber-900">Certificate of Completion</p>
          <p className="text-xs text-amber-600">
            {new Date(issuedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
      <a href={certificateUrl} target="_blank" rel="noreferrer">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-700 hover:bg-amber-100 gap-1">
          <Download className="w-3.5 h-3.5" />
          <span className="text-xs">Download</span>
        </Button>
      </a>
    </div>
  );
}

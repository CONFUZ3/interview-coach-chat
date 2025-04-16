
import { Button } from "@/components/ui/button";
import { DownloadCloud } from "lucide-react";

interface ResumeActionsProps {
  hasResume: boolean;
  onDownloadPDF: () => void;
}

export default function ResumeActions({ hasResume, onDownloadPDF }: ResumeActionsProps) {
  if (!hasResume) return null;
  
  return (
    <div className="mb-3 flex justify-end">
      <Button
        variant="outline"
        className="ml-auto"
        onClick={onDownloadPDF}
      >
        <DownloadCloud className="h-5 w-5 mr-1" /> Download as PDF
      </Button>
    </div>
  );
}

import { BulkUpload } from "@/components/admin/BulkUpload";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Bulk upload" };

export default function UploadPage() {
  return (
    <>
      <PageHeader
        title="Bulk upload"
        description="Import many questions and their answers from an Excel workbook (.xlsx) or a JSON file. Every question is validated in the browser and again on the server."
      />
      <BulkUpload />
    </>
  );
}

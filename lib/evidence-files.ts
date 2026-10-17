import { MAX_SOURCE_IMAGE_BYTES, optimizeEvidenceImage } from "./evidence-images";

const DOCUMENT_TYPES = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

/** Persist the formats already offered by Audit and Action evidence inputs. */
export async function readEvidenceFile(file: File): Promise<{ dataUrl: string; size: number }> {
  if (file.type.startsWith("image/")) return optimizeEvidenceImage(file);
  if (!DOCUMENT_TYPES.has(file.type) && !(file.type === "" && /\.(pdf|doc|docx)$/i.test(file.name))) throw new Error("Choose an image, PDF or Word document.");
  if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error("File is too large. Please choose a file smaller than 8 MB.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const fail = () => reject(new Error("Unable to read this evidence file. Please try again."));
    reader.onload = () => typeof reader.result === "string" && reader.result.startsWith("data:") ? resolve(reader.result) : fail();
    reader.onerror = fail;
    reader.onabort = fail;
    reader.readAsDataURL(file);
  });
  return { dataUrl, size: file.size };
}

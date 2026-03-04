/**
 * Extração de texto de PDF para uso pelo assistente e atendente.
 * Funciona em Deno (Supabase Edge). Usa unpdf (PDF.js serverless).
 */

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_EXTRACTED_TEXT_LENGTH = 11000; // caracteres para caber no contexto do LLM

/**
 * Extrai texto de um PDF a partir dos bytes (ArrayBuffer ou Uint8Array).
 * Retorna string vazia se falhar ou se o arquivo não for PDF válido.
 */
export async function extractTextFromPdf(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (buffer.length === 0 || buffer.length > MAX_PDF_BYTES) return "";

  try {
    const { extractText, getDocumentProxy } = await import("https://esm.sh/unpdf@1.4.0?target=deno");
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });
    const cleaned = (text || "").replace(/\s+/g, " ").trim();
    return cleaned.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
  } catch (_e) {
    return "";
  }
}

/**
 * Verifica se o mimetype ou nome do arquivo indica PDF.
 */
export function isPdfMimetype(mimetype: string | undefined): boolean {
  if (!mimetype) return false;
  const m = mimetype.toLowerCase();
  return m === "application/pdf" || m.endsWith("/pdf");
}

export function isPdfFileName(fileName: string | undefined): boolean {
  if (!fileName) return false;
  return fileName.toLowerCase().endsWith(".pdf");
}

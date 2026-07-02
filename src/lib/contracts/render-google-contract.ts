/**
 * Renders a membership contract PDF using a Google Docs template.
 *
 * Flow:
 *   1. Export the Google Doc template as DOCX bytes (Google Drive API)
 *   2. Fill {{placeholders}} with docxtemplater (in memory, no storage needed)
 *   3. Convert filled DOCX → PDF via CloudConvert API
 *   4. Overlay signature images with pdf-lib
 */

import { google } from 'googleapis'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import CloudConvert from 'cloudconvert'
import { PDFDocument } from 'pdf-lib'

export interface GoogleContractParams {
  language: 'en' | 'es'
  contractFields: {
    full_name: string
    date_of_birth?: string
    phone?: string
    email?: string
    address: string
    city_state: string
    start_date: string
  }
  paymentMethod: 'credit' | 'debit'
  cardLast4: string
  signatureImage?: string | null
  adminSignatureImage?: string | null
  signedAt?: string | null
  adminSignedAt?: string | null
}

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

function parseDataURL(dataURL: string): Uint8Array | null {
  try {
    const base64 = dataURL.includes(',') ? dataURL.split(',')[1] : dataURL
    if (!base64) return null
    return new Uint8Array(Buffer.from(base64, 'base64'))
  } catch {
    return null
  }
}

async function exportDocxFromDrive(fileId: string): Promise<Buffer> {
  // Support both plain JSON and base64-encoded JSON (base64 avoids newline issues in Vercel)
  const rawB64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64
  const rawPlain = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!rawB64 && !rawPlain) throw new Error(`Both GOOGLE_SERVICE_ACCOUNT_JSON_B64 and GOOGLE_SERVICE_ACCOUNT_JSON are missing. Env keys present: ${Object.keys(process.env).filter(k=>k.startsWith('GOOGLE')).join(', ')}`)
  const raw = rawB64 ? Buffer.from(rawB64, 'base64').toString('utf8') : rawPlain!

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  const drive = google.drive({ version: 'v3', auth })

  const response = await drive.files.export(
    {
      fileId,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    { responseType: 'arraybuffer' }
  )

  return Buffer.from(response.data as ArrayBuffer)
}

function fillDocxTemplate(
  docxBytes: Buffer,
  data: Record<string, string>
): Buffer {
  const zip = new PizZip(docxBytes)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  })
  doc.render(data)
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}

async function convertDocxToPdf(docxBytes: Buffer): Promise<Buffer> {
  const apiKey = process.env.CLOUDCONVERT_API_KEY
  if (!apiKey) throw new Error('CLOUDCONVERT_API_KEY env var is not set')

  const cloudConvert = new CloudConvert(apiKey)

  // Create a job with two tasks: upload + convert
  const job = await cloudConvert.jobs.create({
    tasks: {
      'upload-docx': {
        operation: 'import/upload',
      },
      'convert-to-pdf': {
        operation: 'convert',
        input: 'upload-docx',
        input_format: 'docx',
        output_format: 'pdf',
      },
      'export-pdf': {
        operation: 'export/url',
        input: 'convert-to-pdf',
      },
    },
  })

  // Upload the DOCX
  const uploadTask = job.tasks.find((t) => t.name === 'upload-docx')
  if (!uploadTask) throw new Error('CloudConvert upload task not found')

  await cloudConvert.tasks.upload(
    uploadTask,
    new Blob([new Uint8Array(docxBytes)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    'contract.docx'
  )

  // Wait for the job to finish
  const finished = await cloudConvert.jobs.wait(job.id)

  // Get the export URL
  const exportTask = finished.tasks.find((t) => t.name === 'export-pdf')
  const fileUrl = exportTask?.result?.files?.[0]?.url
  if (!fileUrl) throw new Error('CloudConvert export URL not found')

  // Download the PDF
  const pdfResponse = await fetch(fileUrl)
  if (!pdfResponse.ok) throw new Error('Failed to download PDF from CloudConvert')

  return Buffer.from(await pdfResponse.arrayBuffer())
}

export async function renderGoogleContract(
  params: GoogleContractParams
): Promise<Buffer> {
  const {
    language,
    contractFields,
    paymentMethod,
    cardLast4,
    signatureImage,
    adminSignatureImage,
    signedAt,
    adminSignedAt,
  } = params

  const TEMPLATE_IDS: Record<string, string> = {
    es: process.env.GOOGLE_CONTRACT_TEMPLATE_ID_ES ?? '1QKEmNRFsD7tC4G6WM8RXvxngWjd7XgZiv9EH_4rEPkk',
    en: process.env.GOOGLE_CONTRACT_TEMPLATE_ID_EN ?? '',
  }
  const templateId = TEMPLATE_IDS[language]
  if (!templateId) throw new Error(`No Google Docs template configured for language: ${language}`)

  const locale = language === 'es' ? 'es-US' : 'en-US'
  const clientDate = formatDate(signedAt, locale)
  const adminDate  = formatDate(adminSignedAt, locale)

  const paymentMethodDisplay =
    language === 'es'
      ? paymentMethod === 'credit'
        ? '☑ Tarjeta de Crédito   ☐ Tarjeta de Débito'
        : '☐ Tarjeta de Crédito   ☑ Tarjeta de Débito'
      : paymentMethod === 'credit'
        ? '☑ Credit Card   ☐ Debit Card'
        : '☐ Credit Card   ☑ Debit Card'

  const templateData: Record<string, string> = {
    full_name:       contractFields.full_name,
    dob:             contractFields.date_of_birth ?? '',
    phone:           contractFields.phone         ?? '',
    email:           contractFields.email         ?? '',
    address:         contractFields.address,
    city_state:      contractFields.city_state,
    start_date:      contractFields.start_date,
    payment_method:  paymentMethodDisplay,
    card_last4:      cardLast4,
    cardholder_date: clientDate,
    client_date:     clientDate,
    rep_date:        adminDate,
  }

  // 1. Export Google Doc as DOCX
  const docxBytes = await exportDocxFromDrive(templateId)

  // 2. Fill placeholders
  const filledDocx = fillDocxTemplate(docxBytes, templateData)

  // 3. Convert to PDF
  let pdfBuffer = await convertDocxToPdf(filledDocx)

  // 4. Overlay signature images if provided
  if (signatureImage || adminSignatureImage) {
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pages  = pdfDoc.getPages()

    // Signatures span two pages:
    //   page[-2]: "Firma del Titular"  → cardholder sig at y≈30%
    //   page[-1]: "Firma del Cliente"  → client sig at y≈90%
    //             "Representante VM"   → rep sig at y≈80%
    const secondLast = pages[pages.length - 2]
    const lastPage   = pages[pages.length - 1]

    const drawSig = async (
      page: (typeof pages)[0],
      dataURL: string,
      yFraction: number,
      xFraction: number,
      wFraction: number,
      hPt: number
    ) => {
      const bytes = parseDataURL(dataURL)
      if (!bytes) return
      try {
        const img = await pdfDoc.embedPng(bytes)
        const { width, height } = page.getSize()
        page.drawImage(img, {
          x:      width  * xFraction,
          y:      height * yFraction,
          width:  width  * wFraction,
          height: hPt,
        })
      } catch { /* skip if embed fails */ }
    }

    if (signatureImage) {
      await drawSig(secondLast, signatureImage, 0.30, 0.30, 0.37, 24) // Firma del Titular
      await drawSig(lastPage,   signatureImage, 0.90, 0.30, 0.37, 24) // Firma del Cliente
    }
    if (adminSignatureImage) {
      await drawSig(lastPage, adminSignatureImage, 0.80, 0.62, 0.32, 24) // Representante VM
    }

    pdfBuffer = Buffer.from(await pdfDoc.save())
  }

  return pdfBuffer
}

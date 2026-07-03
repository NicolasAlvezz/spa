/**
 * Renders a membership contract PDF using a committed DOCX template.
 *
 * Flow:
 *   1. Load the DOCX template from the filesystem (committed to repo)
 *   2. Fill {{placeholders}} with docxtemplater (text fields)
 *   3. Embed {%signature_client} and {%signature_rep} images via docxtemplater-image-module-free
 *   4. Convert filled DOCX → PDF via CloudConvert API
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import CloudConvert from 'cloudconvert'
import { createClient } from '@supabase/supabase-js'

export interface GoogleContractParams {
  language: 'en' | 'es'
  planSlug?: string
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

function parseDataURL(dataURL: string): Buffer | null {
  try {
    const base64 = dataURL.includes(',') ? dataURL.split(',')[1] : dataURL
    if (!base64) return null
    return Buffer.from(base64, 'base64')
  } catch {
    return null
  }
}

function loadDocxTemplate(language: string, planSlug?: string): Buffer {
  const filename = planSlug && planSlug !== 'basic'
    ? `template-${planSlug}-${language}.docx`
    : `template-${language}.docx`
  const templatePath = join(process.cwd(), 'src', 'lib', 'contracts', filename)
  return readFileSync(templatePath)
}

function fillDocxTemplate(
  docxBytes: Buffer,
  data: Record<string, string>
): Buffer {
  const zip = new PizZip(docxBytes)

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ImageModule = require('docxtemplater-image-module-free')
  const imageModule = new ImageModule({
    centered: false,
    getImage(tagValue: string) {
      if (!tagValue) return null
      return parseDataURL(tagValue)
    },
    getSize() {
      // Width x height in pixels — adjust if signatures look too big/small
      return [200, 50]
    },
  })

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    modules: [imageModule],
  })
  doc.render(data)
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}

async function getCloudConvertApiKey(): Promise<string> {
  if (process.env.CLOUDCONVERT_API_KEY) return process.env.CLOUDCONVERT_API_KEY

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'cloudconvert_api_key')
    .single()

  if (error || !data?.value) throw new Error('CloudConvert API key not found in env or app_settings')
  return data.value
}

async function convertDocxToPdf(docxBytes: Buffer): Promise<Buffer> {
  const apiKey = await getCloudConvertApiKey()

  const cloudConvert = new CloudConvert(apiKey)

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

  const uploadTask = job.tasks.find((t) => t.name === 'upload-docx')
  if (!uploadTask) throw new Error('CloudConvert upload task not found')

  await cloudConvert.tasks.upload(
    uploadTask,
    new Blob([new Uint8Array(docxBytes)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    'contract.docx'
  )

  const finished = await cloudConvert.jobs.wait(job.id)

  const exportTask = finished.tasks.find((t) => t.name === 'export-pdf')
  const fileUrl = exportTask?.result?.files?.[0]?.url
  if (!fileUrl) throw new Error('CloudConvert export URL not found')

  const pdfResponse = await fetch(fileUrl)
  if (!pdfResponse.ok) throw new Error('Failed to download PDF from CloudConvert')

  return Buffer.from(await pdfResponse.arrayBuffer())
}

export async function renderGoogleContract(
  params: GoogleContractParams
): Promise<Buffer> {
  const {
    language,
    planSlug,
    contractFields,
    paymentMethod,
    cardLast4,
    signatureImage,
    adminSignatureImage,
    signedAt,
    adminSignedAt,
  } = params

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
    // Image placeholders — docxtemplater-image-module-free picks these up via {%key}
    signature_client: signatureImage      ?? '',
    signature_rep:    adminSignatureImage ?? '',
  }

  // 1. Load DOCX template from filesystem
  const docxBytes = loadDocxTemplate(language, planSlug)

  // 2. Fill text placeholders + embed signature images
  const filledDocx = fillDocxTemplate(docxBytes, templateData)

  // 3. Convert to PDF
  const pdfBuffer = await convertDocxToPdf(filledDocx)

  return pdfBuffer
}

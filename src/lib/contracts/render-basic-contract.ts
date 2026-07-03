/**
 * Renders the Basic Membership Contract PDF using slide PNG backgrounds.
 *
 * Each page = one PPTX-exported PNG as full-page background.
 * Fillable field values are overlaid at exact pixel coordinates (see basic-contract-config.ts).
 * To update the visual design, replace the PNG files in public/contracts/basic/{lang}/.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import path from 'path'
import fs from 'fs'
import {
  getBasicCoords,
  FieldCoord,
  SigCoord,
  IMG_W,
  IMG_H,
  PDF_W,
  PDF_H,
} from './basic-contract-config'

export interface BasicContractRenderParams {
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
  signatureImage?: string | null      // client canvas sig (data URL or base64)
  adminSignatureImage?: string | null // admin canvas sig (data URL or base64)
  signedAt?: string | null            // client signed_at ISO timestamp
  adminSignedAt?: string | null       // admin signed_at ISO timestamp
}

// Convert image-pixel (x, y from top-left) → PDF points (y from bottom-left)
function imgToPDF(coord: FieldCoord): { x: number; y: number } {
  return {
    x: coord.x * (PDF_W / IMG_W),
    y: (IMG_H - coord.y) * (PDF_H / IMG_H),
  }
}

function scaleW(imgPx: number): number {
  return imgPx * (PDF_W / IMG_W)
}
function scaleH(imgPx: number): number {
  return imgPx * (PDF_H / IMG_H)
}

// Parse base64 data URL into raw bytes
function parseDataURL(dataURL: string): Uint8Array | null {
  try {
    const base64 = dataURL.includes(',') ? dataURL.split(',')[1] : dataURL
    if (!base64) return null
    return new Uint8Array(Buffer.from(base64, 'base64'))
  } catch {
    return null
  }
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

export async function renderBasicMembershipContract(
  params: BasicContractRenderParams
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

  const coords = getBasicCoords(language)
  const slideDir = path.join(process.cwd(), 'public', 'contracts', 'basic', language)

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontSize = 12
  const textColor = rgb(0, 0, 0)

  const locale = language === 'es' ? 'es-US' : 'en-US'
  const clientDate = formatDate(signedAt, locale)
  const adminDate  = formatDate(adminSignedAt, locale)

  // Pre-parse signature images once (they appear on multiple slides)
  let clientSigBytes:  Uint8Array | null = null
  let adminSigBytes:   Uint8Array | null = null
  if (signatureImage)      clientSigBytes = parseDataURL(signatureImage)
  if (adminSignatureImage) adminSigBytes  = parseDataURL(adminSignatureImage)

  for (let slideNum = 1; slideNum <= 6; slideNum++) {
    const pngPath = path.join(slideDir, `slide-${slideNum}.png`)
    const pngBytes = fs.readFileSync(pngPath)
    const slideImg = await pdfDoc.embedPng(pngBytes)

    const page = pdfDoc.addPage([PDF_W, PDF_H])

    // Full-page background
    page.drawImage(slideImg, { x: 0, y: 0, width: PDF_W, height: PDF_H })

    const drawText = (text: string, coord: FieldCoord) => {
      if (!text) return
      const { x, y } = imgToPDF(coord)
      if (coord.whiteBg) {
        page.drawRectangle({
          x: x - 2,
          y: y - 4,
          width: font.widthOfTextAtSize(text, fontSize) + 4,
          height: fontSize + 6,
          color: rgb(1, 1, 1),
        })
      }
      page.drawText(text, { x, y, font, size: fontSize, color: textColor })
    }

    const drawSig = async (
      bytes: Uint8Array | null,
      sig: SigCoord
    ) => {
      if (!bytes) return
      try {
        const embedded = await pdfDoc.embedPng(bytes)
        const pdfX = scaleW(sig.x)
        // sig.y is the TOP of the sig area in image px; PDF y is from bottom
        const pdfYBottom = (IMG_H - sig.y - sig.h) * (PDF_H / IMG_H)
        const pdfW = scaleW(sig.w)
        const pdfHh = scaleH(sig.h)
        page.drawImage(embedded, {
          x: pdfX,
          y: pdfYBottom,
          width: pdfW,
          height: pdfHh,
        })
      } catch {
        // Silently skip if image embed fails (e.g. JPEG sig on PNG embed path)
      }
    }

    // ── Slide 3: client info ─────────────────────────────────────────────────
    if (slideNum === 3) {
      const c = coords.slide3
      drawText(contractFields.full_name,          c.full_name)
      drawText(contractFields.date_of_birth ?? '', c.dob)
      drawText(contractFields.phone        ?? '', c.phone)
      drawText(contractFields.email        ?? '', c.email)
      drawText(contractFields.address,             c.address)
      drawText(contractFields.city_state,          c.city_state)
    }

    // ── Slide 6: payment details + signatures ────────────────────────────────
    if (slideNum === 6) {
      const c = coords.slide6

      drawText(contractFields.start_date, c.start_date)

      // Payment method checkmark
      const checkCoord =
        paymentMethod === 'credit' ? c.checkbox_credit : c.checkbox_debit
      drawText('X', checkCoord)

      drawText(cardLast4, c.card_last4)

      // Dates
      drawText(clientDate, c.cardholder_date)
      drawText(clientDate, c.client_date)
      drawText(adminDate,  c.rep_date)

      // Signature images
      await drawSig(clientSigBytes, c.cardholder_sig)
      await drawSig(clientSigBytes, c.client_sig)
      await drawSig(adminSigBytes,  c.rep_sig)
    }
  }

  const uint8 = await pdfDoc.save()
  return Buffer.from(uint8)
}

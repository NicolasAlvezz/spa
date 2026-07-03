// Pixel coordinates for overlaying field values onto slide PNG backgrounds.
// All coords are in image pixel space (1125 × 2001).
// To update: open public/contracts/basic/{lang}/slide-N.png, measure the
// blank-line or label-end position, and edit these values.

export interface FieldCoord {
  x: number      // pixels from left edge of 1125×2001 image
  y: number      // pixels from top edge of 1125×2001 image (baseline of text)
  whiteBg?: true // draw a white rect behind the text to erase overlapping background
}

export interface SigCoord {
  x: number // left edge of signature image area (px)
  y: number // TOP edge of signature image area (px)
  w: number // width  (px)
  h: number // height (px)
}

export interface BasicContractCoords {
  slide3: {
    full_name:  FieldCoord
    dob:        FieldCoord
    phone:      FieldCoord
    email:      FieldCoord
    address:    FieldCoord
    city_state: FieldCoord
  }
  slide6: {
    start_date:      FieldCoord
    checkbox_credit: FieldCoord // draw "X" here when payment_method === 'credit'
    checkbox_debit:  FieldCoord // draw "X" here when payment_method === 'debit'
    card_last4:      FieldCoord
    cardholder_sig:  SigCoord   // client signature image
    cardholder_date: FieldCoord
    client_sig:      SigCoord   // client signature image (second occurrence)
    client_date:     FieldCoord
    rep_sig:         SigCoord   // admin signature image
    rep_date:        FieldCoord
  }
}

// Source image size (both ES and EN exports are identical dimensions)
export const IMG_W = 1125
export const IMG_H = 2001

// PDF page size in points (matches PPTX 7.5" × 13.33" at 72 dpi)
export const PDF_W = 540
export const PDF_H = 960

// ── Spanish coordinates ─────────────────────────────────────────────────────

export const BASIC_COORDS_ES: BasicContractCoords = {
  slide3: {
    // "Nombre Completo:" label is above the blank; text sits on the blank line
    full_name:  { x:  90, y: 703 },
    // Remaining fields: label + blank on same line; x is after the label text
    dob:        { x: 432, y: 793 },
    phone:      { x: 223, y: 883 },
    email:      { x: 388, y: 973 },
    address:    { x: 234, y: 1063 },
    city_state: { x: 323, y: 1153 },
  },
  slide6: {
    // "Fecha de Inicio: ___ / ___ / ___" — blank starts at x≈315, y≈340
    start_date:      { x: 315, y: 335 },
    // □ box borders at y=604/626 (credit) and y=626/649 (debit); X baseline inside box
    checkbox_credit: { x:  64, y: 612 },
    checkbox_debit:  { x:  64, y: 635 },
    // "Últimos 4 dígitos de la tarjeta: ___" — blank underline at x=339-530, y≈795
    // whiteBg erases "la tarjeta:" label text that overlaps the blank area in the PPTX design
    card_last4:      { x: 343, y: 778, whiteBg: true },
    // "Firma del Titular: ___" — blank from x≈315, underline at y=1146
    cardholder_sig:  { x: 315, y: 1086, w: 320, h: 58 },
    // "Fecha:" label ends at ≈147; underline at y=1226
    cardholder_date: { x: 167, y: 1211 },
    // "Firma del Cliente: ___" — blank from x≈326, underline at y=1566
    client_sig:      { x: 326, y: 1506, w: 360, h: 58 },
    // "Fecha:" label ends at ≈147; underline at y=1646
    client_date:     { x: 167, y: 1631 },
    // "Representante de VM Integral Massage: ___" — blank from x≈611; underline at y=1756
    rep_sig:         { x: 611, y: 1696, w: 280, h: 58 },
    // "Fecha:" label ends at ≈147; underline at y=1846
    rep_date:        { x: 167, y: 1831 },
  },
}

// ── English coordinates ──────────────────────────────────────────────────────

export const BASIC_COORDS_EN: BasicContractCoords = {
  slide3: {
    // "Full Name: ___" — label "Full Name:" ends at x≈333; blank starts at x≈356
    full_name:  { x: 358, y: 503 },
    // Remaining: label + blank on same line
    dob:        { x: 290, y: 840 },
    phone:      { x: 345, y: 930 },
    email:      { x: 382, y: 1020 },
    address:    { x: 375, y: 1110 },
    city_state: { x: 248, y: 1200 },
  },
  slide6: {
    // "Start Date: __ / __ / __" — label ends at x≈276; baseline at y≈492
    start_date:      { x: 280, y: 484 },
    // "□ Credit Card" box borders at y=758/780; "□ Debit Card" at y=803/825
    checkbox_credit: { x:  64, y: 764 },
    checkbox_debit:  { x:  64, y: 809 },
    // "Last 4 Digits of Card: ___" — blank segment at x=382–486; baseline at y≈852
    card_last4:      { x: 385, y: 842 },
    // "Cardholder Signature:" heading at y≈1150; blank underline at y=1234
    cardholder_sig:  { x:  62, y: 1154, w: 380, h: 78 },
    // "Date: ___" — label ends at x≈160; underline at y=1324
    cardholder_date: { x: 182, y: 1308 },
    // "Client Signature: ___" — label ends at x≈395; underline at y=1684
    client_sig:      { x: 415, y: 1634, w: 360, h: 50 },
    // "Date: ___" — label ends at x≈160; underline at y=1774
    client_date:     { x: 182, y: 1758 },
    // "VM Integral Massage Representative: ___" — blank starts at x≈775; underline at y=1850
    rep_sig:         { x: 775, y: 1800, w: 275, h: 50 },
    // "Date: ___" — near bottom of slide (y=1940)
    rep_date:        { x: 182, y: 1938 },
  },
}

export function getBasicCoords(language: 'en' | 'es'): BasicContractCoords {
  return language === 'es' ? BASIC_COORDS_ES : BASIC_COORDS_EN
}

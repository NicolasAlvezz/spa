/** Error codes returned by POST /api/visits */
export type VisitApiErrorCode =
  | 'consent_required'
  | 'failed_to_register_visit'
  | 'failed_to_update_membership'
  | 'split_payment_required'
  | 'no_sessions_remaining'
  | 'membership_not_found'
  | 'invalid_therapist_name'
  | 'invalid_payment_method'
  | 'unauthorized'
  | 'unknown'

export type ScanErrorKey =
  | 'client_not_found'
  | 'network_error'
  | 'consent_required'
  | 'visit_register_failed'
  | 'membership_update_failed'

export async function parseVisitApiError(res: Response): Promise<ScanErrorKey> {
  if (res.status === 403) return 'consent_required'

  let code: string | undefined
  try {
    const body: { error?: string } = await res.json()
    code = body.error
  } catch {
    return 'network_error'
  }

  switch (code) {
    case 'consent_required':
      return 'consent_required'
    case 'failed_to_update_membership':
      return 'membership_update_failed'
    case 'failed_to_register_visit':
      return 'visit_register_failed'
    default:
      return res.status >= 500 ? 'visit_register_failed' : 'network_error'
  }
}

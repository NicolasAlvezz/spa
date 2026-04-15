import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  try {
    return Object.fromEntries(
      readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => l.split('=').map((s) => s.trim()))
        .filter(([k]) => k)
    )
  } catch { return {} }
}

const env = loadEnv()
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'], {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await supabase.auth.admin.listUsers()
if (error) { console.error('❌', error.message); process.exit(1) }

for (const user of data.users) {
  const role = user.app_metadata?.role ?? '(sin rol)'
  const status = role === 'admin' ? '✅' : '⚠️ '
  console.log(`${status}  ${user.email}  →  role: "${role}"`)
}

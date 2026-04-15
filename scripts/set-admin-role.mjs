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

const EMAIL = 'nicoalvez28@gmail.com'

// Find user
const { data: list, error: listError } = await supabase.auth.admin.listUsers()
if (listError) { console.error('❌', listError.message); process.exit(1) }

const user = list.users.find((u) => u.email === EMAIL)
if (!user) { console.error(`❌  No se encontró el usuario ${EMAIL}`); process.exit(1) }

// Set role
const { error } = await supabase.auth.admin.updateUserById(user.id, {
  app_metadata: { role: 'admin' },
})

if (error) { console.error('❌', error.message); process.exit(1) }

console.log(`✅  Rol admin asignado a ${EMAIL}`)

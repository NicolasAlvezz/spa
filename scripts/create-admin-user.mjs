/**
 * Script de desarrollo — crea un usuario admin en Supabase.
 * Uso: node scripts/create-admin-user.mjs
 *
 * Requiere que .env.local tenga:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Leer .env.local manualmente (no requiere dotenv)
function loadEnv() {
  try {
    const content = readFileSync('.env.local', 'utf8')
    return Object.fromEntries(
      content
        .split('\n')
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => l.split('=').map((s) => s.trim()))
        .filter(([k]) => k)
    )
  } catch {
    return {}
  }
}

const env = loadEnv()
const url = env['NEXT_PUBLIC_SUPABASE_URL']
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY']

if (!url || !serviceKey) {
  console.error('❌  Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL = 'nicoalvez28@gmail.com'
const PASSWORD = '1234'

console.log(`Creando usuario admin: ${EMAIL} ...`)

const { data, error } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,          // skip email verification
  app_metadata: { role: 'admin' },
})

if (error) {
  console.error('❌  Error:', error.message)
  process.exit(1)
}

console.log(`✅  Usuario creado: ${data.user.id}`)
console.log(`   Email: ${data.user.email}`)
console.log(`   Role:  ${data.user.app_metadata?.role}`)
console.log('')
console.log('⚠️  Contraseña "1234" es solo para desarrollo. Cambiala antes de producción.')

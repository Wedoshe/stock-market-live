import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vuywvmaiwcynehojusef.supabase.co'
const supabaseKey = 'sb_publishable_57EG-sH38S04tf9wKEVxHA_KwFcEUyU'

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)
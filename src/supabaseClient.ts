import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wnnlffqjaortegjqjmhx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Lc0VAeHlRLlyG27X-sNHhg_RAEJjbk3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

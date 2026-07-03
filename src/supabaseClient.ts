import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uaprmfhtmqlrkaskwhjp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_T1zityP9J0OmiVaikLktGg_O1fIBwff';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

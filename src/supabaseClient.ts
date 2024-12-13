import { createClient } from '@supabase/supabase-js';

// Ide add meg a Supabase API URL-t és anon kulcsot
const SUPABASE_URL = 'https://bsluslrtbhiwsaecbibh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbHVzbHJ0Ymhpd3NhZWNiaWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0ODIzODcsImV4cCI6MjA0ODA1ODM4N30.r02lkUC_MxJHa56lAIL4yT8eMfJT1RJDH04ZByBDcQQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
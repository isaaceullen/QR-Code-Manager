import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://amovzttmzwocyvtugxaa.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtb3Z6dHRtendvY3l2dHVneGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjY0NzQsImV4cCI6MjA4ODY0MjQ3NH0.DlGy95mxwTpLsKYOg0XHlGJefw0nXzGdnoUXEvQMIEs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

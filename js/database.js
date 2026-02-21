// js/database.js
const supabaseUrl = 'https://ovnuayxultzjztkrfvuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bnVheXh1bHR6anp0a3JmdnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MjA2MDMsImV4cCI6MjA4NzE5NjYwM30.eTh7JgVc63Nksn2bauRkpF5QyfqulmcmG6zPvIGUeC0';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Global export
window.supabase = _supabase;
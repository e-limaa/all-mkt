
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    const { data, error } = await supabase.from('activity_logs').select('count', { count: 'exact', head: true });

    if (error) {
        if (error.code === '42P01') { // relation does not exist
            console.log('Table activity_logs DOES NOT exist.');
        } else {
            console.log('Error checking table:', error.message);
        }
    } else {
        console.log('Table activity_logs EXISTS.');
    }
}

checkTable();

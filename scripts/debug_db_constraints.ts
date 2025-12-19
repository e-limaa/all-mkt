
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log('--- DB CONSTRAINT & USER DEBUG ---');
    const targetId = 'd15aae00-cd54-4217-b2b4-c022c0ef7175';

    // 1. Check Auth User
    console.log(`\n1. Checking auth.users for ID: ${targetId}`);
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(targetId);

    if (authError) {
        console.log('❌ Auth User Lookup Error:', authError.message);
    } else if (authUser && authUser.user) {
        console.log('✅ Found Auth User:', { id: authUser.user.id, email: authUser.user.email, created: authUser.user.created_at });
    } else {
        console.log('❌ Auth User NOT FOUND.');
    }

    // 2. Introspect Constraints (using RPC or direct query if possible, but RPC is limited. Trying direct query via Supabase is hard without SQL editor access.
    // However, we can try to "invoke" a raw query if enabled, or infer from error.)
    // We can't run raw SQL easily here.

    // Instead, let's try to upsert a dummy user into public.users with a KNOWN valid auth ID (if we found one) to see if it works.
    // If the auth user above exists, we will try to insert a dummy record for it.

    if (authUser && authUser.user) {
        console.log('\n2. Attempting Test Upsert for Found User...');
        const { error: upsertError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: authUser.user.id,
                email: authUser.user.email,
                name: "Debug Test User",
                role: "viewer"
            });

        if (upsertError) {
            console.error('❌ Test Upsert Failed:', upsertError);
        } else {
            console.log('✅ Test Upsert SUCCEEDED. The FK constraint is working for this user.');
        }
    }

    // 3. Check public.users for the same ID
    const { data: publicUser } = await supabaseAdmin.from('users').select('*').eq('id', targetId).single();
    console.log('\n3. Public User Check:', publicUser ? 'Found' : 'Not Found');

    console.log('--- DONE ---');
}

main();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log('--- FIXING SYSTEM STATE ---');

    // 1. Update Bucket Limit
    console.log('1. Updating "avatars" bucket limit...');
    const { data: bucket, error: bucketError } = await supabaseAdmin.storage.updateBucket('avatars', {
        public: true,
        fileSizeLimit: 20 * 1024 * 1024, // 20MB
        allowedMimeTypes: ['image/*']
    });

    if (bucketError) {
        console.error('❌ Failed to update bucket:', bucketError.message);
    } else {
        console.log('✅ Bucket "avatars" updated successfully (Limit: 20MB).');
    }

    // 2. Clean up Stale Users (Auth AND Public)
    const targetEmail = 'ejorge@tenda.com';
    console.log(`2. Checking for stale records for ${targetEmail}...`);

    // Check Auth Users first
    const { data: authData, error: authListError } = await supabaseAdmin.auth.admin.listUsers();

    if (authListError) {
        console.error('❌ Error listing auth users:', authListError);
    } else {
        const targetAuthUser = authData.users.find(u => u.email === targetEmail);
        if (targetAuthUser) {
            console.log(`Found Auth User ${targetAuthUser.id}. Deleting...`);
            const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetAuthUser.id);
            if (deleteAuthError) console.error('❌ Failed to delete auth user:', deleteAuthError);
            else console.log('✅ Deleted Auth User.');
        } else {
            console.log('No Auth user found for target email.');
        }
    }

    // Check Public Users
    const { data: users, error: searchError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', targetEmail);

    if (searchError) {
        console.error('❌ Error searching public users:', searchError);
    } else if (users && users.length > 0) {
        console.log(`Found ${users.length} public record(s). Deleting...`);
        for (const user of users) {
            const { error: delError } = await supabaseAdmin
                .from('users')
                .delete()
                .eq('id', user.id);
            if (delError) console.error(`Failed to delete public user ${user.id}:`, delError);
            else console.log(`✅ Deleted stale public user: ${user.id}`);
        }
    } else {
        console.log('No stale public users found.');
    }

    console.log('--- DONE ---');
}

main();

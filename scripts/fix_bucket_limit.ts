
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing env vars (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBucketLimit() {
    const BUCKET_NAME = "assets";
    const NEW_LIMIT_BYTES = 200 * 1024 * 1024; // 200MB

    console.log(`Checking bucket '${BUCKET_NAME}'...`);

    const { data: bucket, error } = await supabase.storage.getBucket(BUCKET_NAME);

    if (error) {
        console.error("Error getting bucket:", error);
        return;
    }

    if (!bucket) {
        console.error(`Bucket '${BUCKET_NAME}' not found.`);
        return;
    }

    console.log("Current configuration:", {
        name: bucket.name,
        public: bucket.public,
        file_size_limit: bucket.file_size_limit,
        allowed_mime_types: bucket.allowed_mime_types,
    });

    const currentLimit = bucket.file_size_limit;

    if (currentLimit !== null && typeof currentLimit === 'number' && currentLimit >= NEW_LIMIT_BYTES) {
        console.log("Bucket already has sufficient limit (or logic check passing).");
        // Actually continue to force set to 200MB if it's not null, just to be precise, 
        // or if it's null it means unlimited which is fine.
    }

    // If limit is not null (unlimited) AND is less than target, OR we just want to explicit set it.
    // Note: file_size_limit: null means 'unlimited' (up to global project cap). 
    // If we want 200MB cap, we set it. If we want unlimited, we set null.
    // Given user asked for "Max 200MB", setting it to 209715200 is appropriate enforcement.
    // BUT the error says "exceeded maximum allowed size" which implies it IS currently set and lower.

    console.log(`Updating limit to ${NEW_LIMIT_BYTES} bytes (200MB)...`);

    const { data: updated, error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
        file_size_limit: NEW_LIMIT_BYTES,
        allowed_mime_types: null, // Keep accepting all? null means all.
        public: true // Maintain public
    });

    if (updateError) {
        console.error("Error updating bucket:", updateError);
    } else {
        console.log("Bucket updated successfully:", updated);
    }
}

fixBucketLimit();

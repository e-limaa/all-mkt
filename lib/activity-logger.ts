import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use a client that can be used on the server side
// Ideally, we should pass the supabase client from the context to ensure we use the logged-in user's session
// But for a generic helper, we might accept the client as an argument

export type ActivityAction =
    | 'upload_asset'
    | 'delete_asset'
    | 'update_asset'
    | 'download_asset'
    | 'create_project'
    | 'update_project'
    | 'delete_project'
    | 'create_campaign'
    | 'update_campaign'
    | 'delete_campaign'
    | 'create_user'
    | 'update_user'
    | 'delete_user'
    | 'create_shared_link'
    | 'delete_shared_link';

export type EntityType = 'asset' | 'project' | 'campaign' | 'user' | 'shared_link' | 'system';

interface LogActivityParams {
    action: ActivityAction;
    entityType: EntityType;
    entityId?: string;
    metadata?: Record<string, any>;
    userId: string;
}

/**
 * Logs a user activity to the database.
 * @param supabase The supabase client with the user's session
 * @param params Details of the activity
 */
export async function logActivity(supabase: any, params: LogActivityParams) {
    try {
        const { action, entityType, entityId, metadata, userId } = params;

        const { error } = await supabase.from('activity_logs').insert({
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            metadata,
        });

        if (error) {
            console.error('Error logging activity:', error);
        }
    } catch (error) {
        console.error('Unexpected error logging activity:', error);
    }
}

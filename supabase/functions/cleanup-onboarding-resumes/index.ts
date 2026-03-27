import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (_req, ctx) => {
    console.log('Starting cleanup of old onboarding resumes...');

    // List all files in onboarding folder
    const { data: files, error: listError } = await ctx.supabase.storage
      .from('resumes')
      .list('onboarding', {
        sortBy: { column: 'created_at', order: 'asc' }
      });

    if (listError) {
      console.error('Error listing files:', listError);
      throw listError;
    }

    console.log(`Found ${files?.length || 0} files in onboarding folder`);

    // Filter files older than 24 hours
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const oldFiles = files?.filter((file) => {
      const fileDate = new Date(file.created_at);
      return fileDate < twentyFourHoursAgo;
    }) || [];

    console.log(`Found ${oldFiles.length} files older than 24 hours`);

    if (oldFiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No old files to clean up',
          deleted: 0
        }),
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete old files
    const filePaths = oldFiles.map(file => `onboarding/${file.name}`);
    const { error: deleteError } = await ctx.supabase.storage
      .from('resumes')
      .remove(filePaths);

    if (deleteError) {
      console.error('Error deleting files:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${oldFiles.length} old onboarding resumes`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${oldFiles.length} old onboarding resumes`,
        deleted: oldFiles.length
      }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
}));

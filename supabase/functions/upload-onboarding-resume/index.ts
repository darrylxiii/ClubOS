import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const contentType = req.headers.get('content-type') || '';

  if (!contentType.includes('multipart/form-data')) {
    return new Response(
      JSON.stringify({ error: 'Expected multipart/form-data' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const sessionId = formData.get('sessionId') as string | null;

  if (!file || !sessionId) {
    return new Response(
      JSON.stringify({ error: 'Missing file or sessionId' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!allowedTypes.includes(file.type)) {
    return new Response(
      JSON.stringify({ error: 'Invalid file type. Only PDF, DOC, DOCX allowed.' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return new Response(
      JSON.stringify({ error: 'File exceeds 10MB limit.' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Sanitize sessionId
  const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!sanitizedSessionId || sanitizedSessionId.length > 100) {
    return new Response(
      JSON.stringify({ error: 'Invalid sessionId' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Sanitize filename
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `onboarding/${sanitizedSessionId}_${sanitizedName}`;

  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await ctx.supabase.storage
    .from('resumes')
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[upload-onboarding-resume] Upload error:', uploadError);
    return new Response(
      JSON.stringify({ error: 'Failed to upload file' }),
      { status: 500, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[upload-onboarding-resume] Uploaded: ${filePath}`);

  return new Response(
    JSON.stringify({ path: filePath, filename: file.name }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));

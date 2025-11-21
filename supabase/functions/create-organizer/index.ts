import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, username, name, organizationName, industry, website, roleInOrganization, bio, phone, location } = await req.json()

    // Validate required fields
    if (!email || !password || !username || !name || !organizationName || !industry) {
      throw new Error('Missing required fields')
    }

    // Check if email already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      throw new Error('A profile with this email already exists')
    }

    // Create the auth user (this won't create a session)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        organization_name: organizationName,
        is_organizer: true,
      }
    })

    if (authError) throw authError

    const userId = authData.user.id

    // Create the profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        username,
        name,
        email,
        organization_name: organizationName,
        industry,
        website: website || null,
        role_in_organization: roleInOrganization || null,
        bio: bio || null,
        phone: phone || null,
        location: location || null,
        role: 'organizer',
        is_organizer: true,
        total_events_created: 0,
        total_attendees_served: 0,
      })

    if (profileError) throw profileError

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: 'Organizer created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating organizer:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
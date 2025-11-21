import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const {
      email,
      password,
      username,
      name,
      organizationName,
      industry,
      website,
      roleInOrganization,
      bio,
      phone,
      location
    } = await req.json()

    // Validate required fields
    if (!email || !password || !username || !name || !organizationName || !industry) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if email already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return new Response(JSON.stringify({ error: 'A profile with this email already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create the auth user (this won't create a session on the client)
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

    if (authError) {
      console.error('Auth creation error:', authError)
      return new Response(JSON.stringify({ error: 'Failed to create auth user' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

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

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Try to clean up the auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(JSON.stringify({ error: 'Failed to create organizer profile' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      userId,
      message: 'Organizer created successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Server error:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
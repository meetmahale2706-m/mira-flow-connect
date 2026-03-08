import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const testUsers = [
      { email: 'admin@miralink.test', password: 'Admin@123', name: 'Admin User', mobile: '+911234567890', role: 'admin' as const },
      { email: 'driver@miralink.test', password: 'Driver@123', name: 'Ravi Kumar', mobile: '+919876543210', role: 'driver' as const },
      { email: 'customer@miralink.test', password: 'Customer@123', name: 'Priya Sharma', mobile: '+919123456789', role: 'customer' as const },
    ];

    const results = [];

    for (const u of testUsers) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(eu => eu.email === u.email);
      
      if (existing) {
        results.push({ email: u.email, status: 'already_exists', id: existing.id });
        continue;
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name, mobile: u.mobile },
      });

      if (error) {
        results.push({ email: u.email, status: 'error', error: error.message });
        continue;
      }

      if (data.user) {
        // Update profile
        await supabaseAdmin.from('profiles').update({ name: u.name, mobile: u.mobile }).eq('user_id', data.user.id);
        // Insert role
        await supabaseAdmin.from('user_roles').insert({ user_id: data.user.id, role: u.role });
        
        // Create driver profile for driver
        if (u.role === 'driver') {
          await supabaseAdmin.from('driver_profiles').insert({
            user_id: data.user.id,
            vehicle_number: 'KA-01-AB-1234',
            vehicle_type: 'Mini Truck',
            fuel_efficiency: 12.5,
            is_available: true,
          });
        }
        
        results.push({ email: u.email, password: u.password, status: 'created', id: data.user.id, role: u.role });
      }
    }

    return new Response(JSON.stringify({ success: true, users: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

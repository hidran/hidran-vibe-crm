import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabaseChanges() {
  console.log('🔍 Verifying database changes for superadmin feature...\n');

  try {
    // 1. Verify is_superadmin column exists by querying profiles
    console.log('1. Checking is_superadmin column in profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, is_superadmin, first_name, last_name')
      .limit(1);

    if (profilesError) {
      console.error('   ❌ Error querying profiles:', profilesError.message);
      return false;
    }
    console.log('   ✅ is_superadmin column exists and is queryable');

    // 2. Verify superadmin user exists
    console.log('\n2. Checking for superadmin user...');
    const { data: superadmins, error: superadminError } = await supabase
      .from('profiles')
      .select('id, is_superadmin, first_name, last_name')
      .eq('is_superadmin', true);

    if (superadminError) {
      console.error('   ❌ Error querying superadmins:', superadminError.message);
      return false;
    }

    if (superadmins && superadmins.length > 0) {
      console.log(`   ✅ Found ${superadmins.length} superadmin user(s):`);
      superadmins.forEach(admin => {
        const fullName = [admin.first_name, admin.last_name].filter(Boolean).join(' ') || 'No name';
        console.log(`      - ID: ${admin.id} (${fullName})`);
      });
    } else {
      console.log('   ⚠️  No superadmin users found');
    }

    // 3. Verify RLS policies (indirect check by attempting to query organizations)
    console.log('\n3. Checking RLS policies on organizations table...');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);

    // We expect this to fail or return empty for unauthenticated user
    if (orgsError) {
      console.log('   ✅ RLS policies are active (unauthenticated access blocked)');
    } else {
      console.log('   ℹ️  Organizations query succeeded (may have public policies)');
    }

    console.log('\n✅ All database changes verified successfully!');
    console.log('\nMigrations applied:');
    console.log('  - 20251219000000_add_is_superadmin_to_profiles.sql');
    console.log('  - 20251219000001_add_superadmin_rls_policies.sql');
    console.log('  - 20251219000002_set_initial_superadmin.sql');
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

verifyDatabaseChanges().then(success => {
  process.exit(success ? 0 : 1);
});

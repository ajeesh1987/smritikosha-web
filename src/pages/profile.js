import { supabase } from '../../lib/supabaseClient.js';

export async function checkAndCreateUserProfile(user) {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error(' Profile lookup failed:', profileError.message);
      return;
    }

    if (!profile) {
      const { first_name = '', country = '', terms_accepted_at = new Date().toISOString() } = user.user_metadata || {};
      console.log('Inserting profile with payload:', {
        user_id: user.id,
        email: user.email,
        first_name,
        country,
        terms_accepted_at
      });
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          user_id: user.id,
          email: user.email,
          first_name: first_name.trim(),
          country: country.trim(),
          terms_accepted_at
        }], { returning: 'minimal' });

      if (insertError) {
        console.error(' Profile insert failed:', insertError.message);
      } else {
        console.log(' Profile created');
      }
    } else {
      console.log(' Profile exists');
    }
  } catch (err) {
    console.error('Unhandled error in profile logic:', err);
  }
}
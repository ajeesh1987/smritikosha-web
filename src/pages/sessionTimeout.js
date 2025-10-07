import { supabase } from '../../lib/supabaseClient.js';

let timeoutId;

export function startSessionTimeout(minutes = 30) {
  const ms = minutes * 60 * 1000;

  const resetTimer = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      console.log(' Session timeout reached. Logging out...');
      await supabase.auth.signOut();
      window.location.href = '/pages/login.html';
    }, ms);
  };

  // Events considered as activity
  ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    window.addEventListener(event, resetTimer);
  });

  resetTimer(); // Start initially
}

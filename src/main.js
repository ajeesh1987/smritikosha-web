    // main.js - Vite entry point

    // Import Supabase client
    // Assumes supabaseClient.js is in './lib/' relative to project root where main.js is
    import { supabase } from './lib/supabaseClient.js';

    // --- DOM Element References ---
    // Forms
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // Error/Message Paragraphs
    const loginErrorEl = document.getElementById('login-error');
    const signupErrorEl = document.getElementById('signup-error');
    const passwordMatchErrorEl = document.getElementById('password-match-error');
    const submittedEmailEl = document.getElementById('submitted-email');
    const resendMessageEl = document.getElementById('resend-message');

    // View Switching Buttons/Links (using IDs added to HTML)
    const goToSignupBtn = document.getElementById('go-to-signup-btn');
    const goToLoginBtn = document.getElementById('go-to-login-btn');
    const forgotPasswordLink = document.getElementById('forgot-password-link'); // Added ID in HTML
    const resendBtn = document.getElementById('resend-verification-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const proceedToLoginBtn = document.getElementById('proceed-to-login-btn');

    // Views
    const views = document.querySelectorAll('.view');
    let currentEmail = ''; // Store email for potential resend

    // --- View Switching Logic ---
    function showView(viewId) {
        views.forEach(view => {
            view.classList.remove('active');
        });
        const nextView = document.getElementById(viewId);
        if (nextView) {
            nextView.classList.add('active');
            clearMessages(); // Clear messages when switching views
        } else {
            console.error("View not found:", viewId);
        }
    }

    // --- Clear Error/Success Messages ---
    function clearMessages() {
        if (loginErrorEl) loginErrorEl.textContent = '';
        if (signupErrorEl) signupErrorEl.textContent = '';
        if (passwordMatchErrorEl) passwordMatchErrorEl.textContent = '';
        if (resendMessageEl) resendMessageEl.textContent = '';

        const signupPassword = document.getElementById('signup-password');
        const signupConfirmPassword = document.getElementById('signup-confirm-password');
        if(signupPassword) signupPassword.value = '';
        if(signupConfirmPassword) signupConfirmPassword.value = '';
    }

    // --- Form Handlers ---

    // Handle Sign Up Form Submission
    async function handleSignup(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const name = formData.get('name');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const terms = formData.get('terms');

        clearMessages();

        if (password !== confirmPassword) {
            if (passwordMatchErrorEl) passwordMatchErrorEl.textContent = 'Passwords do not match.';
            return;
        }
        if (password.length < 8) {
            if (passwordMatchErrorEl) passwordMatchErrorEl.textContent = 'Password must be at least 8 characters.';
            return;
        }
        if (!terms) {
            alert("Please agree to the Terms of Service and Privacy Policy.");
            return;
        }

        // Add loading indicator if desired
        const submitButton = signupForm.querySelector('button[type="submit"]');
        if(submitButton) submitButton.disabled = true;

        try {
            const { data, error } = await supabase.auth.signUp({ email, password });

            if (error) {
                console.error('Supabase Sign Up Error:', error.message);
                if (signupErrorEl) signupErrorEl.textContent = error.message;
                else alert(`Signup failed: ${error.message}`);
                return;
            }

            console.log('Supabase Sign Up Success:', data);
            currentEmail = email;
            if (submittedEmailEl) submittedEmailEl.textContent = currentEmail;
            showView('check-email-view');

        } catch (catchError) {
            console.error('Unexpected error during signup:', catchError);
            if (signupErrorEl) signupErrorEl.textContent = 'An unexpected error occurred.';
            else alert('An unexpected error occurred during signup.');
        } finally {
             if(submitButton) submitButton.disabled = false; // Re-enable button
        }
    }

    // Handle Login Form Submission
    async function handleLogin(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');

        clearMessages();
        const submitButton = loginForm.querySelector('button[type="submit"]');
        if(submitButton) submitButton.disabled = true;


        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                console.error('Supabase Login Error:', error.message);
                if (error.message.includes("Email not confirmed")) {
                    if (loginErrorEl) loginErrorEl.textContent = "Please verify your email address first.";
                    currentEmail = email; // Store for potential resend from login page
                } else {
                    if (loginErrorEl) loginErrorEl.textContent = "Invalid login credentials.";
                }
                return;
            }
            console.log('Supabase Login Success:', data);
            // Redirect will happen via onAuthStateChange listener

        } catch (catchError) {
            console.error('Unexpected error during login:', catchError);
            if (loginErrorEl) loginErrorEl.textContent = 'An unexpected error occurred.';
            else alert('An unexpected error occurred during login.');
        } finally {
            if(submitButton) submitButton.disabled = false;
            const passwordInput = document.getElementById('login-password');
            if (passwordInput) passwordInput.value = '';
        }
    }

    // Handle Resend Verification Email
    async function resendVerification() {
        clearMessages();
        const submitButton = resendBtn; // Assuming resendBtn is the button element
        if(submitButton) submitButton.disabled = true;


        // Ensure currentEmail is set, potentially from login attempt or signup
        if (!currentEmail) {
            const loginEmailInput = document.getElementById('login-email');
            const signupEmailInput = document.getElementById('signup-email');
            if (loginEmailInput && loginEmailInput.value) {
                currentEmail = loginEmailInput.value;
            } else if (signupEmailInput && signupEmailInput.value) {
                currentEmail = signupEmailInput.value;
            } else {
                console.error("No email available to resend verification.");
                if (resendMessageEl) resendMessageEl.textContent = "Could not determine email address.";
                else alert("Could not determine email address.");
                if(submitButton) submitButton.disabled = false;
                return;
            }
        }

        try {
            console.log("Attempting to resend verification to:", currentEmail);
            const { data, error } = await supabase.auth.resend({
                type: 'signup',
                email: currentEmail
            });

            if (error) {
                console.error('Supabase Resend Error:', error.message);
                if (resendMessageEl) resendMessageEl.textContent = `Error: ${error.message}`;
                else alert(`Error resending verification: ${error.message}`);
            } else {
                console.log('Supabase Resend Success:', data);
                if (resendMessageEl) resendMessageEl.textContent = `Verification email resent to ${currentEmail}.`;
                else alert(`Verification email resent to ${currentEmail}.`);
            }
        } catch (catchError) {
            console.error('Unexpected error during resend:', catchError);
            if (resendMessageEl) resendMessageEl.textContent = 'An unexpected error occurred.';
            else alert('An unexpected error occurred while resending.');
        } finally {
            if(submitButton) submitButton.disabled = false;
        }
    }

    // Handle Forgot Password (Placeholder)
    function handleForgotPassword(event) {
         event.preventDefault(); // Prevent link navigation
         alert("Forgot Password functionality not implemented yet.");
         // Later: showView('forgot-password-view');
    }


    // --- Auth State Listener ---
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth event:', event, 'Session:', session);

        if (event === 'SIGNED_IN' && session) {
            // Redirect to dashboard (create dashboard.html)
            console.log("User signed in, redirecting to dashboard...");
            window.location.pathname = '/dashboard.html';
        } else if (event === 'SIGNED_OUT') {
            // Ensure login view is shown
            const currentPath = window.location.pathname;
            if (currentPath.endsWith('/') || currentPath.endsWith('/index.html')) { // Check if on root/index
                 showView('login-view'); // Show view if already on the right page
            } else if (!currentPath.endsWith('/index.html')) { // Avoid loop if login.html is index
                 window.location.pathname = '/'; // Redirect to root (which is index.html)
            }
        }
         // Handle verification redirect - Supabase might add hash params
         // More robust handling might be needed depending on Supabase settings
         if (event === 'INITIAL_SESSION' && !session) {
             // Ensure login view is shown if no session on load
             showView('login-view');
         }
    });

    // --- Initial Setup & Event Listeners ---
    document.addEventListener('DOMContentLoaded', () => {
        // Attach listeners to forms
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        } else {
            console.error('Login form not found');
        }

        if (signupForm) {
            signupForm.addEventListener('submit', handleSignup);
        } else {
            console.error('Signup form not found');
        }

        // Attach listeners to buttons/links
        if (goToSignupBtn) {
            goToSignupBtn.addEventListener('click', () => showView('signup-view'));
        }
        if (goToLoginBtn) {
            goToLoginBtn.addEventListener('click', () => showView('login-view'));
        }
        if (resendBtn) {
            resendBtn.addEventListener('click', resendVerification);
        }
        if (backToLoginBtn) {
             backToLoginBtn.addEventListener('click', () => showView('login-view'));
        }
         if (proceedToLoginBtn) {
             proceedToLoginBtn.addEventListener('click', () => showView('login-view'));
         }
         if (forgotPasswordLink) {
             forgotPasswordLink.addEventListener('click', handleForgotPassword);
         }


        // Set initial view based on auth state (listener above handles redirects)
        // For initial load before listener fires, default to login
        const activeView = document.querySelector('.view.active');
        if (!activeView) {
            showView('login-view');
        }
    });

    
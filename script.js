// Function to switch between views
function showView(viewId) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.classList.remove('active'));
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
    }
}

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const loginError = document.getElementById('login-error');

    loginError.textContent = ''; // Clear previous errors

    if (email === 'verified@example.com' && password === 'password') {
        alert('Login successful!');
    } else if (email === 'unverified@example.com') {
        loginError.textContent = 'Please verify your email before logging in.';
    } else {
        loginError.textContent = 'Invalid email or password.';
    }
}

// Handle signup form submission
function handleSignup(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const terms = document.getElementById('terms').checked;
    const passwordError = document.getElementById('password-match-error');

    passwordError.textContent = ''; // Clear previous errors

    if (password !== confirmPassword) {
        passwordError.textContent = 'Passwords do not match.';
        return;
    }

    if (!terms) {
        alert('Please agree to the Terms of Service and Privacy Policy.');
        return;
    }

    alert(`Account created successfully for ${name}!`);
    showView('login-view');
}
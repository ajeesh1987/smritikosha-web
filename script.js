// Handle login form submission
document.getElementById("login-form").addEventListener("submit", function(event) {
    event.preventDefault();

    // Get form data
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Basic validation (you can expand this with real API calls)
    if (email && password) {
        alert("Login successful!");
        console.log("User logged in:", email);
    } else {
        alert("Please fill in both fields.");
    }
});

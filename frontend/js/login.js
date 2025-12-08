const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
const togglePasswordBtn = document.getElementById('togglePassword');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginSpinner = document.getElementById('loginSpinner');
const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const API_BASE = "http://127.0.0.1:8000";

document.addEventListener('DOMContentLoaded', () => {
    loginForm.addEventListener('submit', handleLogin);
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
});

function togglePasswordVisibility() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
}

function showFieldError(field, message) {
    const input = document.getElementById(field);
    const errorElement = document.getElementById(field + 'Error');
    input.classList.add('error');
    errorElement.textContent = message;
}

function clearFieldError(field) {
    const input = document.getElementById(field);
    const errorElement = document.getElementById(field + 'Error');
    input.classList.remove('error');
    errorElement.textContent = '';
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorBox.classList.remove('hidden');
}

function hideError() {
    errorBox.classList.add('hidden');
}

function showLoading() {
    loginBtn.disabled = true;
    loginBtnText.textContent = 'Signing in...';
    loginSpinner.classList.remove('hidden');
}

function hideLoading() {
    loginBtn.disabled = false;
    loginBtnText.textContent = 'Sign In';
    loginSpinner.classList.add('hidden');
}

function validateEmail() {
    const email = emailInput.value.trim();
    if (!email) {
        showFieldError('email', 'Email is required');
        return false;
    }
    if (!EMAIL_PATTERN.test(email)) {
        showFieldError('email', 'Enter a valid email');
        return false;
    }
    clearFieldError('email');
    return true;
}

function validatePassword() {
    const password = passwordInput.value;
    if (!password) {
        showFieldError('password', 'Password is required');
        return false;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        showFieldError('password', `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        return false;
    }
    clearFieldError('password');
    return true;
}

async function handleLogin(e) {
    e.preventDefault();
    hideError();

    const okEmail = validateEmail();
    const okPass = validatePassword();
    if (!okEmail || !okPass) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const remember = rememberCheckbox.checked;

    showLoading();
    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, remember }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Login failed");

        const storage = remember ? localStorage : sessionStorage;
        storage.setItem("authToken", data.token);
        storage.setItem("userData", JSON.stringify(data.user));

        window.location.href = "dashboard.html";
    } catch (err) {
        showError(err.message || "Login error");
    } finally {
        hideLoading();
    }
}

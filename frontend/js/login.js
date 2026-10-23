// Already logged in? Go straight to the dashboard.
if (token) location.href = 'dashboard.html';

let registering = false;

// Switch between "Sign in" and "Create account".
document.getElementById('switchBtn').onclick = () => {
  registering = !registering;
  document.querySelectorAll('.register-only').forEach((el) => (el.hidden = !registering));
  document.getElementById('name').required = registering;
  document.getElementById('title').textContent = registering ? 'Create your account' : 'Sign in';
  document.getElementById('submitBtn').textContent = registering ? 'Create account' : 'Sign in';
  document.getElementById('switchText').textContent = registering ? 'Already have an account?' : 'New here?';
  document.getElementById('switchBtn').textContent = registering ? 'Sign in' : 'Create an account';
};

document.getElementById('authForm').onsubmit = async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const data = registering
      ? await api('/api/auth/register', {
          method: 'POST',
          json: {
            email,
            password,
            full_name: document.getElementById('name').value.trim(),
            phone: document.getElementById('phone').value.trim() || null,
          },
        })
      : await api('/api/auth/login', { method: 'POST', json: { email, password } });

    localStorage.setItem('fillrai_token', data.access_token);
    location.href = 'dashboard.html';
  } catch (err) {
    const box = document.getElementById('error');
    box.textContent = err.message;
    box.hidden = false;
  }
};


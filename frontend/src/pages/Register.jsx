import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.password.length < 8) e.password = 'At least 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setErrors({});
    setLoading(true);
    try {
      await register(form.name.trim(), form.email, form.password);
    } catch (err) {
      setErrors({ api: err.response?.data?.detail || 'Registration failed. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-5 page-enter">
      <div className="w-full max-w-sm">

        <div className="mb-8 text-center">
          <h1 className="font-heading text-4xl font-bold text-text tracking-tight">PocketPal</h1>
          <p className="text-muted text-sm mt-2">Take control of your student budget</p>
        </div>

        <Card>
          <h2 className="font-heading text-lg font-semibold text-text mb-5">Create account</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Full name"
              type="text"
              placeholder="Alex Johnson"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              required
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@university.edu"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={set('confirm')}
              error={errors.confirm}
              required
              autoComplete="new-password"
            />

            {errors.api && (
              <p className="text-danger text-xs text-center">{errors.api}</p>
            )}

            <Button type="submit" loading={loading} className="mt-1">
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-5">
            Already have one?{' '}
            <Link to="/login" className="text-primary hover:underline underline-offset-2 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </Card>

      </div>
    </div>
  );
}

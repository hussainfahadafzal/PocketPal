import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    monthly_balance: '',
    savings_goal: '',
    goal_name: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    const balance = parseFloat(form.monthly_balance);
    const goal = parseFloat(form.savings_goal);
    if (!form.monthly_balance || isNaN(balance) || balance <= 0)
      e.monthly_balance = 'Enter a positive amount';
    if (form.savings_goal && (isNaN(goal) || goal < 0))
      e.savings_goal = 'Enter a valid amount';
    if (!isNaN(balance) && !isNaN(goal) && goal > balance)
      e.savings_goal = 'Savings goal cannot exceed your monthly budget';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await client.post('/wallet', {
        monthly_balance: parseFloat(form.monthly_balance),
        savings_goal: parseFloat(form.savings_goal) || 0,
        goal_name: form.goal_name.trim() || null,
      });
      navigate('/dashboard');
    } catch (err) {
      setErrors({ api: err.response?.data?.detail || 'Could not save wallet. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-muted text-sm mb-1">Hey {user?.name?.split(' ')[0]},</p>
          <h1 className="font-heading text-3xl font-bold text-text leading-tight">
            Set up your budget
          </h1>
          <p className="text-muted text-sm mt-2">
            This takes 30 seconds. You can change it any time.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Monthly budget */}
            <div>
              <Input
                label="Monthly budget"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 800"
                value={form.monthly_balance}
                onChange={set('monthly_balance')}
                error={errors.monthly_balance}
                required
              />
              <p className="text-muted text-xs mt-1.5">
                Total money you have to spend this month
              </p>
            </div>

            {/* Savings goal */}
            <div>
              <Input
                label="Savings goal (optional)"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 150"
                value={form.savings_goal}
                onChange={set('savings_goal')}
                error={errors.savings_goal}
              />
              <p className="text-muted text-xs mt-1.5">
                Amount reserved — deducted before your daily limit is calculated
              </p>
            </div>

            {/* Goal name */}
            <Input
              label="What are you saving for? (optional)"
              type="text"
              placeholder="e.g. New laptop, Spring trip"
              value={form.goal_name}
              onChange={set('goal_name')}
              maxLength={60}
            />

            {errors.api && (
              <p className="text-danger text-xs text-center">{errors.api}</p>
            )}

            <Button type="submit" loading={loading} className="mt-1">
              Start tracking
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

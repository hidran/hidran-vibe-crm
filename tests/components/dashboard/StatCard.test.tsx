import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { StatCard } from '@/components/dashboard/StatCard';
import { Users } from 'lucide-react';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('StatCard', () => {
  const defaultProps = {
    label: 'Clients',
    value: 42,
    icon: Users,
    href: '/clients',
  };

  const renderStatCard = (props = {}) => {
    return render(
      <BrowserRouter>
        <StatCard {...defaultProps} {...props} />
      </BrowserRouter>
    );
  };

  it('displays correct label and value', () => {
    renderStatCard();
    
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays loading skeleton when isLoading is true', () => {
    renderStatCard({ isLoading: true });
    
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
    
    // Check for skeleton element
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('navigates to correct page on click', async () => {
    const user = userEvent.setup();
    renderStatCard();
    
    const card = screen.getByText('Clients').closest('.cursor-pointer');
    expect(card).toBeInTheDocument();
    
    await user.click(card!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('displays string values correctly', () => {
    renderStatCard({ value: '100' });
    
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('has hover effect class', () => {
    renderStatCard();
    
    const card = screen.getByText('Clients').closest('.hover\\:border-primary');
    expect(card).toBeInTheDocument();
  });
});

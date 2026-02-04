/**
 * Pattern Preview Component
 * 
 * Displays common UI patterns and layouts using design system components
 */

import React, { useState } from 'react';
import { Button } from '@marcelinodzn/ds-react';
import { useThemeColors } from '../../theme';
import { PATTERNS } from '../../data/designSystemData';

interface PatternPreviewProps {
  patternId: string;
}

/**
 * Main pattern preview component
 */
export const PatternPreview: React.FC<PatternPreviewProps> = ({ patternId }) => {
  const theme = useThemeColors();

  // Check if it's a category or specific pattern
  const categoryPatterns = PATTERNS[patternId as keyof typeof PATTERNS];
  
  if (categoryPatterns) {
    return <PatternCategory category={categoryPatterns} />;
  }

  // Check for specific pattern
  switch (patternId) {
    case 'login-form':
      return <LoginFormPattern />;
    case 'signup-form':
      return <SignupFormPattern />;
    case 'search-filter':
      return <SearchFilterPattern />;
    case 'settings-form':
      return <SettingsFormPattern />;
    case 'profile-card':
      return <ProfileCardPattern />;
    case 'product-card':
      return <ProductCardPattern />;
    case 'stats-card':
      return <StatsCardPattern />;
    case 'action-card':
      return <ActionCardPattern />;
    case 'tab-navigation':
      return <TabNavigationPattern />;
    case 'settings-list':
      return <SettingsListPattern />;
    case 'chat-list':
      return <ChatListPattern />;
    case 'transaction-list':
      return <TransactionListPattern />;
    default:
      return (
        <div className="text-center py-8" style={{ color: theme.text.medium }}>
          Select a pattern to view
        </div>
      );
  }
};

/**
 * Pattern category overview
 */
const PatternCategory: React.FC<{ category: typeof PATTERNS[keyof typeof PATTERNS] }> = ({ category }) => {
  const theme = useThemeColors();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: theme.text.high }}>
          {category.label}
        </h2>
        <p style={{ color: theme.text.medium }}>{category.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {category.examples.map((example) => (
          <div
            key={example.id}
            className="p-4 rounded-lg"
            style={{
              backgroundColor: theme.background.subtle,
              border: `1px solid ${theme.stroke.low}`,
            }}
          >
            <h3 className="font-medium mb-1" style={{ color: theme.text.high }}>
              {example.name}
            </h3>
            <p className="text-sm" style={{ color: theme.text.low }}>
              {example.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// Form Patterns
// =============================================================================

const LoginFormPattern: React.FC = () => {
  const theme = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: theme.text.high }}>
          Welcome Back
        </h2>
        <p style={{ color: theme.text.medium }}>Sign in to your account</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: theme.text.medium }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 rounded-lg"
            style={{
              backgroundColor: theme.background.ghost,
              border: `1px solid ${theme.stroke.medium}`,
              color: theme.text.high,
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: theme.text.medium }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 rounded-lg"
            style={{
              backgroundColor: theme.background.ghost,
              border: `1px solid ${theme.stroke.medium}`,
              color: theme.text.high,
            }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2" style={{ color: theme.text.medium }}>
            <input type="checkbox" />
            Remember me
          </label>
          <a href="#" style={{ color: theme.accent }}>Forgot password?</a>
        </div>

        <Button size="M" onPress={() => {}} >
          Sign In
        </Button>
      </div>

      <p className="text-center text-sm" style={{ color: theme.text.medium }}>
        Don't have an account? <a href="#" style={{ color: theme.accent }}>Sign up</a>
      </p>
    </div>
  );
};

const SignupFormPattern: React.FC = () => {
  const theme = useThemeColors();

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: theme.text.high }}>
          Create Account
        </h2>
        <p style={{ color: theme.text.medium }}>Join us today</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.text.medium }}>
              First Name
            </label>
            <input
              type="text"
              placeholder="John"
              className="w-full px-3 py-2 rounded-lg"
              style={{
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`,
                color: theme.text.high,
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.text.medium }}>
              Last Name
            </label>
            <input
              type="text"
              placeholder="Doe"
              className="w-full px-3 py-2 rounded-lg"
              style={{
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`,
                color: theme.text.high,
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: theme.text.medium }}>
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            className="w-full px-3 py-2 rounded-lg"
            style={{
              backgroundColor: theme.background.ghost,
              border: `1px solid ${theme.stroke.medium}`,
              color: theme.text.high,
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: theme.text.medium }}>
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full px-3 py-2 rounded-lg"
            style={{
              backgroundColor: theme.background.ghost,
              border: `1px solid ${theme.stroke.medium}`,
              color: theme.text.high,
            }}
          />
        </div>

        <Button size="M" onPress={() => {}}>
          Create Account
        </Button>
      </div>
    </div>
  );
};

const SearchFilterPattern: React.FC = () => {
  const theme = useThemeColors();
  const [activeFilter, setActiveFilter] = useState('all');
  const filters = ['all', 'active', 'completed', 'archived'];

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 rounded-lg"
            style={{
              backgroundColor: theme.background.ghost,
              border: `1px solid ${theme.stroke.medium}`,
              color: theme.text.high,
            }}
          />
        </div>
        <Button size="M" appearance="secondary" onPress={() => {}}>
          Filters
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className="px-3 py-1.5 rounded-full text-sm capitalize transition-colors"
            style={{
              backgroundColor: activeFilter === filter ? theme.accent : theme.background.subtle,
              color: activeFilter === filter ? '#fff' : theme.text.medium,
            }}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
};

const SettingsFormPattern: React.FC = () => {
  const theme = useThemeColors();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: `1px solid ${theme.stroke.low}` }}
      >
        {/* Toggle settings */}
        {[
          { label: 'Push Notifications', value: notifications, onChange: setNotifications },
          { label: 'Dark Mode', value: darkMode, onChange: setDarkMode },
        ].map((setting, i) => (
          <div
            key={setting.label}
            className="flex items-center justify-between px-4 py-3"
            style={{
              backgroundColor: theme.background.ghost,
              borderTop: i > 0 ? `1px solid ${theme.stroke.low}` : undefined,
            }}
          >
            <span style={{ color: theme.text.high }}>{setting.label}</span>
            <button
              onClick={() => setting.onChange(!setting.value)}
              className="w-12 h-6 rounded-full relative transition-colors"
              style={{ backgroundColor: setting.value ? theme.accent : theme.stroke.medium }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: setting.value ? '28px' : '4px' }}
              />
            </button>
          </div>
        ))}
      </div>

      <Button size="M" onPress={() => {}}>
        Save Changes
      </Button>
    </div>
  );
};

// =============================================================================
// Card Patterns
// =============================================================================

const ProfileCardPattern: React.FC = () => {
  const theme = useThemeColors();

  return (
    <div
      className="p-6 rounded-xl text-center max-w-xs mx-auto"
      style={{
        backgroundColor: theme.background.subtle,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      <div
        className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
        style={{ backgroundColor: theme.background.ghost }}
      >
        👤
      </div>
      <h3 className="text-lg font-semibold" style={{ color: theme.text.high }}>
        John Doe
      </h3>
      <p className="text-sm mb-4" style={{ color: theme.text.medium }}>
        Product Designer
      </p>
      <div className="flex justify-center gap-4 text-sm">
        <div>
          <span className="font-semibold" style={{ color: theme.text.high }}>142</span>
          <span style={{ color: theme.text.low }}> Following</span>
        </div>
        <div>
          <span className="font-semibold" style={{ color: theme.text.high }}>1.2K</span>
          <span style={{ color: theme.text.low }}> Followers</span>
        </div>
      </div>
    </div>
  );
};

const ProductCardPattern: React.FC = () => {
  const theme = useThemeColors();

  return (
    <div
      className="rounded-xl overflow-hidden max-w-xs mx-auto"
      style={{
        backgroundColor: theme.background.subtle,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      <div
        className="h-40 flex items-center justify-center text-4xl"
        style={{ backgroundColor: theme.background.ghost }}
      >
        📦
      </div>
      <div className="p-4">
        <h3 className="font-semibold mb-1" style={{ color: theme.text.high }}>
          Product Name
        </h3>
        <p className="text-sm mb-3" style={{ color: theme.text.medium }}>
          Brief description of the product goes here
        </p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold" style={{ color: theme.accent }}>
            $99.99
          </span>
          <Button size="S" onPress={() => {}}>
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
};

const StatsCardPattern: React.FC = () => {
  const theme = useThemeColors();
  const stats = [
    { label: 'Total Users', value: '12,345', change: '+12%' },
    { label: 'Revenue', value: '$45,678', change: '+8%' },
    { label: 'Active Sessions', value: '789', change: '-3%' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-4 rounded-lg text-center"
          style={{
            backgroundColor: theme.background.subtle,
            border: `1px solid ${theme.stroke.low}`,
          }}
        >
          <p className="text-2xl font-bold" style={{ color: theme.text.high }}>
            {stat.value}
          </p>
          <p className="text-sm" style={{ color: theme.text.medium }}>
            {stat.label}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: stat.change.startsWith('+') ? '#22c55e' : '#ef4444' }}
          >
            {stat.change}
          </p>
        </div>
      ))}
    </div>
  );
};

const ActionCardPattern: React.FC = () => {
  const theme = useThemeColors();

  return (
    <div
      className="p-6 rounded-xl max-w-sm mx-auto"
      style={{
        backgroundColor: theme.background.subtle,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-4"
        style={{ backgroundColor: theme.background.ghost }}
      >
        🚀
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text.high }}>
        Get Started
      </h3>
      <p className="text-sm mb-4" style={{ color: theme.text.medium }}>
        Create your first project and start building amazing things.
      </p>
      <Button size="M" onPress={() => {}}>
        Create Project
      </Button>
    </div>
  );
};

// =============================================================================
// Navigation Patterns
// =============================================================================

const TabNavigationPattern: React.FC = () => {
  const theme = useThemeColors();
  const [activeTab, setActiveTab] = useState('overview');
  const tabs = ['overview', 'analytics', 'reports', 'settings'];

  return (
    <div>
      <div className="flex border-b" style={{ borderColor: theme.stroke.low }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-3 text-sm font-medium capitalize transition-colors"
            style={{
              color: activeTab === tab ? theme.accent : theme.text.medium,
              borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : '2px solid transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-4" style={{ color: theme.text.medium }}>
        Content for {activeTab} tab
      </div>
    </div>
  );
};

// =============================================================================
// List Patterns
// =============================================================================

const SettingsListPattern: React.FC = () => {
  const theme = useThemeColors();
  const items = [
    { icon: '👤', label: 'Account', subtitle: 'Manage your account' },
    { icon: '🔔', label: 'Notifications', subtitle: 'Configure alerts' },
    { icon: '🔒', label: 'Privacy', subtitle: 'Control your data' },
    { icon: '🎨', label: 'Appearance', subtitle: 'Customize look' },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors"
          style={{
            backgroundColor: theme.background.ghost,
            border: `1px solid ${theme.stroke.low}`,
          }}
        >
          <span className="text-2xl">{item.icon}</span>
          <div className="flex-1">
            <p className="font-medium" style={{ color: theme.text.high }}>{item.label}</p>
            <p className="text-sm" style={{ color: theme.text.low }}>{item.subtitle}</p>
          </div>
          <span style={{ color: theme.text.low }}>›</span>
        </div>
      ))}
    </div>
  );
};

const ChatListPattern: React.FC = () => {
  const theme = useThemeColors();
  const chats = [
    { name: 'John Doe', message: 'Hey, how are you?', time: '2m', unread: 2 },
    { name: 'Jane Smith', message: 'Meeting at 3pm', time: '1h', unread: 0 },
    { name: 'Bob Wilson', message: 'Thanks for your help!', time: '3h', unread: 0 },
  ];

  return (
    <div className="space-y-1">
      {chats.map((chat) => (
        <div
          key={chat.name}
          className="flex items-center gap-3 p-3 rounded-lg cursor-pointer"
          style={{ backgroundColor: theme.background.ghost }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: theme.background.subtle }}
          >
            👤
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between">
              <span className="font-medium" style={{ color: theme.text.high }}>{chat.name}</span>
              <span className="text-xs" style={{ color: theme.text.low }}>{chat.time}</span>
            </div>
            <p className="text-sm truncate" style={{ color: theme.text.medium }}>{chat.message}</p>
          </div>
          {chat.unread > 0 && (
            <span
              className="w-5 h-5 rounded-full text-xs flex items-center justify-center text-white"
              style={{ backgroundColor: theme.accent }}
            >
              {chat.unread}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

const TransactionListPattern: React.FC = () => {
  const theme = useThemeColors();
  const transactions = [
    { icon: '🛒', title: 'Shopping', amount: -45.99, date: 'Today' },
    { icon: '💰', title: 'Salary', amount: 3500.00, date: 'Yesterday' },
    { icon: '☕', title: 'Coffee', amount: -4.50, date: 'Yesterday' },
  ];

  return (
    <div className="space-y-2">
      {transactions.map((tx, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{
            backgroundColor: theme.background.ghost,
            border: `1px solid ${theme.stroke.low}`,
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: theme.background.subtle }}
          >
            {tx.icon}
          </div>
          <div className="flex-1">
            <p className="font-medium" style={{ color: theme.text.high }}>{tx.title}</p>
            <p className="text-xs" style={{ color: theme.text.low }}>{tx.date}</p>
          </div>
          <span
            className="font-semibold"
            style={{ color: tx.amount > 0 ? '#22c55e' : theme.text.high }}
          >
            {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default PatternPreview;

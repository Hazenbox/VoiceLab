import { useState, useCallback } from 'react';
import { Button } from '@marcelinodzn/ds-react';
import { useThemeColors } from '../theme/useColors';

// ── Types ────────────────────────────────────────────────────────

export type UserRole = 'marketing' | 'product' | 'ux_writer' | 'designer' | 'sales' | 'support' | 'leadership';

export interface UserProfile {
  deviceId: string;
  name: string;
  role: UserRole;
  product: string; // ecosystem
}

// ── Constants ────────────────────────────────────────────────────

const ROLES: { id: UserRole; label: string; description: string }[] = [
  { id: 'marketing', label: 'Marketing', description: 'Campaigns, promotions, brand content' },
  { id: 'product', label: 'Product', description: 'Feature copy, release notes, in-app content' },
  { id: 'ux_writer', label: 'UX Writer', description: 'Interface copy, microcopy, flows' },
  { id: 'designer', label: 'Designer', description: 'UI, UX, and product design' },
  { id: 'sales', label: 'Sales', description: 'Pitches, proposals, outreach' },
  { id: 'support', label: 'Support', description: 'Help articles, chat responses, FAQs' },
  { id: 'leadership', label: 'Leadership', description: 'Internal comms, strategy, memos' },
];

const ECOSYSTEMS: { id: string; label: string }[] = [
  { id: 'connectivity', label: 'Connectivity (Jio Mobile, Fiber, Network)' },
  { id: 'home', label: 'Home (JioFiber, Home Entertainment)' },
  { id: 'entertainment', label: 'Entertainment (JioCinema, JioTV, Music)' },
  { id: 'shopping', label: 'Shopping (JioMart, Retail)' },
  { id: 'finance', label: 'Finance (JioPayments, Banking)' },
  { id: 'health', label: 'Health (JioHealthHub, Wellness)' },
  { id: 'business', label: 'Business (Enterprise, B2B)' },
  { id: 'work', label: 'Work (Employee Communications)' },
  { id: 'government', label: 'Government (G2C Services)' },
  { id: 'education', label: 'Education (Learning, Courses)' },
  { id: 'sports', label: 'Sports (Content, Live Streaming)' },
  { id: 'agriculture', label: 'Agriculture (Farmer Services)' },
  { id: 'energy', label: 'Energy (Solar, Clean Energy)' },
  { id: 'transport', label: 'Transport (Mobility, Logistics)' },
];

// ── Storage Keys ─────────────────────────────────────────────────

export const DEVICE_ID_KEY = 'voicelab_device_id';
export const USER_PROFILE_KEY = 'voicelab_user_profile';

// ── Helper: Generate UUID ────────────────────────────────────────

function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Helper: Load/Save Profile ────────────────────────────────────

export function loadUserProfile(): UserProfile | null {
  try {
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Runtime shape validation -- guard against corrupted/outdated localStorage data
    if (
      typeof parsed === 'object' && parsed !== null &&
      typeof parsed.deviceId === 'string' &&
      typeof parsed.name === 'string' &&
      typeof parsed.role === 'string' &&
      typeof parsed.product === 'string'
    ) {
      return parsed as UserProfile;
    }
    console.warn('[OnboardingModal] Invalid stored profile shape, ignoring');
    return null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(DEVICE_ID_KEY, profile.deviceId);
  } catch { /* ignore */ }
}

export function getDeviceId(): string | null {
  try {
    return localStorage.getItem(DEVICE_ID_KEY);
  } catch {
    return null;
  }
}

// ── Onboarding Modal Component ───────────────────────────────────

interface OnboardingModalProps {
  onComplete: (profile: UserProfile) => void;
  existingProfile?: UserProfile;
  onClose?: () => void;
}

export default function OnboardingModal({ onComplete, existingProfile, onClose }: OnboardingModalProps) {
  const [name, setName] = useState(existingProfile?.name || '');
  const [role, setRole] = useState<UserRole | null>(existingProfile?.role || null);
  const [product, setProduct] = useState<string>(existingProfile?.product || '');
  const [nameError, setNameError] = useState('');

  const isEditMode = !!existingProfile;

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      setNameError('Please enter your name');
      return;
    }
    if (!role || !product) return;

    const deviceId = existingProfile?.deviceId || getDeviceId() || generateDeviceId();
    const profile: UserProfile = {
      deviceId,
      name: name.trim(),
      role,
      product,
    };

    saveUserProfile(profile);
    onComplete(profile);
  }, [name, role, product, existingProfile, onComplete]);

  const isValid = name.trim().length > 0 && role !== null && product !== '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose ? (e) => e.target === e.currentTarget && onClose() : undefined}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: 'none',
          maxWidth: '420px',
          width: '92%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          position: 'relative',
        }}
      >
        {/* Close button - only in edit mode */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              color: '#666',
              zIndex: 1,
            }}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Header */}
        <div style={{ padding: '1.25rem', paddingRight: onClose ? '3rem' : '1.25rem' }}>
          <h2 style={{ color: '#1a1a1a', fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
            {isEditMode ? 'Edit Profile' : 'Welcome to Voice Lab'}
          </h2>
          <p style={{ color: '#666', fontSize: '0.8125rem', margin: '0.375rem 0 0', lineHeight: 1.4 }}>
            Your role and product help fine-tune AI content generation to match your context, tone, and goals.
          </p>
        </div>

        {/* Content - Scrollable */}
        <div style={{ padding: '0 1.25rem 1.25rem', overflowY: 'auto', flex: 1 }}>
          {/* Name Field */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                color: '#1a1a1a',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.375rem',
              }}
            >
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              placeholder="Enter your name"
              autoFocus={!isEditMode}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                borderRadius: '8px',
                border: `1px solid ${nameError ? '#ef4444' : '#e0e0e0'}`,
                background: '#f9f9f9',
                color: '#1a1a1a',
                fontSize: '0.8125rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {nameError && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {nameError}
              </p>
            )}
          </div>

          {/* Role Field */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                color: '#1a1a1a',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              Role
            </label>
            <div style={{ display: 'grid', gap: '0.375rem' }}>
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${role === r.id ? '#0066ff' : '#e0e0e0'}`,
                    background: role === r.id ? '#0066ff10' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{
                    color: role === r.id ? '#0066ff' : '#1a1a1a',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}>
                    {r.label}
                  </span>
                  <span style={{
                    color: '#666',
                    fontSize: '0.6875rem',
                    marginTop: '0.0625rem',
                  }}>
                    {r.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Ecosystem Field */}
          <div>
            <label
              style={{
                display: 'block',
                color: '#1a1a1a',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              Product Ecosystem
            </label>
            <div style={{
              display: 'grid',
              gap: '0.25rem',
              maxHeight: '200px',
              overflowY: 'auto',
              paddingRight: '0.25rem',
            }}>
              {ECOSYSTEMS.map((eco) => (
                <button
                  key={eco.id}
                  onClick={() => setProduct(eco.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${product === eco.id ? '#0066ff' : '#e0e0e0'}`,
                    background: product === eco.id ? '#0066ff10' : 'transparent',
                    color: product === eco.id ? '#0066ff' : '#1a1a1a',
                    fontSize: '0.75rem',
                    fontWeight: product === eco.id ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {eco.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <Button
            appearance="primary"
            size="S"
            onPress={handleSubmit}
            isDisabled={!isValid}
          >
            {isEditMode ? 'Save' : 'Get Started'}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { Button } from '@marcelinodzn/ds-react';
import { useThemeColors } from '../theme/useColors';

// ── Types ────────────────────────────────────────────────────────

export type UserRole = 'marketing' | 'product' | 'ux_writer' | 'sales' | 'support' | 'leadership';

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
    return JSON.parse(stored);
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
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [product, setProduct] = useState<string>('');
  const [nameError, setNameError] = useState('');
  const colors = useThemeColors();

  const handleComplete = useCallback(() => {
    if (!name.trim()) {
      setNameError('Please enter your name');
      setStep(1);
      return;
    }
    if (!role) {
      setStep(2);
      return;
    }
    if (!product) {
      setStep(3);
      return;
    }

    const deviceId = getDeviceId() || generateDeviceId();
    const profile: UserProfile = {
      deviceId,
      name: name.trim(),
      role,
      product,
    };

    saveUserProfile(profile);
    onComplete(profile);
  }, [name, role, product, onComplete]);

  const canProceed = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return role !== null;
    if (step === 3) return product !== '';
    return false;
  };

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      setNameError('Please enter your name');
      return;
    }
    if (step < 3) {
      setStep((s) => Math.min(s + 1, 3) as 1 | 2 | 3);
    } else {
      handleComplete();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
        <div
          style={{
            background: colors.background.ghost,
            borderRadius: '16px',
            border: `1px solid ${colors.stroke.medium}`,
            maxWidth: '480px',
            width: '90%',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          {/* Header */}
          <div style={{ padding: '1.5rem 1.5rem 0' }}>
            <h2 style={{ color: colors.text.high, fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Welcome to Voice Lab
            </h2>
            <p style={{ color: colors.text.medium, fontSize: '0.875rem', margin: '0.5rem 0 0' }}>
              Let us set up your experience. This takes 30 seconds.
            </p>

            {/* Step Indicator */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    height: '3px',
                    borderRadius: '2px',
                    background: s <= step ? colors.accent : colors.stroke.low,
                    transition: 'background 0.2s ease',
                  }}
                />
              ))}
            </div>
          </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Step 1: Name */}
          {step === 1 && (
            <div>
              <label
                style={{
                  display: 'block',
                  color: colors.text.high,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                What's your name?
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(''); }}
                placeholder="Enter your name"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && canProceed() && handleNext()}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${nameError ? '#ef4444' : colors.stroke.medium}`,
                  background: colors.background.subtle,
                  color: colors.text.high,
                  fontSize: '0.875rem',
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
          )}

          {/* Step 2: Role */}
          {step === 2 && (
            <div>
              <label
                style={{
                  display: 'block',
                  color: colors.text.high,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                }}
              >
                What's your role?
              </label>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: `1.5px solid ${role === r.id ? colors.accent : colors.stroke.medium}`,
                      background: role === r.id ? colors.accent + '10' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{
                      color: role === r.id ? colors.accent : colors.text.high,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}>
                      {r.label}
                    </span>
                    <span style={{
                      color: colors.text.medium,
                      fontSize: '0.75rem',
                      marginTop: '0.125rem',
                    }}>
                      {r.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Product/Ecosystem */}
          {step === 3 && (
            <div>
              <label
                style={{
                  display: 'block',
                  color: colors.text.high,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                }}
              >
                Which product ecosystem do you primarily work on?
              </label>
              <div style={{
                display: 'grid',
                gap: '0.375rem',
                maxHeight: '320px',
                overflowY: 'auto',
              }}>
                {ECOSYSTEMS.map((eco) => (
                  <button
                    key={eco.id}
                    onClick={() => setProduct(eco.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.625rem 1rem',
                      borderRadius: '8px',
                      border: `1.5px solid ${product === eco.id ? colors.accent : colors.stroke.medium}`,
                      background: product === eco.id ? colors.accent + '10' : 'transparent',
                      color: product === eco.id ? colors.accent : colors.text.high,
                      fontSize: '0.8125rem',
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
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0 1.5rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3)}
              style={{
                background: 'none',
                border: 'none',
                color: colors.text.medium,
                cursor: 'pointer',
                fontSize: '0.875rem',
                padding: '0.5rem 0',
              }}
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <Button
            appearance="primary"
            size="M"
            onPress={handleNext}
            isDisabled={!canProceed()}
          >
            {step === 3 ? 'Get Started' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}

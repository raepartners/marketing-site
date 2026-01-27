import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  codingAgents,
  optOutOptions,
  type OptOutReason,
} from '@/lib/coding-agents';

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}

export type ContactSource = 'nav' | 'footer' | 'homepage_cta' | 'team_cta';

interface ContactFormProps {
  source: ContactSource;
  onSuccess?: () => void;
  onClose?: () => void;
}

interface FormData {
  name: string;
  email: string;
  role: string;
  otherAgent: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  role?: string;
  agents?: string;
  otherAgent?: string;
}

const STORAGE_KEY = 'rae_contact_form_draft';

interface PersistedState {
  formData: FormData;
  selectedAgents: string[];
  otherSelected: boolean;
  optOut: OptOutReason | null;
  savedAt: number;
}

// Expire drafts after 7 days
const DRAFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Load persisted state from localStorage
function loadPersistedState(): Partial<PersistedState> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed: PersistedState = JSON.parse(stored);

    // Check if expired
    if (Date.now() - parsed.savedAt > DRAFT_EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

// Save state to localStorage
function savePersistedState(state: Omit<PersistedState, 'savedAt'>) {
  try {
    const toSave: PersistedState = {
      ...state,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore storage errors
  }
}

// Clear persisted state
function clearPersistedState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function ContactForm({ source, onSuccess, onClose }: ContactFormProps) {
  // Initialize state from localStorage if available
  const initialState = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    return loadPersistedState();
  }, []);

  const [formData, setFormData] = React.useState<FormData>(
    initialState?.formData ?? {
      name: '',
      email: '',
      role: '',
      otherAgent: '',
    }
  );
  const [selectedAgents, setSelectedAgents] = React.useState<Set<string>>(
    new Set(initialState?.selectedAgents ?? [])
  );
  const [otherSelected, setOtherSelected] = React.useState(
    initialState?.otherSelected ?? false
  );
  const [optOut, setOptOut] = React.useState<OptOutReason | null>(
    initialState?.optOut ?? null
  );
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const formStartedRef = React.useRef(false);
  const startTimeRef = React.useRef<number>(Date.now());

  // If we restored state, mark form as started
  React.useEffect(() => {
    if (initialState) {
      formStartedRef.current = true;
      window.posthog?.capture('contact_form_restored', { source });
    }
  }, []);

  // Persist state on changes
  React.useEffect(() => {
    // Only persist if form has been interacted with
    if (!formStartedRef.current) return;

    savePersistedState({
      formData,
      selectedAgents: Array.from(selectedAgents),
      otherSelected,
      optOut,
    });
  }, [formData, selectedAgents, otherSelected, optOut]);

  // Track form opened
  React.useEffect(() => {
    startTimeRef.current = Date.now();
    window.posthog?.capture('contact_form_opened', {
      source,
      device: window.innerWidth >= 768 ? 'desktop' : 'mobile',
      restored: !!initialState,
    });

    // Track abandonment on unmount
    return () => {
      if (!submitSuccess && formStartedRef.current) {
        const filledFields = Object.entries(formData)
          .filter(([_, v]) => v.trim().length > 0)
          .map(([k]) => k);
        if (selectedAgents.size > 0 || otherSelected) filledFields.push('agents');

        window.posthog?.capture('contact_form_abandoned', {
          source,
          fields_filled: filledFields,
          time_on_form_ms: Date.now() - startTimeRef.current,
        });
      }
    };
  }, []);

  const trackFirstInteraction = (field: string) => {
    if (!formStartedRef.current) {
      formStartedRef.current = true;
      window.posthog?.capture('contact_form_started', { first_field: field });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleInputFocus = (field: string) => {
    trackFirstInteraction(field);
  };

  const toggleAgent = (agentId: string) => {
    trackFirstInteraction('agents');

    // If opted out, clicking a tool clears opt-out and adds the tool
    if (optOut) {
      setOptOut(null);
      setSelectedAgents((prev) => {
        const next = new Set(prev);
        next.add(agentId);
        window.posthog?.capture('contact_form_agents_selected', {
          agents: Array.from(next),
          opted_out: false,
        });
        return next;
      });
    } else {
      setSelectedAgents((prev) => {
        const next = new Set(prev);
        if (next.has(agentId)) {
          next.delete(agentId);
        } else {
          next.add(agentId);
        }

        window.posthog?.capture('contact_form_agents_selected', {
          agents: Array.from(next),
          opted_out: false,
        });

        return next;
      });
    }

    if (errors.agents) {
      setErrors((prev) => ({ ...prev, agents: undefined }));
    }
  };

  const toggleOther = () => {
    trackFirstInteraction('agents');

    // If opted out, clicking Other clears opt-out and selects Other
    if (optOut) {
      setOptOut(null);
      setOtherSelected(true);
    } else {
      setOtherSelected((prev) => !prev);
      if (otherSelected) {
        // Clear the text when deselecting Other
        setFormData((prev) => ({ ...prev, otherAgent: '' }));
        setErrors((prev) => ({ ...prev, otherAgent: undefined }));
      }
    }

    if (errors.agents) {
      setErrors((prev) => ({ ...prev, agents: undefined }));
    }
  };

  const handleOptOut = (reason: OptOutReason) => {
    trackFirstInteraction('agents');

    if (optOut === reason) {
      // Deselecting opt-out - restore agent interactivity
      setOptOut(null);
      window.posthog?.capture('contact_form_agents_selected', {
        agents: Array.from(selectedAgents),
        other: otherSelected ? formData.otherAgent : null,
        opted_out: false,
      });
    } else {
      // Selecting opt-out - gray out agents but preserve state
      setOptOut(reason);
      window.posthog?.capture('contact_form_agents_selected', {
        agents: [],
        opted_out: true,
        opt_out_reason: reason,
      });
    }

    if (errors.agents) {
      setErrors((prev) => ({ ...prev, agents: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (formData.name.trim().length < 2) {
      newErrors.name = 'Name is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }

    if (formData.role.trim().length < 2) {
      newErrors.role = 'Role is required';
    }

    // Agent selection validation
    const hasAgentSelection = selectedAgents.size > 0 || otherSelected;
    if (!optOut && !hasAgentSelection) {
      newErrors.agents = 'Select at least one option';
    }

    // Other text is required when Other is selected and not opted out
    if (otherSelected && !optOut && formData.otherAgent.trim().length < 2) {
      newErrors.otherAgent = 'Please specify which agent(s)';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      window.posthog?.capture('contact_form_error', {
        error_type: 'validation',
        fields: Object.keys(newErrors),
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const agents = optOut ? [] : Array.from(selectedAgents);
    if (!optOut && otherSelected && formData.otherAgent.trim()) {
      agents.push(`other: ${formData.otherAgent.trim()}`);
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role.trim(),
      agents,
      optedOut: !!optOut,
      optOutReason: optOut,
      source,
    };

    try {
      const response = await fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      setSubmitSuccess(true);
      clearPersistedState();
      window.posthog?.capture('contact_form_submitted', {
        agents: payload.agents,
        opted_out: payload.optedOut,
        opt_out_reason: payload.optOutReason,
        role: payload.role,
        source,
      });

      onSuccess?.();
    } catch (error) {
      setSubmitError('Something went wrong. Please try again.');
      window.posthog?.capture('contact_form_error', {
        error_type: 'submission',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">&#10003;</div>
        <h3 className="text-xl font-semibold mb-2">Thanks for reaching out!</h3>
        <p className="text-muted-foreground mb-6">
          We'll be in touch soon.
        </p>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    );
  }

  const isOtherInactive = !!optOut;
  const isOtherSelectedButInactive = otherSelected && isOtherInactive;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          onFocus={() => handleInputFocus('name')}
          placeholder="Jane Smith"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Work Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Work Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          onFocus={() => handleInputFocus('email')}
          placeholder="jane@acme.com"
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      {/* Role */}
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Input
          id="role"
          name="role"
          value={formData.role}
          onChange={handleInputChange}
          onFocus={() => handleInputFocus('role')}
          placeholder="Engineering Manager"
          aria-invalid={!!errors.role}
        />
        {errors.role && (
          <p className="text-sm text-destructive">{errors.role}</p>
        )}
      </div>

      {/* Coding Agents */}
      <div className="space-y-3">
        <Label>Which coding agent(s) do you (or your team) use?</Label>

        {/* All agent chips in one flat grid */}
        <div className="flex flex-wrap gap-2">
          {codingAgents.map((agent) => {
            const isSelected = selectedAgents.has(agent.id);
            const isInactive = !!optOut;
            const isSelectedButInactive = isSelected && isInactive;

            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => toggleAgent(agent.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                  // Active selected state
                  isSelected && !isInactive &&
                    'bg-primary text-primary-foreground border-primary',
                  // Selected but inactive (opt-out active) - show preserved selection
                  isSelectedButInactive &&
                    'bg-primary/20 text-primary border-primary/50 border-dashed opacity-60',
                  // Inactive unselected
                  isInactive && !isSelected &&
                    'opacity-40 bg-background border-border',
                  // Normal unselected
                  !isSelected && !isInactive &&
                    'bg-background hover:bg-muted border-border hover:border-primary/50'
                )}
              >
                <img
                  src={agent.icon}
                  alt=""
                  className="w-4 h-4 dark:invert"
                />
                {agent.name}
              </button>
            );
          })}

          {/* Other pill */}
          <button
            type="button"
            onClick={toggleOther}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
              // Active selected state
              otherSelected && !isOtherInactive &&
                'bg-primary text-primary-foreground border-primary',
              // Selected but inactive (opt-out active) - show preserved selection
              isOtherSelectedButInactive &&
                'bg-primary/20 text-primary border-primary/50 border-dashed opacity-60',
              // Inactive unselected
              isOtherInactive && !otherSelected &&
                'opacity-40 bg-background border-border',
              // Normal unselected
              !otherSelected && !isOtherInactive &&
                'bg-background hover:bg-muted border-border hover:border-primary/50'
            )}
          >
            <img
              src="/icons/agents/other.svg"
              alt=""
              className="w-4 h-4 dark:invert"
            />
            Other
          </button>
        </div>

        {/* Other text input - shown when Other is selected */}
        {otherSelected && (
          <div className={cn('space-y-2', isOtherInactive && 'opacity-50')}>
            <Input
              id="otherAgent"
              name="otherAgent"
              value={formData.otherAgent}
              onChange={handleInputChange}
              onFocus={() => handleInputFocus('otherAgent')}
              placeholder="Which one(s)?"
              aria-invalid={!!errors.otherAgent}
              disabled={isOtherInactive}
            />
            {errors.otherAgent && (
              <p className="text-sm text-destructive">{errors.otherAgent}</p>
            )}
          </div>
        )}

        {/* Opt-out options */}
        <div className="pt-2 border-t border-border">
          <div className="flex flex-wrap gap-2">
            {optOutOptions.map((option) => {
              const isSelected = optOut === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptOut(option.id)}
                  className={cn(
                    'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                    isSelected
                      ? 'bg-muted text-foreground border-foreground/30'
                      : 'bg-background hover:bg-muted border-border hover:border-foreground/30'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {errors.agents && (
          <p className="text-sm text-destructive">{errors.agents}</p>
        )}
      </div>

      {/* Submit */}
      {submitError && (
        <p className="text-sm text-destructive">{submitError}</p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Get in touch'}
      </Button>
    </form>
  );
}

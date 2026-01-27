import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  codingAgents,
  agentsByCategory,
  categoryLabels,
  optOutOptions,
  type OptOutReason,
  type AgentCategory,
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
}

interface FormErrors {
  name?: string;
  email?: string;
  role?: string;
  agents?: string;
}

export function ContactForm({ source, onSuccess, onClose }: ContactFormProps) {
  const [formData, setFormData] = React.useState<FormData>({
    name: '',
    email: '',
    role: '',
  });
  const [selectedAgents, setSelectedAgents] = React.useState<Set<string>>(new Set());
  const [optOut, setOptOut] = React.useState<OptOutReason | null>(null);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const formStartedRef = React.useRef(false);
  const startTimeRef = React.useRef<number>(Date.now());

  // Track form opened
  React.useEffect(() => {
    startTimeRef.current = Date.now();
    window.posthog?.capture('contact_form_opened', {
      source,
      device: window.innerWidth >= 768 ? 'desktop' : 'mobile',
    });

    // Track abandonment on unmount
    return () => {
      if (!submitSuccess && formStartedRef.current) {
        const filledFields = Object.entries(formData)
          .filter(([_, v]) => v.trim().length > 0)
          .map(([k]) => k);
        if (selectedAgents.size > 0) filledFields.push('agents');

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

  const handleOptOut = (reason: OptOutReason) => {
    trackFirstInteraction('agents');

    if (optOut === reason) {
      // Deselecting opt-out - restore agent interactivity
      setOptOut(null);
      window.posthog?.capture('contact_form_agents_selected', {
        agents: Array.from(selectedAgents),
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

    if (!optOut && selectedAgents.size === 0) {
      newErrors.agents = 'Select at least one option';
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

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role.trim(),
      agents: optOut ? [] : Array.from(selectedAgents),
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

        {/* Agent chips by category */}
        {(Object.keys(agentsByCategory) as AgentCategory[]).map((category) => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {categoryLabels[category]}
            </p>
            <div className="flex flex-wrap gap-2">
              {agentsByCategory[category].map((agent) => {
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
            </div>
          </div>
        ))}

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

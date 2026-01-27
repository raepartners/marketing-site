interface Env {
  LEADS_BUCKET: R2Bucket;
  SLACK_WEBHOOK_URL: string;
  CF_PAGES_BRANCH?: string;
  CF_PAGES_URL?: string;
}

interface TrackingData {
  posthog_session_id: string | null;
  posthog_distinct_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referrer: string | null;
  landing_page: string | null;
}

interface ContactFormData {
  name: string;
  email: string;
  role: string;
  agents: string[];
  optedOut: boolean;
  optOutReason: string | null;
  source: string;
  tracking?: TrackingData;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const data = await request.json() as ContactFormData;

    // Validate required fields
    if (!data.name?.trim() || !data.email?.trim() || !data.role?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate agent selection
    if (!data.optedOut && (!data.agents || data.agents.length === 0)) {
      return new Response(JSON.stringify({ error: 'Agent selection required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const timestamp = new Date().toISOString();
    const uuid = crypto.randomUUID();

    // Determine environment
    const branch = env.CF_PAGES_BRANCH || 'unknown';
    const isProduction = branch === 'main';
    const envPrefix = isProduction ? 'production' : 'preview';

    // Store in environment-specific path
    const key = `leads/${envPrefix}/${timestamp.split('T')[0]}/${uuid}.json`;

    const lead = {
      ...data,
      submittedAt: timestamp,
      id: uuid,
      environment: envPrefix,
      branch: isProduction ? undefined : branch,
    };

    // Write to R2
    await env.LEADS_BUCKET.put(key, JSON.stringify(lead, null, 2), {
      httpMetadata: { contentType: 'application/json' },
    });

    // Send to Slack
    if (env.SLACK_WEBHOOK_URL) {
      const agentsText = data.optedOut
        ? `_${data.optOutReason === 'none' ? "Doesn't use coding agents yet" : "Uses some, not sure which"}_`
        : data.agents.join(', ') || 'None selected';

      const headerText = isProduction
        ? 'New Contact Form Submission'
        : `[TEST - ${branch}] New Contact Form Submission`;

      const slackPayload = {
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: headerText,
              emoji: true,
            },
          },
          ...(isProduction ? [] : [
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `:warning: *Test submission from preview environment* (${branch})`,
                },
              ],
            },
          ]),
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Name:*\n${data.name}` },
              { type: 'mrkdwn', text: `*Email:*\n${data.email}` },
              { type: 'mrkdwn', text: `*Role:*\n${data.role}` },
              { type: 'mrkdwn', text: `*Source:*\n${data.source}` },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Coding Agents:*\n${agentsText}`,
            },
          },
        ],
      };

      try {
        const slackResponse = await fetch(env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        });
        if (!slackResponse.ok) {
          console.error('Slack notification failed:', slackResponse.status, await slackResponse.text());
        }
      } catch (slackError) {
        console.error('Slack notification error:', slackError);
      }
    }

    return new Response(JSON.stringify({ success: true, id: uuid }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

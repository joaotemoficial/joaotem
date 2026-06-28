<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into João Tem. Changes include client-side initialization via a new `entry.client.tsx` with `PostHogProvider`, a server-side middleware (`app/lib/posthog-middleware.ts`) wired into the root route to create a PostHog Node client per request, user identification in the dashboard layout, error tracking in the global `ErrorBoundary`, and event capture across 6 routes. The vite dev proxy is configured to route PostHog traffic through `/ingest` so ad-blockers don't interfere in development.

| Event | Description | File |
|-------|-------------|------|
| `user_signed_up` | Fired server-side when a new user successfully creates an account. | `app/routes/auth/signup.tsx` |
| `user_logged_in` | Fired server-side when an existing user successfully authenticates. | `app/routes/auth/login.tsx` |
| `business_created` | Fired client-side when a business owner successfully creates a new business listing. | `app/routes/dashboard/business-new.tsx` |
| `product_created` | Fired server-side when a business owner successfully creates a new product. | `app/routes/dashboard/product-new.tsx` |
| `promotion_created` | Fired server-side when a business owner successfully creates a new promotion. | `app/routes/dashboard/promotion-new.tsx` |
| `plan_upgrade_requested` | Fired server-side when a business owner submits a plan upgrade request. | `app/routes/dashboard/upgrade.tsx` |
| `checkout_started` | Fired client-side when a customer opens the checkout page — top of the purchase funnel. | `app/routes/public/business-checkout.tsx` |
| `order_sent_to_whatsapp` | Fired client-side when a customer sends an order via WhatsApp — the primary conversion event. | `app/routes/public/business-checkout.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) dashboard](https://us.posthog.com/project/489776/dashboard/1771632)
- [New Signups Over Time](https://us.posthog.com/project/489776/insights/w947Bn7a)
- [New Businesses Created](https://us.posthog.com/project/489776/insights/Hk2BnVwV)
- [WhatsApp Orders Sent](https://us.posthog.com/project/489776/insights/miMLMtcv)
- [Signup to Business Creation Funnel](https://us.posthog.com/project/489776/insights/kG8de9tn)
- [Plan Upgrade Requests](https://us.posthog.com/project/489776/insights/EyWt8etU)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` to `.env.example` and any monorepo/bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — the dashboard layout calls `identify` on every mount, so returning users will be re-identified when they navigate to `/dashboard` after a session gap.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

export const publicLinks = {
  signIn: process.env.NEXT_PUBLIC_ERP_SIGN_IN_URL ?? "/sign-in",
  startWorkspace: process.env.NEXT_PUBLIC_ONBOARDING_URL ?? "/website/onboarding",
  erp: process.env.NEXT_PUBLIC_ERP_URL ?? "/sign-in",
  portal: process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL ?? "/solutions/customers",
  field: process.env.NEXT_PUBLIC_FIELD_URL ?? "/mobile",
  api: process.env.NEXT_PUBLIC_API_DOCS_URL ?? "/integrations",
};

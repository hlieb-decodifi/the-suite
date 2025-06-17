import { EmailConfirmedTemplate } from '@/components/templates';

export default async function EmailConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const hasError = !!params.error;

  return (
    <EmailConfirmedTemplate hasError={hasError} message={params.message} />
  );
}

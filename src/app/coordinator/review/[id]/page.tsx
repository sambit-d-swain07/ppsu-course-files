import CoordinatorReviewClient from './CoordinatorReviewClient';

export const dynamic = 'force-dynamic';

export default async function CoordinatorReviewPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  return <CoordinatorReviewClient courseFileId={id} />;
}

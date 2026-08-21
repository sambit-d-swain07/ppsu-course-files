import FacultyCourseFileDetailClient from './FacultyCourseFileDetailClient';

export const dynamic = 'force-dynamic';

export default async function FacultyCourseFilePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  return <FacultyCourseFileDetailClient courseFileId={id} />;
}

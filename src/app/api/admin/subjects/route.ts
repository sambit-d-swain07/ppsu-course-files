import { NextRequest, NextResponse } from 'next/server';
import { createSubject, getSubjects, getUsers, updateSubject } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get('ppsu_auth_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.role === 'ADMIN' ? payload : null;
}

function validateAssignments(body: any, users: any[]) {
  const required = ['subjectCode', 'subjectName', 'department', 'school', 'semester', 'academicYear', 'courseCoordinatorId', 'courseTeacherId', 'evaluatorId'];
  if (required.some(key => !String(body[key] ?? '').trim())) return 'All subject and required role fields are required';
  const byId = new Map(users.map(user => [user.id, user]));
  const coordinator = byId.get(body.courseCoordinatorId);
  const teacher = byId.get(body.courseTeacherId);
  const evaluator = byId.get(body.evaluatorId);
  const labTeacher = body.labTeacherId ? byId.get(body.labTeacherId) : null;
  if (coordinator?.role !== 'COORDINATOR' || evaluator?.role !== 'COORDINATOR') return 'Course Coordinator and Evaluator must be Coordinator users';
  if (teacher?.role !== 'FACULTY' || (body.labTeacherId && labTeacher?.role !== 'FACULTY')) return 'Course Teacher and Lab Teacher must be Faculty users';
  return null;
}

function normalize(body: any) {
  return {
    subjectCode: String(body.subjectCode).trim().toUpperCase(),
    subjectName: String(body.subjectName).trim(),
    department: String(body.department).trim(),
    school: String(body.school).trim(),
    semester: String(body.semester).trim(),
    academicYear: String(body.academicYear).trim(),
    courseCoordinatorId: body.courseCoordinatorId,
    courseTeacherId: body.courseTeacherId,
    labTeacherId: body.labTeacherId || null,
    evaluatorId: body.evaluatorId
  };
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const [subjects, users] = await Promise.all([getSubjects(), getUsers()]);
  return NextResponse.json({ subjects, users: users.filter(user => user.role === 'FACULTY' || user.role === 'COORDINATOR') });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await req.json();
    const users = await getUsers();
    const error = validateAssignments(body, users);
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ subject: await createSubject(normalize(body)) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to create subject' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'Subject id is required' }, { status: 400 });
    const users = await getUsers();
    const error = validateAssignments(body, users);
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ subject: await updateSubject(body.id, normalize(body)) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to update subject' }, { status: 500 });
  }
}

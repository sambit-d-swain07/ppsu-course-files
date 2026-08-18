import { NextRequest, NextResponse } from 'next/server';
import { getUsers, assignFacultyCoordinator, getCourseFileStatusCountsByFaculty } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [allUsers, statusCounts] = await Promise.all([
      getUsers(),
      getCourseFileStatusCountsByFaculty()
    ]);
    const faculty = allUsers.filter(u => u.role === 'FACULTY').map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      employeeId: u.employeeId,
      department: u.department,
      school: u.school,
      assignedCoordinatorId: u.assignedCoordinatorId,
      assignedCoordinatorName: u.assignedCoordinatorId ? allUsers.find(v => v.id === u.assignedCoordinatorId)?.name : 'Unassigned',
      statusCounts: statusCounts[u.id] ?? { completed: 0, pending: 0, revision: 0 }
    }));

    const coordinators = allUsers.filter(u => u.role === 'COORDINATOR').map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      department: u.department,
      designation: u.designation
    }));

    return NextResponse.json({ faculty, coordinators });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { facultyId, coordinatorId } = await req.json();
    if (!facultyId || coordinatorId === undefined) {
      return NextResponse.json({ error: 'facultyId and coordinatorId are required' }, { status: 400 });
    }

    const success = await assignFacultyCoordinator(facultyId, coordinatorId);
    if (!success) {
      return NextResponse.json({ error: 'Faculty member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Coordinator assigned successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

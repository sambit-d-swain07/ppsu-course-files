import { NextRequest, NextResponse } from 'next/server';
import { getUsers, assignFacultyCoordinator, getCourseFileStatusCountsByFaculty } from '@/lib/mock-data';
import { verifyToken } from '@/lib/jwt';
import { noStoreJson } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return noStoreJson({ error: 'Forbidden' }, { status: 403 });
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
      employeeId: u.employeeId,
      department: u.department,
      school: u.school,
      designation: u.designation
    }));

    const admins = allUsers.filter(u => u.role === 'ADMIN').map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      employeeId: u.employeeId,
      department: u.department,
      school: u.school,
      designation: u.designation
    }));

    return noStoreJson({ faculty, coordinators, admins });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('ppsu_auth_token')?.value;
    if (!token) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return noStoreJson({ error: 'Forbidden' }, { status: 403 });
    }

    const { facultyId, coordinatorId } = await req.json();
    if (!facultyId || coordinatorId === undefined) {
      return noStoreJson({ error: 'facultyId and coordinatorId are required' }, { status: 400 });
    }

    const success = await assignFacultyCoordinator(facultyId, coordinatorId);
    if (!success) {
      return noStoreJson({ error: 'Faculty member not found' }, { status: 404 });
    }

    return noStoreJson({ success: true, message: 'Coordinator assigned successfully' });
  } catch (error: any) {
    return noStoreJson({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

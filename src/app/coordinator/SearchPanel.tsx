'use client';

import { useState, useEffect } from 'react';
import { Row, Col, Form, Button } from 'react-bootstrap';

interface SearchPanelProps {
  onSearch: (courseFileId: string) => void;
  buttonText?: string;
}

export default function SearchPanel({ onSearch, buttonText = "Go to Evaluation" }: SearchPanelProps) {
  const [schools, setSchools] = useState<string[]>(['School of Engineering']);
  const [selectedSchool, setSelectedSchool] = useState('School of Engineering');
  const [employeeId, setEmployeeId] = useState('');
  const [faculties, setFaculties] = useState<any[]>([]);
  const [filteredFaculties, setFilteredFaculties] = useState<any[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [selectedCourseFileId, setSelectedCourseFileId] = useState('');

  // Fetch course files & extrapolate faculty and schools
  useEffect(() => {
    fetch('/api/course-files')
      .then(res => res.json())
      .then(data => {
        if (data.courseFiles && data.courseFiles.length > 0) {
          setCourses(data.courseFiles);
          
          // Extrapolate unique schools and faculty
          const schoolSet = new Set<string>();
          const facultyMap = new Map();

          data.courseFiles.forEach((cf: any) => {
            const sch = cf.school || cf.faculty?.school || 'School of Engineering';
            schoolSet.add(sch);
            if (cf.faculty) {
              facultyMap.set(cf.faculty.id, {
                ...cf.faculty,
                school: sch
              });
            }
          });

          const schoolList = Array.from(schoolSet);
          const facultyList = Array.from(facultyMap.values());

          setSchools(schoolList);
          setFaculties(facultyList);

          if (!selectedSchool && schoolList.length > 0) {
            setSelectedSchool(schoolList[0]);
          }
          if (facultyList.length > 0) {
            setFilteredFaculties(facultyList);
          }
        }
      })
      .catch(err => console.error('SearchPanel fetch error:', err));
  }, []);

  // Filter faculties when School changes
  useEffect(() => {
    if (selectedSchool) {
      const filtered = faculties.filter(f => !f.school || f.school === selectedSchool);
      setFilteredFaculties(filtered.length > 0 ? filtered : faculties);
    } else {
      setFilteredFaculties(faculties);
    }
  }, [selectedSchool, faculties]);

  // Filter faculty by Employee ID input
  useEffect(() => {
    if (employeeId.trim()) {
      const match = faculties.find(f => f.employeeId?.toLowerCase() === employeeId.trim().toLowerCase());
      if (match) {
        setSelectedSchool(match.school || 'School of Engineering');
        setSelectedFacultyId(match.id);
      }
    }
  }, [employeeId, faculties]);

  // Filter courses when Faculty changes
  useEffect(() => {
    if (selectedFacultyId) {
      const filtered = courses.filter(c => c.facultyId === selectedFacultyId);
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses(courses);
    }
  }, [selectedFacultyId, courses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCourseFileId) {
      onSearch(selectedCourseFileId);
    } else if (filteredCourses.length > 0) {
      onSearch(filteredCourses[0].id);
    }
  };

  return (
    <div className="card-custom bg-white mb-4 border shadow-sm">
      <h6 className="fw-bold text-navy-900 mb-3">Find a Faculty Course File</h6>
      <Form onSubmit={handleSubmit}>
        <Row className="g-3 align-items-end">
          <Col xs={12} sm={6} md={3}>
            <Form.Group controlId="searchSchool">
              <Form.Label className="small fw-semibold text-secondary">School</Form.Label>
              <Form.Select 
                value={selectedSchool} 
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="py-2"
              >
                <option value="">-- All Schools --</option>
                {schools.map(s => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col xs={12} sm={6} md={2}>
            <Form.Group controlId="searchEmployeeId">
              <Form.Label className="small fw-semibold text-secondary">Faculty Employee ID</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g. CE00123"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="py-2"
              />
            </Form.Group>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Form.Group controlId="searchFaculty">
              <Form.Label className="small fw-semibold text-secondary">Faculty Member</Form.Label>
              <Form.Select 
                value={selectedFacultyId} 
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                className="py-2"
              >
                <option value="">-- Select Faculty --</option>
                {filteredFaculties.map(f => <option key={f.id} value={f.id}>{f.name} ({f.employeeId || f.department})</option>)}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Form.Group controlId="searchCourse">
              <Form.Label className="small fw-semibold text-secondary">Course Code/Title</Form.Label>
              <Form.Select 
                value={selectedCourseFileId} 
                onChange={(e) => setSelectedCourseFileId(e.target.value)}
                className="py-2"
              >
                <option value="">-- Select Course --</option>
                {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.courseCode} - {c.courseTitle}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col xs={12} md={1} className="text-end">
            <Button 
              type="submit" 
              className="btn-ppsu-navy w-100 py-2 border-0" 
              disabled={!selectedCourseFileId && filteredCourses.length === 0}
            >
              Search
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
}

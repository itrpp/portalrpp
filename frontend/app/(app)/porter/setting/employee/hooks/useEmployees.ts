'use client';

import type {
  EmploymentType,
  Position,
  PorterEmployee,
} from '@/types/porter';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { addToast } from '@heroui/react';

export function useEmployees() {
  const [employees, setEmployees] = useState<PorterEmployee[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] =
    useState<PorterEmployee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmploymentTypeId, setFilterEmploymentTypeId] = useState('');
  const [filterPositionId, setFilterPositionId] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return employees.filter((item) => {
      if (query) {
        const searchText = [
          item.citizenId,
          item.firstName,
          item.lastName,
          item.nickname ?? '',
        ]
          .join(' ')
          .toLowerCase();

        if (!searchText.includes(query)) {
          return false;
        }
      }

      if (
        filterEmploymentTypeId &&
        String(item.employmentTypeId) !== filterEmploymentTypeId
      ) {
        return false;
      }

      if (
        filterPositionId &&
        String(item.positionId) !== filterPositionId
      ) {
        return false;
      }

      if (filterStatus === 'active' && !item.status) {
        return false;
      }

      if (filterStatus === 'inactive' && item.status) {
        return false;
      }

      return true;
    });
  }, [
    employees,
    searchQuery,
    filterEmploymentTypeId,
    filterPositionId,
    filterStatus,
  ]);

  useEffect(() => {
    const loadEmploymentTypes = async () => {
      try {
        const response = await fetch('/api/hrd/person-types');
        const result = await response.json();

        if (result.success && result.data) {
          const formattedData = result.data.map(
            (item: { id: number; name: string }) => ({
              id: String(item.id),
              name: item.name,
              status: true,
              createdAt: undefined,
              updatedAt: undefined,
            }),
          );

          setEmploymentTypes(formattedData);
        }
      } catch {
        // Error loading employment types
      }
    };

    const loadPositions = async () => {
      try {
        const response = await fetch('/api/hrd/positions');
        const result = await response.json();

        if (result.success && result.data) {
          const formattedData = result.data.map(
            (item: { id: number; name: string }) => ({
              id: String(item.id),
              name: item.name,
              status: true,
              createdAt: undefined,
              updatedAt: undefined,
            }),
          );

          setPositions(formattedData);
        }
      } catch {
        // Error loading positions
      }
    };

    loadEmploymentTypes();
    loadPositions();
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/porter/employees');
      const result = await response.json();

      if (result.success && result.data) {
        setEmployees(result.data);
      } else {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description:
            result.message || 'ไม่สามารถโหลดข้อมูลเจ้าหน้าที่ได้',
          color: 'danger',
        });
      }
    } catch {
      addToast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลเจ้าหน้าที่ได้',
        color: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleDeleteEmployee = useCallback(
    async (employeeId: string) => {
      const employee = employees.find((e) => e.id === employeeId);

      if (
        !confirm(
          `คุณแน่ใจหรือไม่ว่าต้องการลบเจ้าหน้าที่ "${employee?.firstName} ${employee?.lastName}"?`,
        )
      ) {
        return;
      }

      try {
        setIsDeleting(employeeId);
        const response = await fetch(`/api/porter/employees/${employeeId}`, {
          method: 'DELETE',
        });
        const result = await response.json();

        if (result.success) {
          setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
          addToast({
            title: 'ลบเจ้าหน้าที่สำเร็จ',
            description: 'เจ้าหน้าที่ถูกลบออกจากระบบแล้ว',
            color: 'success',
          });
        } else {
          addToast({
            title: 'เกิดข้อผิดพลาด',
            description: result.message || 'ไม่สามารถลบเจ้าหน้าที่ได้',
            color: 'danger',
          });
        }
      } catch {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถลบเจ้าหน้าที่ได้',
          color: 'danger',
        });
      } finally {
        setIsDeleting(null);
      }
    },
    [employees],
  );

  const handleSaveEmployee = useCallback(
    async (
      employeeData: Omit<PorterEmployee, 'id'> & { id?: string },
    ) => {
      try {
        setIsSaving(true);

        if (!editingEmployee) {
          const existingEmployee = employees.find(
            (e) => e.citizenId === employeeData.citizenId,
          );

          if (existingEmployee) {
            addToast({
              title: 'เกิดข้อผิดพลาด',
              description: 'เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว',
              color: 'danger',
            });
            throw new Error('เลขบัตรประชาชนซ้ำ');
          }
        }

        if (editingEmployee) {
          const response = await fetch(
            `/api/porter/employees/${editingEmployee.id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firstName: employeeData.firstName,
                lastName: employeeData.lastName,
                nickname: employeeData.nickname,
                profileImage: employeeData.profileImage,
                employmentTypeId: employeeData.employmentTypeId,
                positionId: employeeData.positionId,
                status: employeeData.status,
                userId: employeeData.userId,
              }),
            },
          );
          const result = await response.json();

          if (result.success && result.data) {
            setEmployees((prev) =>
              prev.map((e) =>
                e.id === editingEmployee.id ? result.data : e,
              ),
            );
            addToast({
              title: 'แก้ไขเจ้าหน้าที่สำเร็จ',
              description: 'ข้อมูลเจ้าหน้าที่ถูกอัปเดตแล้ว',
              color: 'success',
            });
          } else {
            addToast({
              title: 'เกิดข้อผิดพลาด',
              description:
                result.message || 'ไม่สามารถแก้ไขเจ้าหน้าที่ได้',
              color: 'danger',
            });
            throw new Error(
              result.message || 'ไม่สามารถแก้ไขเจ้าหน้าที่ได้',
            );
          }
        } else {
          const response = await fetch('/api/porter/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              citizenId: employeeData.citizenId,
              firstName: employeeData.firstName,
              lastName: employeeData.lastName,
              nickname: employeeData.nickname,
              profileImage: employeeData.profileImage,
              employmentTypeId: employeeData.employmentTypeId,
              positionId: employeeData.positionId,
              status: employeeData.status,
              userId: employeeData.userId,
            }),
          });
          const result = await response.json();

          if (result.success && result.data) {
            setEmployees((prev) => [...prev, result.data]);
            addToast({
              title: 'เพิ่มเจ้าหน้าที่สำเร็จ',
              description: 'เจ้าหน้าที่ใหม่ถูกเพิ่มเข้าไปในระบบแล้ว',
              color: 'success',
            });
          } else {
            addToast({
              title: 'เกิดข้อผิดพลาด',
              description:
                result.message || 'ไม่สามารถเพิ่มเจ้าหน้าที่ได้',
              color: 'danger',
            });
            throw new Error(
              result.message || 'ไม่สามารถเพิ่มเจ้าหน้าที่ได้',
            );
          }
        }

        setEditingEmployee(null);
      } catch (error) {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถบันทึกเจ้าหน้าที่ได้',
          color: 'danger',
        });
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [editingEmployee, employees],
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterEmploymentTypeId('');
    setFilterPositionId('');
    setFilterStatus('');
  }, []);

  return {
    employees,
    employmentTypes,
    positions,
    isLoading,
    isSaving,
    isDeleting,
    editingEmployee,
    setEditingEmployee,
    searchQuery,
    setSearchQuery,
    filterEmploymentTypeId,
    setFilterEmploymentTypeId,
    filterPositionId,
    setFilterPositionId,
    filterStatus,
    setFilterStatus,
    filteredEmployees,
    handleDeleteEmployee,
    handleSaveEmployee,
    clearFilters,
  };
}

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@heroui/react';
import { api } from '@/app/api';
import { toast } from 'react-hot-toast';

// ========================================
// ACTIVE SESSIONS COMPONENT
// ========================================

interface Session {
  id: string;
  sessionToken: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expires: string;
  isCurrentSession: boolean;
}

export function ActiveSessions() {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (session) {
      loadSessions();
    }
  }, [session]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await api.getActiveSessions(session);

      if (response.success && response.data) {
        setSessions(response.data.sessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล session');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      setRevoking(true);
      const response = await api.revokeOtherSessions(session);

      if (response.success) {
        toast.success('ลบ session อื่นๆ สำเร็จ');
        await loadSessions();
        onClose();
      } else {
        toast.error(response.message || 'เกิดข้อผิดพลาดในการลบ session');
      }
    } catch (error) {
      console.error('Error revoking sessions:', error);
      toast.error('เกิดข้อผิดพลาดในการลบ session');
    } finally {
      setRevoking(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH');
  };

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return 'ไม่ทราบ';

    // ตรวจสอบ browser
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';

    return 'Browser อื่น';
  };

  if (loading) {
    return (
      <Card>
        <CardBody className="flex justify-center items-center py-8">
          <Spinner size="lg" />
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Session ที่ใช้งานอยู่</h3>
            <p className="text-sm text-default-500">
              จำนวน session ทั้งหมด: {sessions.length}
            </p>
          </div>
          {sessions.length > 1 && (
            <Button
              color="danger"
              variant="flat"
              onPress={onOpen}
            >
              ลบ Session อื่นๆ
            </Button>
          )}
        </CardHeader>
        <CardBody>
          <Table aria-label="รายการ session">
            <TableHeader>
              <TableColumn>อุปกรณ์</TableColumn>
              <TableColumn>IP Address</TableColumn>
              <TableColumn>วันที่เข้าใช้งาน</TableColumn>
              <TableColumn>สถานะ</TableColumn>
            </TableHeader>
            <TableBody>
              {sessions.map((sessionItem) => (
                <TableRow key={sessionItem.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {getDeviceInfo(sessionItem.userAgent)}
                      </p>
                      <p className="text-xs text-default-500">
                        {sessionItem.userAgent?.substring(0, 50)}...
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {sessionItem.ipAddress || 'ไม่ทราบ'}
                  </TableCell>
                  <TableCell>
                    {formatDate(sessionItem.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={sessionItem.isCurrentSession ? 'success' : 'default'}
                      size="sm"
                    >
                      {sessionItem.isCurrentSession ? 'Session ปัจจุบัน' : 'Session อื่น'}
                    </Chip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>ยืนยันการลบ Session</ModalHeader>
          <ModalBody>
            <p>
              คุณต้องการลบ session อื่นๆ ทั้งหมดหรือไม่?
              การดำเนินการนี้จะทำให้ session อื่นๆ หมดอายุทันที
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              ยกเลิก
            </Button>
            <Button
              color="danger"
              onPress={handleRevokeOtherSessions}
              isLoading={revoking}
            >
              ลบ Session อื่นๆ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
} 
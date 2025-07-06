'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    department?: string;
    position?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const { user, token } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    department: '',
    position: ''
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/user/${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
        setEditData({
          firstName: data.profile?.firstName || '',
          lastName: data.profile?.lastName || '',
          phone: data.profile?.phone || '',
          address: data.profile?.address || '',
          department: data.profile?.department || '',
          position: data.profile?.position || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/user/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: editData
        }),
      });

      if (response.ok) {
        await fetchUserProfile();
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">โปรไฟล์ผู้ใช้</h1>
              <p className="mt-2 text-gray-600">จัดการข้อมูลส่วนตัวของคุณ</p>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">ข้อมูลส่วนตัว</h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    {isEditing ? 'ยกเลิก' : 'แก้ไข'}
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ข้อมูลบัญชี */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">ข้อมูลบัญชี</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">อีเมล</label>
                      <div className="mt-1 text-sm text-gray-900">{user?.email}</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">ชื่อผู้ใช้</label>
                      <div className="mt-1 text-sm text-gray-900">{user?.name}</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">บทบาท</label>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user?.role === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">วันที่สมัคร</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                      </div>
                    </div>
                  </div>

                  {/* ข้อมูลส่วนตัว */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">ข้อมูลส่วนตัว</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ชื่อจริง</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.firstName}
                          onChange={(e) => setEditData({...editData, firstName: e.target.value})}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <div className="mt-1 text-sm text-gray-900">
                          {userProfile?.profile?.firstName || 'ไม่ระบุ'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">นามสกุล</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.lastName}
                          onChange={(e) => setEditData({...editData, lastName: e.target.value})}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <div className="mt-1 text-sm text-gray-900">
                          {userProfile?.profile?.lastName || 'ไม่ระบุ'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">เบอร์โทร</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editData.phone}
                          onChange={(e) => setEditData({...editData, phone: e.target.value})}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <div className="mt-1 text-sm text-gray-900">
                          {userProfile?.profile?.phone || 'ไม่ระบุ'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">ที่อยู่</label>
                      {isEditing ? (
                        <textarea
                          value={editData.address}
                          onChange={(e) => setEditData({...editData, address: e.target.value})}
                          rows={3}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <div className="mt-1 text-sm text-gray-900">
                          {userProfile?.profile?.address || 'ไม่ระบุ'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">แผนก</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.department}
                          onChange={(e) => setEditData({...editData, department: e.target.value})}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <div className="mt-1 text-sm text-gray-900">
                          {userProfile?.profile?.department || 'ไม่ระบุ'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">ตำแหน่ง</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.position}
                          onChange={(e) => setEditData({...editData, position: e.target.value})}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <div className="mt-1 text-sm text-gray-900">
                          {userProfile?.profile?.position || 'ไม่ระบุ'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleSave}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      บันทึก
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 
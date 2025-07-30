'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Calendar,
  Divider,
  ButtonGroup,
  Spinner,
} from '@heroui/react';
import {
  PlusIcon,
  SearchIcon,
  FilterIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ChartBarIcon,
  TrendingUpIcon,
  CurrencyDollarIcon,
  UsersIcon,
  CalendarIcon,
} from '@/components/icons';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface RevenueCollection {
  id: string;
  referenceNumber: string;
  category: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  payerName: string;
  payerType: string;
  description: string;
  collectionDate: string;
  status: string;
  receiptNumber?: string;
  notes?: string;
}

interface RevenueSummary {
  totalAmount: number;
  totalCount: number;
  byCategory: Record<string, { amount: number; count: number }>;
  byPaymentMethod: Record<string, { amount: number; count: number }>;
}

export default function RevenuePage() {
  const [revenues, setRevenues] = useState<RevenueCollection[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRevenue, setNewRevenue] = useState({
    category: '',
    amount: '',
    paymentMethod: '',
    payerName: '',
    payerType: '',
    description: '',
    collectionDate: new Date(),
    receiptNumber: '',
    notes: '',
  });

  // ข้อมูลจำลอง
  const mockRevenues: RevenueCollection[] = [
    {
      id: '1',
      referenceNumber: 'REV-20241201-00001',
      category: 'TAX',
      amount: 5000,
      currency: 'THB',
      paymentMethod: 'CASH',
      payerName: 'บริษัท เอ จำกัด',
      payerType: 'COMPANY',
      description: 'ภาษีมูลค่าเพิ่ม',
      collectionDate: '2024-12-01',
      status: 'COLLECTED',
      receiptNumber: 'R001',
    },
    {
      id: '2',
      referenceNumber: 'REV-20241201-00002',
      category: 'FEE',
      amount: 2000,
      currency: 'THB',
      paymentMethod: 'TRANSFER',
      payerName: 'นายสมชาย ใจดี',
      payerType: 'INDIVIDUAL',
      description: 'ค่าธรรมเนียมการบริการ',
      collectionDate: '2024-12-01',
      status: 'PENDING',
    },
    {
      id: '3',
      referenceNumber: 'REV-20241201-00003',
      category: 'FINE',
      amount: 1500,
      currency: 'THB',
      paymentMethod: 'CREDIT_CARD',
      payerName: 'บริษัท บี จำกัด',
      payerType: 'COMPANY',
      description: 'ค่าปรับการละเมิด',
      collectionDate: '2024-12-01',
      status: 'COLLECTED',
      receiptNumber: 'R002',
    },
  ];

  const mockSummary: RevenueSummary = {
    totalAmount: 8500,
    totalCount: 3,
    byCategory: {
      TAX: { amount: 5000, count: 1 },
      FEE: { amount: 2000, count: 1 },
      FINE: { amount: 1500, count: 1 },
    },
    byPaymentMethod: {
      CASH: { amount: 5000, count: 1 },
      TRANSFER: { amount: 2000, count: 1 },
      CREDIT_CARD: { amount: 1500, count: 1 },
    },
  };

  useEffect(() => {
    // จำลองการโหลดข้อมูล
    setTimeout(() => {
      setRevenues(mockRevenues);
      setSummary(mockSummary);
      setLoading(false);
    }, 1000);
  }, []);

  const handleAddRevenue = () => {
    // จำลองการเพิ่มรายการรายได้
    const newRevenueItem: RevenueCollection = {
      id: Date.now().toString(),
      referenceNumber: `REV-${format(new Date(), 'yyyyMMdd')}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
      category: newRevenue.category,
      amount: parseFloat(newRevenue.amount),
      currency: 'THB',
      paymentMethod: newRevenue.paymentMethod,
      payerName: newRevenue.payerName,
      payerType: newRevenue.payerType,
      description: newRevenue.description,
      collectionDate: format(newRevenue.collectionDate, 'yyyy-MM-dd'),
      status: 'PENDING',
      receiptNumber: newRevenue.receiptNumber,
      notes: newRevenue.notes,
    };

    setRevenues([newRevenueItem, ...revenues]);
    setShowAddDialog(false);
    setNewRevenue({
      category: '',
      amount: '',
      paymentMethod: '',
      payerName: '',
      payerType: '',
      description: '',
      collectionDate: new Date(),
      receiptNumber: '',
      notes: '',
    });
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'warning', text: 'รอดำเนินการ' },
      COLLECTED: { color: 'success', text: 'จัดเก็บแล้ว' },
      OVERDUE: { color: 'danger', text: 'เกินกำหนด' },
      CANCELLED: { color: 'default', text: 'ยกเลิก' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Chip color={config.color as any}>{config.text}</Chip>;
  };

  const getCategoryName = (category: string) => {
    const categories = {
      TAX: 'ภาษี',
      FEE: 'ค่าธรรมเนียม',
      FINE: 'ค่าปรับ',
      LICENSE: 'ใบอนุญาต',
      OTHER: 'อื่นๆ',
    };
    return categories[category as keyof typeof categories] || category;
  };

  const getPaymentMethodName = (method: string) => {
    const methods = {
      CASH: 'เงินสด',
      TRANSFER: 'โอนเงิน',
      CREDIT_CARD: 'บัตรเครดิต',
      DEBIT_CARD: 'บัตรเดบิต',
      CHECK: 'เช็ค',
      OTHER: 'อื่นๆ',
    };
    return methods[method as keyof typeof methods] || method;
  };

  const getPayerTypeName = (type: string) => {
    const types = {
      INDIVIDUAL: 'บุคคล',
      COMPANY: 'บริษัท',
      GOVERNMENT: 'รัฐบาล',
      OTHER: 'อื่นๆ',
    };
    return types[type as keyof typeof types] || type;
  };

  const filteredRevenues = revenues.filter(revenue => {
    const matchesSearch = revenue.payerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      revenue.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      revenue.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || revenue.category === selectedCategory;
    const matchesStatus = !selectedStatus || revenue.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ระบบงานจัดเก็บรายได้</h1>
          <p className="text-gray-600 mt-2">จัดการและติดตามรายการรายได้ทั้งหมด</p>
        </div>
        <Button
          color="primary"
          startContent={<PlusIcon />}
          onClick={() => setShowAddDialog(true)}
        >
          เพิ่มรายการรายได้
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">รายได้รวม</h3>
            <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">{summary?.totalAmount.toLocaleString()} บาท</div>
            <p className="text-xs text-muted-foreground">จาก {summary?.totalCount} รายการ</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">รายการใหม่</h3>
            <DocumentTextIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">{revenues.filter(r => r.status === 'PENDING').length}</div>
            <p className="text-xs text-muted-foreground">รอดำเนินการ</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">รายได้วันนี้</h3>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">
              {revenues
                .filter(r => r.collectionDate === format(new Date(), 'yyyy-MM-dd'))
                .reduce((sum, r) => sum + r.amount, 0)
                .toLocaleString()} บาท
            </div>
            <p className="text-xs text-muted-foreground">จากวันนี้</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">ผู้ชำระเงิน</h3>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold">{new Set(revenues.map(r => r.payerName)).size}</div>
            <p className="text-xs text-muted-foreground">รายบุคคล/บริษัท</p>
          </CardBody>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs aria-label="Revenue tabs">
        <Tab key="list" title="รายการรายได้">
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <h3 className="flex items-center gap-2">
                  <FilterIcon className="h-4 w-4" />
                  ตัวกรอง
                </h3>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">ค้นหา</label>
                    <Input
                      placeholder="ค้นหาชื่อผู้ชำระ, เลขที่อ้างอิง..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      startContent={<SearchIcon className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">หมวดหมู่</label>
                    <Select
                      placeholder="เลือกหมวดหมู่"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <SelectItem key="" value="">ทั้งหมด</SelectItem>
                      <SelectItem key="TAX" value="TAX">ภาษี</SelectItem>
                      <SelectItem key="FEE" value="FEE">ค่าธรรมเนียม</SelectItem>
                      <SelectItem key="FINE" value="FINE">ค่าปรับ</SelectItem>
                      <SelectItem key="LICENSE" value="LICENSE">ใบอนุญาต</SelectItem>
                      <SelectItem key="OTHER" value="OTHER">อื่นๆ</SelectItem>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">สถานะ</label>
                    <Select
                      placeholder="เลือกสถานะ"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <SelectItem key="" value="">ทั้งหมด</SelectItem>
                      <SelectItem key="PENDING" value="PENDING">รอดำเนินการ</SelectItem>
                      <SelectItem key="COLLECTED" value="COLLECTED">จัดเก็บแล้ว</SelectItem>
                      <SelectItem key="OVERDUE" value="OVERDUE">เกินกำหนด</SelectItem>
                      <SelectItem key="CANCELLED" value="CANCELLED">ยกเลิก</SelectItem>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">การดำเนินการ</label>
                    <ButtonGroup>
                      <Button variant="bordered" size="sm" startContent={<ArrowDownTrayIcon className="h-4 w-4" />}>
                        ส่งออก
                      </Button>
                      <Button variant="bordered" size="sm" startContent={<ChartBarIcon className="h-4 w-4" />}>
                        สรุป
                      </Button>
                    </ButtonGroup>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Revenue Table */}
            <Card>
              <CardHeader>
                <h3>รายการรายได้</h3>
                <p className="text-sm text-gray-600">
                  แสดงรายการรายได้ทั้งหมด {filteredRevenues.length} รายการ
                </p>
              </CardHeader>
              <CardBody>
                <Table aria-label="Revenue table">
                  <TableHeader>
                    <TableColumn>เลขที่อ้างอิง</TableColumn>
                    <TableColumn>ผู้ชำระ</TableColumn>
                    <TableColumn>หมวดหมู่</TableColumn>
                    <TableColumn>จำนวนเงิน</TableColumn>
                    <TableColumn>วิธีการชำระ</TableColumn>
                    <TableColumn>วันที่จัดเก็บ</TableColumn>
                    <TableColumn>สถานะ</TableColumn>
                    <TableColumn>การดำเนินการ</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {filteredRevenues.map((revenue) => (
                      <TableRow key={revenue.id}>
                        <TableCell className="font-mono text-sm">
                          {revenue.referenceNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{revenue.payerName}</div>
                            <div className="text-sm text-gray-500">
                              {getPayerTypeName(revenue.payerType)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip variant="flat" color="secondary">
                            {getCategoryName(revenue.category)}
                          </Chip>
                        </TableCell>
                        <TableCell className="font-medium">
                          {revenue.amount.toLocaleString()} บาท
                        </TableCell>
                        <TableCell>
                          {getPaymentMethodName(revenue.paymentMethod)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(revenue.collectionDate), 'dd/MM/yyyy', { locale: th })}
                        </TableCell>
                        <TableCell>
                          {getStatusChip(revenue.status)}
                        </TableCell>
                        <TableCell>
                          <ButtonGroup size="sm">
                            <Button variant="bordered">ดูรายละเอียด</Button>
                            <Button variant="bordered">แก้ไข</Button>
                          </ButtonGroup>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="summary" title="สรุปข้อมูล">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Summary */}
              <Card>
                <CardHeader>
                  <h3>สรุปตามหมวดหมู่</h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {summary && Object.entries(summary.byCategory).map(([category, data]) => (
                      <div key={category} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{getCategoryName(category)}</div>
                          <div className="text-sm text-gray-500">{data.count} รายการ</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{data.amount.toLocaleString()} บาท</div>
                          <div className="text-sm text-gray-500">
                            {((data.amount / summary.totalAmount) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              {/* Payment Method Summary */}
              <Card>
                <CardHeader>
                  <h3>สรุปตามวิธีการชำระ</h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {summary && Object.entries(summary.byPaymentMethod).map(([method, data]) => (
                      <div key={method} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{getPaymentMethodName(method)}</div>
                          <div className="text-sm text-gray-500">{data.count} รายการ</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{data.amount.toLocaleString()} บาท</div>
                          <div className="text-sm text-gray-500">
                            {((data.amount / summary.totalAmount) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </Tab>

        <Tab key="reports" title="รายงาน">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3>รายงาน</h3>
                <p className="text-sm text-gray-600">สร้างและดาวน์โหลดรายงานต่างๆ</p>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="bordered" className="h-32 flex-col gap-2">
                    <ChartBarIcon className="h-8 w-8" />
                    <span>รายงานประจำวัน</span>
                  </Button>
                  <Button variant="bordered" className="h-32 flex-col gap-2">
                    <TrendingUpIcon className="h-8 w-8" />
                    <span>รายงานประจำเดือน</span>
                  </Button>
                  <Button variant="bordered" className="h-32 flex-col gap-2">
                    <DocumentTextIcon className="h-8 w-8" />
                    <span>รายงานแบบกำหนดเอง</span>
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

      {/* Add Revenue Dialog */}
      <Modal isOpen={showAddDialog} onOpenChange={setShowAddDialog} size="2xl">
        <ModalContent>
          <ModalHeader>
            <h3>เพิ่มรายการรายได้</h3>
            <p className="text-sm text-gray-600">กรอกข้อมูลรายการรายได้ใหม่</p>
          </ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">หมวดหมู่ *</label>
                <Select
                  placeholder="เลือกหมวดหมู่"
                  value={newRevenue.category}
                  onChange={(e) => setNewRevenue({ ...newRevenue, category: e.target.value })}
                >
                  <SelectItem key="TAX" value="TAX">ภาษี</SelectItem>
                  <SelectItem key="FEE" value="FEE">ค่าธรรมเนียม</SelectItem>
                  <SelectItem key="FINE" value="FINE">ค่าปรับ</SelectItem>
                  <SelectItem key="LICENSE" value="LICENSE">ใบอนุญาต</SelectItem>
                  <SelectItem key="OTHER" value="OTHER">อื่นๆ</SelectItem>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">จำนวนเงิน *</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newRevenue.amount}
                  onChange={(e) => setNewRevenue({ ...newRevenue, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ชื่อผู้ชำระ *</label>
                <Input
                  placeholder="ชื่อผู้ชำระ"
                  value={newRevenue.payerName}
                  onChange={(e) => setNewRevenue({ ...newRevenue, payerName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ประเภทผู้ชำระ *</label>
                <Select
                  placeholder="เลือกประเภท"
                  value={newRevenue.payerType}
                  onChange={(e) => setNewRevenue({ ...newRevenue, payerType: e.target.value })}
                >
                  <SelectItem key="INDIVIDUAL" value="INDIVIDUAL">บุคคล</SelectItem>
                  <SelectItem key="COMPANY" value="COMPANY">บริษัท</SelectItem>
                  <SelectItem key="GOVERNMENT" value="GOVERNMENT">รัฐบาล</SelectItem>
                  <SelectItem key="OTHER" value="OTHER">อื่นๆ</SelectItem>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">วิธีการชำระ *</label>
                <Select
                  placeholder="เลือกวิธีการชำระ"
                  value={newRevenue.paymentMethod}
                  onChange={(e) => setNewRevenue({ ...newRevenue, paymentMethod: e.target.value })}
                >
                  <SelectItem key="CASH" value="CASH">เงินสด</SelectItem>
                  <SelectItem key="TRANSFER" value="TRANSFER">โอนเงิน</SelectItem>
                  <SelectItem key="CREDIT_CARD" value="CREDIT_CARD">บัตรเครดิต</SelectItem>
                  <SelectItem key="DEBIT_CARD" value="DEBIT_CARD">บัตรเดบิต</SelectItem>
                  <SelectItem key="CHECK" value="CHECK">เช็ค</SelectItem>
                  <SelectItem key="OTHER" value="OTHER">อื่นๆ</SelectItem>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">วันที่จัดเก็บ *</label>
                <Popover placement="bottom">
                  <PopoverTrigger>
                    <Button
                      variant="bordered"
                      startContent={<CalendarIcon className="h-4 w-4" />}
                      className="w-full justify-start"
                    >
                      {newRevenue.collectionDate ? format(newRevenue.collectionDate, "PPP", { locale: th }) : "เลือกวันที่"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      value={newRevenue.collectionDate}
                      onChange={(date) => setNewRevenue({ ...newRevenue, collectionDate: date || new Date() })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">เลขที่ใบเสร็จ</label>
                <Input
                  placeholder="เลขที่ใบเสร็จ"
                  value={newRevenue.receiptNumber}
                  onChange={(e) => setNewRevenue({ ...newRevenue, receiptNumber: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">รายละเอียด *</label>
                <Textarea
                  placeholder="รายละเอียดรายการรายได้"
                  value={newRevenue.description}
                  onChange={(e) => setNewRevenue({ ...newRevenue, description: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">หมายเหตุ</label>
                <Textarea
                  placeholder="หมายเหตุเพิ่มเติม"
                  value={newRevenue.notes}
                  onChange={(e) => setNewRevenue({ ...newRevenue, notes: e.target.value })}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={() => setShowAddDialog(false)}>
              ยกเลิก
            </Button>
            <Button color="primary" onPress={handleAddRevenue}>
              เพิ่มรายการ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
} 
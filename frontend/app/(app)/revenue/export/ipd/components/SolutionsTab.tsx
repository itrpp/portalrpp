import React from 'react';
import {
    Card,
    CardBody,
    CardHeader,
} from '@heroui/react';
import {
    FileTextIcon,
    DocumentTextIcon,
} from '@/components/ui/Icons';
import { problemSolutions } from '../data/conditions';

export const SolutionsTab: React.FC = () => {
    return (
        <Card className="border-2 border-default-200">
            <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                    <FileTextIcon className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">การแก้ปัญหาทั้งหมด</h2>
                </div>
            </CardHeader>
            <CardBody className="space-y-3">
                {problemSolutions.map((solution, index) => (
                    <Card key={index} className="border border-primary-200 bg-default-50">
                        <CardHeader className="pb-2">
                            <div className="flex items-center space-x-2">
                                <span className="flex-shrink-0 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                    {index + 1}
                                </span>
                                <h3 className="font-medium text-sm">แก้ไขปัญหา : {solution.problem}</h3>
                            </div>
                        </CardHeader>
                        <CardBody className="pt-0 space-y-3">
                            {/* การแก้ไข */}
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <span className="text-success font-bold text-sm">💡</span>
                                    <h4 className="font-medium text-success text-sm">การแก้ไข:</h4>
                                    <p className="text-default-700 text-xs leading-relaxed">
                                        {solution.solution}
                                    </p>
                                </div>
                            </div>

                            {/* ไฟล์ที่เกี่ยวข้อง */}
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <DocumentTextIcon className="w-3 h-3 text-primary" />
                                    <h4 className="font-medium text-primary text-sm">ไฟล์ที่เกี่ยวข้อง:</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {solution.files.map((file, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-0.5 bg-primary text-white text-xs rounded-full font-medium shadow-sm"
                                            >
                                                {file}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </CardBody>
        </Card>
    );
};

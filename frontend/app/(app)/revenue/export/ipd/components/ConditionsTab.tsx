import React from 'react';
import {
    Card,
    CardBody,
    CardHeader,
} from '@heroui/react';
import {
    CogIcon,
    DocumentTextIcon,
} from '@/components/ui/Icons';
import { conditionsData } from '../data/conditions';

export const ConditionsTab: React.FC = () => {
    // รวมเงื่อนไขทั้งหมดเข้าด้วยกัน
    const allConditions = [
        ...conditionsData
    ];

    return (
        <Card className="border-2 border-default-200">
            <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                    <CogIcon className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">เงื่อนไขการทำงานทั้งหมด</h2>
                </div>
            </CardHeader>
            <CardBody className="space-y-3">
                {allConditions.map((condition, index) => (
                    <Card key={index} className="border border-primary-200 bg-default-50">
                        <CardHeader className="pb-2">
                            <div className="flex items-center space-x-2">
                                <span className="flex-shrink-0 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                    {index + 1}
                                </span>
                                <h3 className="font-medium text-sm">ไฟล์ {condition.file}: {condition.title}</h3>
                            </div>
                        </CardHeader>
                        <CardBody className="pt-0 space-y-3">
                            {/* เงื่อนไขการทำงาน */}
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <span className="text-warning font-bold text-sm">⚙️</span>
                                    <h4 className="font-medium text-warning text-sm">เงื่อนไขการทำงาน:</h4>
                                </div>
                                <ul className="ml-6 space-y-1">
                                    {condition.conditions.map((cond, idx) => (
                                        <li key={idx} className="flex items-start space-x-2 text-xs">
                                            <span className="text-primary mt-0.5">•</span>
                                            <span className="text-default-700 leading-relaxed">{cond}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* วัตถุประสงค์ */}
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <DocumentTextIcon className="w-3 h-3 text-success" />
                                    <h4 className="font-medium text-success text-sm">วัตถุประสงค์:</h4>
                                    <p className="text-default-700 text-xs leading-relaxed">
                                        {condition.purpose}
                                    </p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </CardBody>
        </Card>
    );
};

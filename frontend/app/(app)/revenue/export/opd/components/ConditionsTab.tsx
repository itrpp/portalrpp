import React, { useState } from 'react';
import {
    Card,
    CardBody,
    CardHeader,
} from '@heroui/react';
import {
    CogIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    CheckCircleIcon,
    DocumentTextIcon,
} from '@/components/ui/Icons';
import { conditionsData } from '../data/conditions';

export const ConditionsTab: React.FC = () => {
    const [selectedConditionTab, setSelectedConditionTab] = useState<'critical' | 'important' | 'standard'>('critical');

    return (
        <Card className="border-2 border-default-200">
            <CardHeader>
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <CogIcon className="w-6 h-6" />
                        <h2 className="text-xl font-semibold">เงื่อนไขการทำงานทั้งหมด</h2>
                    </div>
                    {/* Sub-Tab Navigation */}
                    <div className="flex space-x-1 bg-default-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setSelectedConditionTab('critical')}
                            className={`px-3 py-2 rounded-md transition-all text-sm ${selectedConditionTab === 'critical'
                                ? 'bg-white shadow text-danger font-medium'
                                : 'text-default-600 hover:text-default-900'
                                }`}
                        >
                            <div className="flex items-center space-x-2">
                                <ExclamationTriangleIcon className="w-4 h-4" />
                                <span>เงื่อนไขสำคัญมาก</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setSelectedConditionTab('important')}
                            className={`px-3 py-2 rounded-md transition-all text-sm ${selectedConditionTab === 'important'
                                ? 'bg-white shadow text-warning font-medium'
                                : 'text-default-600 hover:text-default-900'
                                }`}
                        >
                            <div className="flex items-center space-x-2">
                                <InformationCircleIcon className="w-4 h-4" />
                                <span>เงื่อนไขสำคัญ</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setSelectedConditionTab('standard')}
                            className={`px-3 py-2 rounded-md transition-all text-sm ${selectedConditionTab === 'standard'
                                ? 'bg-white shadow text-success font-medium'
                                : 'text-default-600 hover:text-default-900'
                                }`}
                        >
                            <div className="flex items-center space-x-2">
                                <CheckCircleIcon className="w-4 h-4" />
                                <span>เงื่อนไขมาตรฐาน</span>
                            </div>
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardBody className="space-y-6">
                {/* Critical Conditions */}
                {selectedConditionTab === 'critical' && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2 pb-2 border-b border-danger-200">
                            <ExclamationTriangleIcon className="w-5 h-5 text-danger" />
                            <h3 className="text-lg font-semibold text-danger">เงื่อนไขสำคัญมาก (Critical)</h3>
                        </div>
                        {conditionsData.critical.map((condition, conditionIndex) => (
                            <div key={conditionIndex} className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <DocumentTextIcon className="w-4 h-4 text-danger" />
                                    <span className="font-medium text-danger">ไฟล์ {condition.file}</span>
                                    <span className="text-default-600">- {condition.title}</span>
                                </div>
                                <ul className="ml-6 space-y-1">
                                    {condition.conditions.map((cond, idx) => (
                                        <li key={idx} className="flex items-start space-x-2 text-sm">
                                            <span className="text-danger mt-1">•</span>
                                            <span className="text-default-700">{cond}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="ml-6 p-2 bg-danger-50 rounded border-l-4 border-danger">
                                    <p className="text-xs text-default-600">
                                        <strong>วัตถุประสงค์:</strong> {condition.purpose}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Important Conditions */}
                {selectedConditionTab === 'important' && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2 pb-2 border-b border-warning-200">
                            <InformationCircleIcon className="w-5 h-5 text-warning" />
                            <h3 className="text-lg font-semibold text-warning">เงื่อนไขสำคัญ (Important)</h3>
                        </div>
                        {conditionsData.important.map((condition, conditionIndex) => (
                            <div key={conditionIndex} className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <DocumentTextIcon className="w-4 h-4 text-warning" />
                                    <span className="font-medium text-warning">ไฟล์ {condition.file}</span>
                                    <span className="text-default-600">- {condition.title}</span>
                                </div>
                                <ul className="ml-6 space-y-1">
                                    {condition.conditions.map((cond, idx) => (
                                        <li key={idx} className="flex items-start space-x-2 text-sm">
                                            <span className="text-warning mt-1">•</span>
                                            <span className="text-default-700">{cond}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="ml-6 p-2 bg-warning-50 rounded border-l-4 border-warning">
                                    <p className="text-xs text-default-600">
                                        <strong>วัตถุประสงค์:</strong> {condition.purpose}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Standard Conditions */}
                {selectedConditionTab === 'standard' && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2 pb-2 border-b border-success-200">
                            <CheckCircleIcon className="w-5 h-5 text-success" />
                            <h3 className="text-lg font-semibold text-success">เงื่อนไขมาตรฐาน (Standard)</h3>
                        </div>
                        {conditionsData.standard.map((condition, conditionIndex) => (
                            <div key={conditionIndex} className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <DocumentTextIcon className="w-4 h-4 text-success" />
                                    <span className="font-medium text-success">ไฟล์ {condition.file}</span>
                                    <span className="text-default-600">- {condition.title}</span>
                                </div>
                                <ul className="ml-6 space-y-1">
                                    {condition.conditions.map((cond, idx) => (
                                        <li key={idx} className="flex items-start space-x-2 text-sm">
                                            <span className="text-success mt-1">•</span>
                                            <span className="text-default-700">{cond}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="ml-6 p-2 bg-success-50 rounded border-l-4 border-success">
                                    <p className="text-xs text-default-600">
                                        <strong>วัตถุประสงค์:</strong> {condition.purpose}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

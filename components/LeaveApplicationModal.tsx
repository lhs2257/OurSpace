'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { applyLeave, cancelLeave, type LeaveType, type LeaveRecord } from '@/lib/leave-actions';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

interface LeaveApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    existingLeave?: LeaveRecord;
    onSuccess: () => void;
}

export function LeaveApplicationModal({ isOpen, onClose, date, existingLeave, onSuccess }: LeaveApplicationModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const dateStr = format(date, 'yyyy-MM-dd');
    const displayDate = format(date, 'yyyy년 MM월 dd일 (E)', { locale: ko });

    const handleApplyLeave = async (leaveType: LeaveType) => {
        setIsLoading(true);
        setError(null);

        const result = await applyLeave(dateStr, leaveType);

        setIsLoading(false);

        if (result.success) {
            onSuccess();
            onClose();
        } else {
            setError(result.error || '연차/반차 신청에 실패했습니다.');
        }
    };

    const handleCancelLeave = async () => {
        setIsLoading(true);
        setError(null);

        const result = await cancelLeave(dateStr);

        setIsLoading(false);

        if (result.success) {
            onSuccess();
            onClose();
        } else {
            setError(result.error || '연차/반차 취소에 실패했습니다.');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>연차/반차 관리</DialogTitle>
                    <DialogDescription>
                        {displayDate}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {existingLeave ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-medium text-blue-900">
                                    현재 상태: {existingLeave.leave_type === 'annual' ? '연차' : '반차'}
                                </p>
                            </div>

                            <Button
                                onClick={handleCancelLeave}
                                disabled={isLoading}
                                variant="destructive"
                                className="w-full"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        처리 중...
                                    </>
                                ) : (
                                    '연차/반차 취소'
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                신청할 연차/반차를 선택하세요
                            </p>

                            <Button
                                onClick={() => handleApplyLeave('annual')}
                                disabled={isLoading}
                                className="w-full"
                                variant="default"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        처리 중...
                                    </>
                                ) : (
                                    '연차 신청'
                                )}
                            </Button>

                            <Button
                                onClick={() => handleApplyLeave('half')}
                                disabled={isLoading}
                                className="w-full"
                                variant="secondary"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        처리 중...
                                    </>
                                ) : (
                                    '반차 신청'
                                )}
                            </Button>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-900">{error}</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

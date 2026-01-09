'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import RouletteWheel from '@/components/RouletteWheel';

export default function RouletteClient() {
    const [options, setOptions] = useState<string[]>(['옵션 1', '옵션 2']);
    const [newOption, setNewOption] = useState('');
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingText, setEditingText] = useState('');

    const addOption = () => {
        if (newOption.trim() && options.length < 8) {
            setOptions([...options, newOption.trim()]);
            setNewOption('');
        }
    };

    const removeOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const startEdit = (index: number) => {
        setEditingIndex(index);
        setEditingText(options[index]);
    };

    const saveEdit = () => {
        if (editingIndex !== null && editingText.trim()) {
            const newOptions = [...options];
            newOptions[editingIndex] = editingText.trim();
            setOptions(newOptions);
        }
        setEditingIndex(null);
        setEditingText('');
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditingText('');
    };

    const handleSpin = () => {
        if (options.length >= 2 && !isSpinning) {
            setIsSpinning(true);
            setResult(null);
        }
    };

    const handleSpinComplete = (selectedOption: string) => {
        setIsSpinning(false);
        setResult(selectedOption);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">룰렛 돌리기</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 룰렛 휠 */}
                <Card>
                    <CardHeader>
                        <CardTitle>룰렛</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-4">
                        <RouletteWheel
                            options={options}
                            isSpinning={isSpinning}
                            onSpinComplete={handleSpinComplete}
                        />
                        <Button
                            onClick={handleSpin}
                            disabled={isSpinning || options.length < 2}
                            size="lg"
                            className="w-full max-w-xs"
                        >
                            {isSpinning ? '돌리는 중...' : '룰렛 돌리기'}
                        </Button>
                        {result && (
                            <div className="text-center p-4 bg-green-50 border-2 border-green-200 rounded-lg w-full max-w-xs">
                                <p className="text-sm text-gray-600 mb-1">결과</p>
                                <p className="text-2xl font-bold text-green-700">{result}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 옵션 관리 */}
                <Card>
                    <CardHeader>
                        <CardTitle>선택지 관리 ({options.length}/8)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* 옵션 추가 */}
                        <div className="flex gap-2">
                            <Input
                                value={newOption}
                                onChange={(e) => setNewOption(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addOption()}
                                placeholder="새 선택지 입력"
                                disabled={options.length >= 8}
                                maxLength={20}
                            />
                            <Button
                                onClick={addOption}
                                disabled={!newOption.trim() || options.length >= 8}
                                size="icon"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* 옵션 목록 */}
                        <div className="space-y-2">
                            {options.map((option, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                    {editingIndex === index ? (
                                        // 편집 모드
                                        <>
                                            <Input
                                                value={editingText}
                                                onChange={(e) => setEditingText(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                                                className="flex-1 mr-2"
                                                maxLength={20}
                                                autoFocus
                                            />
                                            <div className="flex gap-1">
                                                <Button
                                                    onClick={saveEdit}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                >
                                                    <Check className="h-4 w-4 text-green-600" />
                                                </Button>
                                                <Button
                                                    onClick={cancelEdit}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                >
                                                    <X className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        // 일반 모드
                                        <>
                                            <span className="font-medium flex-1">{option}</span>
                                            <div className="flex gap-1">
                                                <Button
                                                    onClick={() => startEdit(index)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                >
                                                    <Edit2 className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button
                                                    onClick={() => removeOption(index)}
                                                    disabled={options.length <= 2}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <p className="text-sm text-gray-500">
                            최소 2개, 최대 8개의 선택지를 추가할 수 있습니다.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, RotateCcw, Trophy, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PinballGame from '@/components/PinballGame';

export default function PinballRaceClient() {
    const router = useRouter();
    const [participantsText, setParticipantsText] = useState('참가자 1\n참가자 2\n참가자 3\n참가자 4');
    const [ballsPerPerson, setBallsPerPerson] = useState(1);
    const [winMode, setWinMode] = useState<'first' | 'last'>('first'); // first: 선착순, last: 오래 버티기
    const [isPlaying, setIsPlaying] = useState(false);
    const [raceWinner, setRaceWinner] = useState<string | null>(null);
    const [mapId, setMapId] = useState<'random' | 'zigzag' | 'diamond' | 'peg'>('random');
    const [gameKey, setGameKey] = useState(0); // To reset game

    const handleStart = () => {
        const names = participantsText.split('\n').filter(name => name.trim() !== '');
        if (names.length < 2) {
            alert('최소 2명 이상의 참가자가 필요합니다.');
            return;
        }
        setIsPlaying(true);
        setRaceWinner(null);
        setGameKey(prev => prev + 1);
    };

    const handleReset = () => {
        setIsPlaying(false);
        setRaceWinner(null);
    };

    const handleFinish = (winner: string) => {
        setRaceWinner(winner);
    };

    const participants = participantsText.split('\n').filter(name => name.trim() !== '');

    return (
        <div className="relative w-full h-[calc(100vh-5rem)] overflow-hidden bg-slate-950">
            {/* Background Game - Always Visible */}
            <div className="absolute inset-0 z-0">
                <PinballGame
                    key={`${gameKey}-${mapId}`}
                    participants={participants}
                    ballsPerPerson={ballsPerPerson}
                    winMode={winMode}
                    mapId={mapId}
                    isRacing={isPlaying}
                    onRestart={handleReset}
                    onFinish={handleFinish}
                />
            </div>

            {/* Header Overlay */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 text-white bg-black/30 p-2 rounded-lg backdrop-blur-sm hover:bg-black/50 transition-colors">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:text-white hover:bg-white/20">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold leading-tight">핀볼 레이싱</h1>
                    {!isPlaying && (
                        <p className="text-xs text-gray-300">물리 엔진 기반 무작위 레이싱</p>
                    )}
                </div>
            </div>

            {/* Settings Overlay - Bottom Right */}
            <Card className={`absolute bottom-6 right-6 z-20 w-[260px] max-w-[90vw] shadow-2xl border-slate-700 bg-slate-900/90 backdrop-blur text-slate-100 transition-all duration-300 ${isPlaying ? 'opacity-80 hover:opacity-100 w-auto min-w-[200px]' : ''}`}>
                <CardContent className="p-3">
                    {/* Header for Settings */}
                    {!isPlaying && (
                        <div className="flex items-center gap-2 font-semibold text-base pb-2 border-b border-slate-700 mb-2 text-white">
                            <Settings className="h-4 w-4" />
                            게임 설정
                        </div>
                    )}

                    {isPlaying ? (
                        // Playing Mode: Minimal Controls
                        <div className="flex flex-col gap-2">
                            {raceWinner ? (
                                <div className="text-center animate-in fade-in zoom-in duration-300">
                                    <div className="text-xs text-slate-300 mb-1">
                                        우승!
                                    </div>
                                    <div className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent drop-shadow-sm mb-2">
                                        {raceWinner}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-center text-slate-300 mb-1">
                                    레이스 진행 중...
                                </div>
                            )}
                            <Button variant="destructive" size="sm" onClick={handleReset} className="w-full h-8 text-xs">
                                <RotateCcw className="mr-2 h-3 w-3" />
                                {raceWinner ? '다시 설정하기' : '레이스 중단'}
                            </Button>
                        </div>
                    ) : (
                        // Setup Mode: Full Controls
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                            <div className="space-y-1">
                                <Label htmlFor="participants" className="text-slate-300 text-xs">참가자 목록</Label>
                                <Textarea
                                    id="participants"
                                    value={participantsText}
                                    onChange={(e) => setParticipantsText(e.target.value)}
                                    placeholder="이름 입력"
                                    className="min-h-[80px] bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-slate-500 text-xs leading-tight"
                                />
                                <p className="text-[10px] text-slate-400 text-right">
                                    {participants.length}명
                                </p>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="ball-count" className="text-slate-300 text-xs">인당 공 개수: {ballsPerPerson}개</Label>
                                <Input
                                    id="ball-count"
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={ballsPerPerson}
                                    onChange={(e) => setBallsPerPerson(parseInt(e.target.value) || 1)}
                                    className="h-8 bg-slate-800 border-slate-600 text-white text-xs"
                                />
                            </div>

                            <div className="flex items-center justify-between py-1 bg-slate-800/50 p-2 rounded border border-slate-700">
                                <Label htmlFor="win-mode" className="flex flex-col cursor-pointer">
                                    <span className="text-slate-200 text-xs">우승 조건</span>
                                    <span className="text-[10px] text-slate-400 font-normal">
                                        {winMode === 'first' ? '선착순' : '생존'}
                                    </span>
                                </Label>
                                <div className="flex items-center gap-1 scale-90 origin-right">
                                    <span className={`text-[10px] ${winMode === 'first' ? 'font-bold text-blue-400' : 'text-gray-500'}`}>1등</span>
                                    <Switch
                                        id="win-mode"
                                        checked={winMode === 'last'}
                                        onCheckedChange={(checked) => setWinMode(checked ? 'last' : 'first')}
                                        className="scale-75"
                                    />
                                    <span className={`text-[10px] ${winMode === 'last' ? 'font-bold text-red-400' : 'text-gray-500'}`}>생존</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-slate-300 text-xs">맵 선택</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'random', label: '랜덤' },
                                        { id: 'zigzag', label: '지그재그' },
                                        { id: 'diamond', label: '다이아' },
                                        { id: 'peg', label: '파칭코' }
                                    ].map((map) => (
                                        <Button
                                            key={map.id}
                                            variant={mapId === map.id ? 'secondary' : 'outline'}
                                            size="sm"
                                            onClick={() => setMapId(map.id as any)}
                                            className={`text-xs h-8 ${mapId === map.id ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                                        >
                                            {map.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <Button className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white border-0 h-9 text-sm" onClick={handleStart}>
                                <Play className="mr-2 h-4 w-4" />
                                시작
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

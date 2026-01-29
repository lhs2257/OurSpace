'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Dices, Trophy } from 'lucide-react';

export default function MinigamesClient() {
    const router = useRouter();

    const games = [
        {
            id: 'roulette',
            title: '룰렛 돌리기',
            description: '선택지를 입력하고 룰렛을 돌려 무작위로 결과를 선택하세요.',
            icon: Dices,
            color: 'from-purple-500 to-pink-500',
            href: '/minigames/roulette',
        },
        {
            id: 'pinball-race',
            title: '핀볼 레이싱',
            description: '물리 엔진 기반의 무작위 장애물 경주 게임입니다.',
            icon: Trophy,
            color: 'from-orange-500 to-red-500',
            href: '/minigames/pinball-race',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">미니게임</h1>
                <p className="text-gray-600 mt-2">재미있는 게임들을 즐겨보세요!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.map((game) => (
                    <Card
                        key={game.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => router.push(game.href)}
                    >
                        <CardHeader>
                            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${game.color} flex items-center justify-center mb-4`}>
                                <game.icon className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle>{game.title}</CardTitle>
                            <CardDescription>{game.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" variant="outline">
                                게임 시작
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {games.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">준비 중인 게임이 없습니다.</p>
                </div>
            )}
        </div>
    );
}

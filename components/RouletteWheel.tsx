'use client';

import { useEffect, useRef, useState } from 'react';

interface RouletteWheelProps {
    options: string[];
    isSpinning: boolean;
    onSpinComplete: (result: string) => void;
}

export default function RouletteWheel({ options, isSpinning, onSpinComplete }: RouletteWheelProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [rotation, setRotation] = useState(0);
    const [colors, setColors] = useState<string[]>([]);

    // 선택지가 바뀔 때마다 색상 생성
    useEffect(() => {
        const newColors = options.map((_, index) => {
            const hue = (index * 360) / options.length;
            const saturation = 65 + Math.random() * 20; // 65-85%
            const lightness = 55 + Math.random() * 15; // 55-70%
            return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        });
        setColors(newColors);
    }, [options]);

    // 캔버스 그리기
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || colors.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;

        // 캔버스 초기화
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();

        // 회전 적용
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);

        // 룰렛 그리기
        const anglePerSection = (2 * Math.PI) / options.length;

        options.forEach((option, index) => {
            const startAngle = index * anglePerSection - Math.PI / 2;
            const endAngle = startAngle + anglePerSection;

            // 섹션 그리기
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index];
            ctx.fill();

            // 테두리
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // 텍스트
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + anglePerSection / 2 + Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px sans-serif';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText(option, 0, -radius / 1.5);
            ctx.restore();
        });

        // 중앙 원
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }, [options, colors, rotation]);

    // 회전 애니메이션
    useEffect(() => {
        if (!isSpinning) return;

        const spinDuration = 4000; // 4초
        const minRotations = 5; // 최소 5바퀴
        const randomExtra = Math.random() * 360; // 추가 무작위 각도
        const totalRotation = minRotations * 360 + randomExtra;

        const startTime = Date.now();
        const startRotation = rotation;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / spinDuration, 1);

            // easeOutCubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentRotation = startRotation + totalRotation * easeProgress;

            setRotation(currentRotation % 360);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 회전 완료 - 결과 계산
                const finalRotation = currentRotation % 360;
                const normalizedRotation = (360 - finalRotation + 90) % 360;
                const anglePerSection = 360 / options.length;
                const selectedIndex = Math.floor(normalizedRotation / anglePerSection) % options.length;
                onSpinComplete(options[selectedIndex]);
            }
        };

        requestAnimationFrame(animate);
    }, [isSpinning]);

    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className="max-w-full"
            />
            {/* 포인터 */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-red-500 drop-shadow-lg"></div>
            </div>
        </div>
    );
}

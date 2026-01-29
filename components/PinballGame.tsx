'use client';

import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PinballGameProps {
    participants: string[];
    ballsPerPerson: number;
    winMode: 'first' | 'last';
    isRacing: boolean;
    onRestart: () => void;
    onFinish?: (winner: string) => void;
    mapId: 'random' | 'zigzag' | 'diamond' | 'peg';
}

export default function PinballGame({ participants, ballsPerPerson, winMode, isRacing, onRestart, onFinish, mapId }: PinballGameProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);

    // State
    const [winner, setWinner] = useState<string | null>(null);
    const [finishedList, setFinishedList] = useState<string[]>([]);
    const [countdown, setCountdown] = useState(0);
    const [gameStatus, setGameStatus] = useState<'ready' | 'countdown' | 'playing' | 'finished'>('ready');

    // Refs for Event Loop access (to avoid stale closures)
    const winModeRef = useRef(winMode);
    const gameStatusRef = useRef(gameStatus);
    const winnerRef = useRef(winner);

    useEffect(() => {
        winModeRef.current = winMode;
    }, [winMode]);

    useEffect(() => {
        gameStatusRef.current = gameStatus;
    }, [gameStatus]);

    useEffect(() => {
        winnerRef.current = winner;
    }, [winner]);

    // Colors for participants
    const getParticipantColor = (index: number, total: number) => {
        const hue = (index * 360) / total;
        return `hsl(${hue}, 80%, 60%)`;
    };

    useEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;

        // 1. Setup Matter.js
        const Engine = Matter.Engine,
            Render = Matter.Render,
            Runner = Matter.Runner,
            Bodies = Matter.Bodies,
            Composite = Matter.Composite,
            Events = Matter.Events,
            Body = Matter.Body;

        const engine = Engine.create();
        const world = engine.world;
        engineRef.current = engine;

        // Dimensions - Make it long!
        const width = containerRef.current.clientWidth;
        const height = 2200; // Increased height to ensure ball stays visible at bottom

        const render = Render.create({
            element: containerRef.current,
            canvas: canvasRef.current,
            engine: engine,
            options: {
                width,
                height,
                wireframes: false,
                background: '#0f172a',
                hasBounds: true
            },
        });
        renderRef.current = render;

        // 2. Create Map (Obstacles)
        const walls = [
            Bodies.rectangle(width / 2, height, width, 100, { isStatic: true, label: 'ground', render: { fillStyle: '#334155' } }), // Bottom
            Bodies.rectangle(-50, height / 2, 100, height * 2, { isStatic: true, render: { fillStyle: '#334155' } }), // Left
            Bodies.rectangle(width + 50, height / 2, 100, height * 2, { isStatic: true, render: { fillStyle: '#334155' } }), // Right
        ];

        const obstacles: Matter.Body[] = [];
        const spinners: Matter.Body[] = [];

        // --- Map Generation Strategy ---
        if (mapId === 'zigzag') {
            // 1. Zigzag Map - Winding path
            // Top Funnel
            obstacles.push(Bodies.rectangle(width * 0.2, 200, 400, 20, { isStatic: true, angle: Math.PI / 4, render: { fillStyle: '#64748b' } }));
            obstacles.push(Bodies.rectangle(width * 0.8, 200, 400, 20, { isStatic: true, angle: -Math.PI / 4, render: { fillStyle: '#64748b' } }));

            // Zigzag Walls
            for (let i = 0; i < 6; i++) {
                const y = 500 + i * 250;
                const isLeft = i % 2 === 0;
                if (isLeft) {
                    obstacles.push(Bodies.rectangle(width * 0.3, y, 500, 20, { isStatic: true, angle: Math.PI / 6, render: { fillStyle: '#475569' } }));
                } else {
                    obstacles.push(Bodies.rectangle(width * 0.7, y, 500, 20, { isStatic: true, angle: -Math.PI / 6, render: { fillStyle: '#475569' } }));
                }
                // Add some pins/pegs in the middle to disrupt flow
                if (i < 5) {
                    const px = width / 2 + (Math.random() - 0.5) * 100;
                    obstacles.push(Bodies.circle(px, y + 120, 8, { isStatic: true, render: { fillStyle: '#94a3b8' }, restitution: 1.2 }));
                }
            }

        } else if (mapId === 'diamond') {
            // 2. Diamond / Tunnel Map
            // Central spinning diamonds
            const diamondY = [400, 800, 1200];
            diamondY.forEach((y, i) => {
                const size = 100;
                const spinner = Bodies.rectangle(width / 2, y, size, size, {
                    isStatic: true,
                    angle: Math.PI / 4,
                    render: { fillStyle: '#0ea5e9' }
                });
                spinners.push(spinner);

                // Flanking walls
                obstacles.push(Bodies.rectangle(width * 0.15, y, 20, 200, { isStatic: true, render: { fillStyle: '#334155' } }));
                obstacles.push(Bodies.rectangle(width * 0.85, y, 20, 200, { isStatic: true, render: { fillStyle: '#334155' } }));
            });

            // Angled funnels between diamonds
            const funnelY = [600, 1000];
            funnelY.forEach(y => {
                obstacles.push(Bodies.rectangle(width * 0.2, y, 250, 20, { isStatic: true, angle: Math.PI / 6, render: { fillStyle: '#64748b' } }));
                obstacles.push(Bodies.rectangle(width * 0.8, y, 250, 20, { isStatic: true, angle: -Math.PI / 6, render: { fillStyle: '#64748b' } }));
            });

            // Bottom chaos area
            for (let i = 0; i < 15; i++) {
                obstacles.push(Bodies.circle(width / 2 + (Math.random() - 0.5) * width * 0.8, 1500 + Math.random() * 400, 6, { isStatic: true, render: { fillStyle: '#ef4444' }, restitution: 1 }));
            }

        } else if (mapId === 'peg') {
            // 3. Peg (Pachinko) Map - High density
            const rows = 20;
            const cols = 12; // Fewer columns but carefully placed
            const startY = 300;
            const spacingX = width / cols;
            const spacingY = 70;

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const xOffset = row % 2 === 0 ? spacingX / 2 : 0;
                    const x = col * spacingX + xOffset + spacingX * 0.2;
                    const y = startY + row * spacingY;

                    // Random jitter
                    const rx = (Math.random() - 0.5) * 15;
                    const ry = (Math.random() - 0.5) * 15;

                    if (x > 30 && x < width - 30) {
                        obstacles.push(Bodies.circle(x + rx, y + ry, 5, { isStatic: true, render: { fillStyle: '#cbd5e1' }, restitution: 1.0 }));
                    }
                }
            }

        } else {
            // Random / Default
            // Funnel at top
            obstacles.push(Bodies.rectangle(width * 0.25, 100, width * 0.6, 20, { isStatic: true, angle: Math.PI / 4, render: { fillStyle: '#475569' } }));
            obstacles.push(Bodies.rectangle(width * 0.75, 100, width * 0.6, 20, { isStatic: true, angle: -Math.PI / 4, render: { fillStyle: '#475569' } }));

            // Section 1: Pegs
            const rows1 = 5;
            const cols1 = 8;
            const startY1 = 300;
            const spacingX1 = width / cols1;
            const spacingY1 = 80;
            for (let row = 0; row < rows1; row++) {
                for (let col = 0; col < cols1; col++) {
                    const xOffset = row % 2 === 0 ? spacingX1 / 2 : 0;
                    const x = col * spacingX1 + xOffset + spacingX1 / 4;
                    const y = startY1 + row * spacingY1;
                    if (Math.random() > 0.1) {
                        obstacles.push(Bodies.circle(x, y, 5, { isStatic: true, render: { fillStyle: '#94a3b8' }, restitution: 1.0 }));
                    }
                }
            }
            // Section 2: ZigZag
            const midY = 800;
            obstacles.push(Bodies.rectangle(width * 0.3, midY, width * 0.7, 20, { isStatic: true, angle: Math.PI / 6, render: { fillStyle: '#64748b' } }));
            obstacles.push(Bodies.rectangle(width * 0.7, midY + 200, width * 0.7, 20, { isStatic: true, angle: -Math.PI / 6, render: { fillStyle: '#64748b' } }));
            obstacles.push(Bodies.rectangle(width * 0.3, midY + 400, width * 0.7, 20, { isStatic: true, angle: Math.PI / 6, render: { fillStyle: '#64748b' } }));

            // Section 3: Spinners
            const sY = 1500;
            const s1 = Bodies.rectangle(width * 0.3, sY, 120, 15, { isStatic: true, render: { fillStyle: '#ef4444' } });
            const s2 = Bodies.rectangle(width * 0.7, sY, 120, 15, { isStatic: true, render: { fillStyle: '#ef4444' } });
            const s3 = Bodies.rectangle(width * 0.5, sY + 200, 150, 15, { isStatic: true, render: { fillStyle: '#ef4444' } });
            spinners.push(s1, s2, s3);
        }

        Composite.add(world, [...walls, ...obstacles, ...spinners]);

        // 3. Render Events
        Events.on(render, 'afterRender', () => {
            const ctx = render.context;
            const bodies = Composite.allBodies(world);

            // A. Draw Names on Main Canvas
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            bodies.forEach(body => {
                if (body.label.startsWith('ball-')) {
                    const name = body.label.replace('ball-', '');
                    const { x, y } = body.position;

                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 4;
                    ctx.fillText(name, x, y);
                    ctx.shadowBlur = 0;
                }
            });

            // B. Draw Minimap
            if (minimapCanvasRef.current && containerRef.current) {
                const mmCtx = minimapCanvasRef.current.getContext('2d');
                if (mmCtx) {
                    const mmWidth = minimapCanvasRef.current.width;
                    const mmHeight = minimapCanvasRef.current.height;
                    const scale = mmWidth / width;

                    // Clear Minimap
                    mmCtx.clearRect(0, 0, mmWidth, mmHeight);

                    // Draw Background
                    mmCtx.fillStyle = 'rgba(30, 41, 59, 0.9)'; // Slate-800
                    mmCtx.fillRect(0, 0, mmWidth, mmHeight);

                    // Draw Bodies
                    bodies.forEach(body => {
                        // Scale position
                        const x = body.position.x * scale;
                        const y = body.position.y * scale;

                        mmCtx.beginPath();
                        if (body.circleRadius) {
                            mmCtx.arc(x, y, body.circleRadius * scale, 0, 2 * Math.PI);
                        } else {
                            // Approximating for minimap using vertices
                            if (body.vertices && body.vertices.length > 0) {
                                mmCtx.moveTo(body.vertices[0].x * scale, body.vertices[0].y * scale);
                                body.vertices.forEach(v => {
                                    mmCtx.lineTo(v.x * scale, v.y * scale);
                                });
                                mmCtx.closePath();
                            }
                        }

                        if (body.label.startsWith('ball-')) {
                            // Use body render color or default to white
                            mmCtx.fillStyle = (body.render.fillStyle as string) || '#ffffff';
                        } else {
                            mmCtx.fillStyle = '#475569'; // Obstacle color (Slate-600)
                        }
                        mmCtx.fill();
                    });

                    // Draw Viewport Rect (Camera)
                    const scrollTop = containerRef.current.scrollTop;
                    const containerHeight = containerRef.current.clientHeight;

                    mmCtx.strokeStyle = 'rgba(250, 204, 21, 0.8)'; // Yellow border
                    mmCtx.lineWidth = 2;
                    mmCtx.strokeRect(0, scrollTop * scale, mmWidth, containerHeight * scale);
                }
            }
        });

        // 4. Update Loop
        Events.on(engine, 'beforeUpdate', (event) => {
            // Rotate spinners
            spinners.forEach((s, i) => {
                const dir = i % 2 === 0 ? 1 : -1;
                Body.rotate(s, 0.05 * dir);
            });

            // Check finish line logic
            const bodies = Composite.allBodies(world);
            let targetY = 0; // Camera target
            let activeBalls = 0;

            if (winModeRef.current === 'first') {
                // Track lowest ball (max Y)
                targetY = 0;
                bodies.forEach(body => {
                    if (body.label.startsWith('ball-') && !body.isStatic) {
                        activeBalls++;
                        if (body.position.y > targetY) targetY = body.position.y;
                    }
                });
            } else {
                // Track highest ball (min Y) - for 'last/survival' mode
                targetY = height;
                let foundBall = false;
                bodies.forEach(body => {
                    if (body.label.startsWith('ball-') && !body.isStatic) {
                        activeBalls++;
                        foundBall = true;
                        if (body.position.y < targetY) targetY = body.position.y;
                    }
                });
                if (!foundBall) targetY = height; // If no balls, stay at bottom
            }

            // Finish check
            bodies.forEach(body => {
                if (body.label.startsWith('ball-') && !body.isStatic) {
                    // Check if passed finish line (height - 250 to allow space before ground)
                    if (body.position.y > height - 250) {
                        const participantName = body.label.replace('ball-', '');

                        // Do NOT remove the ball immediately to keep physics/camera smooth
                        // Composite.remove(world, body); 

                        setFinishedList(prev => {
                            if (prev.includes(participantName)) return prev;
                            return [...prev, participantName];
                        });
                    }
                }
            });

            // Camera Follow Logic (Scroll Container)
            if (containerRef.current) {
                const containerHeight = containerRef.current.clientHeight;
                let scrollDest = 0;

                if (gameStatusRef.current === 'finished' && winnerRef.current) {
                    const winnerBody = bodies.find(b => b.label === `ball-${winnerRef.current}`);
                    if (winnerBody) {
                        scrollDest = winnerBody.position.y - containerHeight / 2;
                    } else {
                        scrollDest = height - containerHeight;
                    }
                } else if (activeBalls === 0) {
                    if (gameStatusRef.current === 'finished') {
                        scrollDest = height - containerHeight;
                    }
                    else scrollDest = containerRef.current.scrollTop;
                } else {
                    scrollDest = targetY - containerHeight / 2;
                }

                // Clamp scroll
                scrollDest = Math.max(0, Math.min(scrollDest, height - containerHeight));

                const currentScroll = containerRef.current.scrollTop;

                // More responsive follow (less lag)
                const newScroll = currentScroll + (scrollDest - currentScroll) * 0.15;

                containerRef.current.scrollTop = newScroll;
            }
        });

        Render.run(render);
        const runner = Runner.create();
        runnerRef.current = runner;
        Runner.run(runner, engine);

        return () => {
            Render.stop(render);
            Runner.stop(runner);
            if (render.canvas) {
                // Warning: removing canvas usually handled by React, but Matter appends it.
            }
        };
    }, []);

    // Win condition check effect
    useEffect(() => {
        if (gameStatus !== 'playing') return;

        if (finishedList.length > 0) {
            if (winMode === 'first') {
                const w = finishedList[0];
                setWinner(w);
                setGameStatus('finished');
                if (onFinish) onFinish(w);
            } else if (winMode === 'last') {
                if (finishedList.length === participants.length) {
                    const w = finishedList[finishedList.length - 1];
                    setWinner(w);
                    setGameStatus('finished');
                    if (onFinish) onFinish(w);
                }
            }
        }
    }, [finishedList, winMode, participants.length, gameStatus, onFinish]);


    // Handle Race Start/Stop/Reset
    useEffect(() => {
        if (isRacing) {
            // Start Sequence
            setWinner(null);
            setFinishedList([]);
            setGameStatus('countdown');
            setCountdown(3);

            // Reset Camera
            if (containerRef.current) {
                containerRef.current.scrollTop = 0;
            }

        } else {
            // Reset / Standby
            setWinner(null);
            setFinishedList([]);
            setGameStatus('ready');
            setCountdown(0);

            // Clear Balls
            if (engineRef.current) {
                const world = engineRef.current.world;
                const bodies = Matter.Composite.allBodies(world);
                const balls = bodies.filter(b => b.label.startsWith('ball-'));
                Matter.Composite.remove(world, balls);
            }

            // Reset Camera
            if (containerRef.current) {
                containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [isRacing]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && gameStatus === 'countdown' && isRacing) {
            setGameStatus('playing');
            spawnBalls();
        }
    }, [countdown, gameStatus, isRacing]);

    const spawnBalls = () => {
        if (!engineRef.current || !containerRef.current) return;

        const Bodies = Matter.Bodies;
        const Composite = Matter.Composite;
        const width = containerRef.current.clientWidth;

        const newBalls: Matter.Body[] = [];

        participants.forEach((name, index) => {
            const color = getParticipantColor(index, participants.length);

            for (let i = 0; i < ballsPerPerson; i++) {
                const x = width / 2 + (Math.random() - 0.5) * 50;
                const y = -50 - (Math.random() * 200);

                // Increase Size! 10
                const ball = Bodies.circle(x, y, 10, {
                    label: `ball-${name}`,
                    restitution: 0.7, // Slightly less bouncy to prevent flying off too much
                    friction: 0.005,
                    density: 0.002, // Heavier
                    render: { fillStyle: color }
                });
                newBalls.push(ball);
            }
        });

        Composite.add(engineRef.current.world, newBalls);
    };

    return (
        <div className="w-full h-full relative bg-slate-900">
            {/* Scrollable Game Container */}
            <div
                className="w-full h-full absolute inset-0 overflow-hidden"
                ref={containerRef}
            >
                <canvas ref={canvasRef} />
            </div>

            {/* Canvas Minimap Overlay - Positioned Relative to Root (Fixed in visual sense) */}
            <div className="absolute top-[80px] left-4 z-40 bg-slate-800/80 border border-slate-600 rounded overflow-hidden backdrop-blur shadow-xl">
                <canvas
                    ref={minimapCanvasRef}
                    width={75}
                    height={200}
                    className="block"
                />
            </div>

            {/* Overlay UI */}
            {countdown > 0 && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 pointer-events-none">
                    <div className="text-9xl font-bold text-white animate-pulse">
                        {countdown}
                    </div>
                </div>
            )}
        </div>
    );
}

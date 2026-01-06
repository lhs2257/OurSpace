'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase-client'

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const supabase = createClient()

        try {
            if (isLogin) {
                // 로그인
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })

                if (error) throw error

                if (data.session) {
                    router.push('/dashboard')
                    router.refresh()
                }
            } else {
                // 회원가입
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                })

                if (error) throw error

                if (data.session) {
                    // 자동 로그인된 경우
                    router.push('/dashboard')
                    router.refresh()
                } else {
                    // 이메일 인증이 필요한 경우
                    setError('회원가입이 완료되었습니다. 이메일을 확인해주세요.')
                }
            }
        } catch (err: any) {
            setError(err.message || '오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        {isLogin ? '로그인' : '회원가입'}
                    </CardTitle>
                    <CardDescription className="text-center">
                        OurSpace - 사내 관리 도구
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-2">
                                <Label htmlFor="fullName">이름</Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="홍길동"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            {!isLogin && (
                                <p className="text-xs text-gray-500">최소 6자 이상</p>
                            )}
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 border border-red-200 p-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? '처리 중...' : isLogin ? '로그인' : '가입하기'}
                        </Button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLogin(!isLogin)
                                    setError(null)
                                }}
                                className="text-sm text-blue-600 hover:text-blue-700 underline"
                            >
                                {isLogin ? '계정이 없으신가요? 가입하기' : '이미 계정이 있으신가요? 로그인'}
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

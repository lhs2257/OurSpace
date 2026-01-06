'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile } from '@/lib/update-profile'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

// 사용할 수 있는 테마 색상 프리셋
export const THEME_COLORS = [
    { id: 'blue', value: 'from-blue-500 to-cyan-500', label: '블루' },
    { id: 'purple', value: 'from-purple-500 to-pink-500', label: '퍼플' },
    { id: 'green', value: 'from-green-500 to-emerald-500', label: '그린' },
    { id: 'orange', value: 'from-orange-500 to-red-500', label: '오렌지' },
    { id: 'indigo', value: 'from-indigo-500 to-violet-500', label: '인디고' },
    { id: 'rose', value: 'from-rose-500 to-pink-600', label: '로즈' },
]

interface ProfileModalProps {
    isOpen: boolean
    onClose: () => void
    currentUser: {
        fullName: string
        email: string
        themeColor?: string
    }
}

export default function ProfileModal({ isOpen, onClose, currentUser }: ProfileModalProps) {
    const [fullName, setFullName] = useState(currentUser.fullName)
    const [themeColor, setThemeColor] = useState(currentUser.themeColor || 'blue')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await updateProfile({
            fullName,
            themeColor
        })

        if (result.success) {
            router.refresh()
            onClose()
        } else {
            alert('프로필 수정에 실패했습니다.')
        }
        setLoading(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>프로필 수정</DialogTitle>
                    <DialogDescription>
                        팀원들에게 보여질 정보를 수정합니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    {/* 이름 입력 */}
                    <div className="space-y-2">
                        <Label htmlFor="name">이름</Label>
                        <Input
                            id="name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="이름을 입력하세요"
                        />
                    </div>

                    {/* 테마 색상 선택 */}
                    <div className="space-y-3">
                        <Label>테마 색상</Label>
                        <div className="grid grid-cols-6 gap-2">
                            {THEME_COLORS.map((color) => (
                                <button
                                    key={color.id}
                                    type="button"
                                    onClick={() => setThemeColor(color.id)}
                                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${color.value} relative flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400`}
                                >
                                    {themeColor === color.id && (
                                        <Check className="w-5 h-5 text-white drop-shadow-md" />
                                    )}
                                    <span className="sr-only">{color.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 미리보기 */}
                    <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br ${THEME_COLORS.find(c => c.id === themeColor)?.value || 'from-gray-400 to-gray-500'}`}>
                            {fullName ? fullName[0] : '?'}
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">{fullName || '이름 없음'}</p>
                            <p className="text-sm text-gray-500">{currentUser.email}</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            취소
                        </Button>
                        <Button type="submit" disabled={loading || !fullName.trim()}>
                            {loading ? '저장 중...' : '저장하기'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

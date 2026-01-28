'use client'

import { useState } from 'react'
import { TeamMember } from '@/lib/team-actions'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { THEME_COLORS } from './ProfileModal'
import { Loader2 } from 'lucide-react'

interface CreateRoomModalProps {
    isOpen: boolean
    onClose: () => void
    members: TeamMember[]
    currentUserId: string
    onCreate: (roomName: string, memberIds: string[]) => Promise<void>
}

export default function CreateRoomModal({ isOpen, onClose, members, currentUserId, onCreate }: CreateRoomModalProps) {
    const [roomName, setRoomName] = useState('')
    const [selectedMembers, setSelectedMembers] = useState<string[]>([])
    const [creating, setCreating] = useState(false)

    const handleToggleMember = (memberId: string) => {
        setSelectedMembers(prev =>
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        )
    }

    const handleCreate = async () => {
        if (!roomName.trim()) {
            alert('채팅방 이름을 입력해주세요.')
            return
        }

        setCreating(true)
        try {
            await onCreate(roomName, selectedMembers)
            // Reset form
            setRoomName('')
            setSelectedMembers([])
            onClose()
        } catch (error) {
            console.error('Room creation error:', error)
        } finally {
            setCreating(false)
        }
    }

    const handleClose = () => {
        setRoomName('')
        setSelectedMembers([])
        onClose()
    }

    // Filter out current user from the list
    const otherMembers = members.filter(m => m.id !== currentUserId)

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>새 채팅방 만들기</DialogTitle>
                    <DialogDescription>
                        채팅방 이름을 입력하고 초대할 팀원을 선택하세요
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Room Name Input */}
                    <div className="space-y-2">
                        <Label htmlFor="room-name">채팅방 이름</Label>
                        <Input
                            id="room-name"
                            placeholder="예: 프로젝트 팀"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            disabled={creating}
                        />
                    </div>

                    {/* Member Selection */}
                    <div className="space-y-2">
                        <Label>팀원 초대</Label>
                        <div className="border rounded-lg max-h-60 overflow-y-auto">
                            {otherMembers.length > 0 ? (
                                <div className="p-2 space-y-1">
                                    {otherMembers.map((member) => {
                                        const themeGradient = THEME_COLORS.find(c => c.id === member.theme_color)?.value || 'from-blue-500 to-cyan-500'
                                        const isSelected = selectedMembers.includes(member.id)

                                        return (
                                            <div
                                                key={member.id}
                                                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                                onClick={() => handleToggleMember(member.id)}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => handleToggleMember(member.id)}
                                                    disabled={creating}
                                                />
                                                <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${themeGradient} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                                                    {member.full_name ? member.full_name[0].toUpperCase() : member.email[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {member.full_name || '사용자'}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    초대할 팀원이 없습니다
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">
                            {selectedMembers.length}명 선택됨
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={creating}>
                        취소
                    </Button>
                    <Button onClick={handleCreate} disabled={creating || !roomName.trim()}>
                        {creating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                생성 중...
                            </>
                        ) : (
                            '생성'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

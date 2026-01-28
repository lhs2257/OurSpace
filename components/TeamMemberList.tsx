'use client'

import { TeamMember } from '@/lib/team-actions'
import { THEME_COLORS } from './ProfileModal'

interface TeamMemberListProps {
    members: TeamMember[]
}

export default function TeamMemberList({ members }: TeamMemberListProps) {
    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b">
                <h2 className="font-semibold text-lg text-gray-900">팀원 목록</h2>
                <p className="text-sm text-gray-500 mt-1">{members.length}명</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {members.map((member) => {
                    const themeGradient = THEME_COLORS.find(c => c.id === member.theme_color)?.value || 'from-blue-500 to-cyan-500'

                    return (
                        <div
                            key={member.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${themeGradient} flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0`}>
                                {member.full_name ? member.full_name[0].toUpperCase() : member.email[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {member.full_name || '사용자'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{member.email}</p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

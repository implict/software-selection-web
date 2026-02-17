import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase

/**
 * 투표 제출 (같은 교사명이면 덮어쓰기)
 */
export async function submitVote(teacherName, subject, selectedIds) {
    // 기존 투표 확인
    const { data: existing } = await supabase
        .from('votes')
        .select('id')
        .eq('teacher_name', teacherName)
        .maybeSingle()

    if (existing) {
        // 기존 투표 업데이트
        const { error } = await supabase
            .from('votes')
            .update({
                subject,
                selected_ids: selectedIds,
                created_at: new Date().toISOString()
            })
            .eq('id', existing.id)

        if (error) throw error
    } else {
        // 새 투표 삽입
        const { error } = await supabase
            .from('votes')
            .insert({
                teacher_name: teacherName,
                subject,
                selected_ids: selectedIds
            })

        if (error) throw error
    }

    return { success: true }
}

/**
 * 모든 투표 조회
 */
export async function fetchVotes() {
    const { data, error } = await supabase
        .from('votes')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error

    // Map to the format the frontend expects
    return data.map(v => ({
        teacherName: v.teacher_name,
        subject: v.subject,
        selectedIds: v.selected_ids,
        timestamp: v.created_at
    }))
}

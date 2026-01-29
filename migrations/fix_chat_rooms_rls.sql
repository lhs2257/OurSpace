-- Fix RLS policy for chat_rooms to allow creation flow
-- Problem: User creates room -> tries to select it -> fails because not yet a member

-- Update SELECT policy for chat_rooms
drop policy if exists "Users can view rooms they are members of" on chat_rooms;

create policy "Users can view rooms they joined or created"
    on chat_rooms for select
    using (
        created_by = auth.uid() OR
        exists (
            select 1 from chat_room_members
            where chat_room_members.room_id = chat_rooms.id
            and chat_room_members.user_id = auth.uid()
        )
    );

-- Ensure INSERT policy is permissive enough for authenticated users
drop policy if exists "Authenticated users can create rooms" on chat_rooms;

create policy "Authenticated users can create rooms"
    on chat_rooms for insert
    with check (
        auth.role() = 'authenticated'
        -- We can optionally check created_by = auth.uid(), but strictly enforcing role is good enough base
        -- and the code ensures created_by IS auth.uid()
    );

-- Also ensure UPDATE/DELETE permissions for creators if needed later
create policy "Creators can update their rooms"
    on chat_rooms for update
    using (created_by = auth.uid());

create policy "Creators can delete their rooms"
    on chat_rooms for delete
    using (created_by = auth.uid());
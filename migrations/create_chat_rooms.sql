-- Chat Rooms Migration
-- Creates tables for chat rooms and room membership

-- Create chat_rooms table
create table public.chat_rooms (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create chat_room_members table
create table public.chat_room_members (
    id uuid default gen_random_uuid() primary key,
    room_id uuid references public.chat_rooms(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(room_id, user_id)
);

-- Add room_id column to messages table
alter table public.messages 
add column room_id uuid references public.chat_rooms(id) on delete cascade;

-- Create index for faster queries
create index idx_messages_room_id on public.messages(room_id);
create index idx_chat_room_members_user_id on public.chat_room_members(user_id);
create index idx_chat_room_members_room_id on public.chat_room_members(room_id);

-- Enable RLS
alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;

-- RLS Policies for chat_rooms
create policy "Users can view rooms they are members of"
    on chat_rooms for select
    using (
        exists (
            select 1 from chat_room_members
            where chat_room_members.room_id = chat_rooms.id
            and chat_room_members.user_id = auth.uid()
        )
    );

create policy "Authenticated users can create rooms"
    on chat_rooms for insert
    with check (auth.uid() = created_by);

-- RLS Policies for chat_room_members
create policy "Users can view memberships of their rooms"
    on chat_room_members for select
    using (
        exists (
            select 1 from chat_room_members as crm
            where crm.room_id = chat_room_members.room_id
            and crm.user_id = auth.uid()
        )
    );

create policy "Room creators can add members"
    on chat_room_members for insert
    with check (
        exists (
            select 1 from chat_rooms
            where chat_rooms.id = chat_room_members.room_id
            and chat_rooms.created_by = auth.uid()
        )
    );

create policy "Users can leave rooms"
    on chat_room_members for delete
    using (user_id = auth.uid());

-- Update RLS policies for messages to check room membership
drop policy if exists "Users can view all messages" on messages;
drop policy if exists "Users can insert their own messages" on messages;

create policy "Users can view messages in their rooms"
    on messages for select
    using (
        room_id is null or -- For backward compatibility with old messages
        exists (
            select 1 from chat_room_members
            where chat_room_members.room_id = messages.room_id
            and chat_room_members.user_id = auth.uid()
        )
    );

create policy "Users can send messages to their rooms"
    on messages for insert
    with check (
        sender_id = auth.uid() and (
            room_id is null or
            exists (
                select 1 from chat_room_members
                where chat_room_members.room_id = messages.room_id
                and chat_room_members.user_id = auth.uid()
            )
        )
    );

-- Enable realtime for new tables
-- Uncomment these lines after running migration:
-- alter publication supabase_realtime add table chat_rooms;
-- alter publication supabase_realtime add table chat_room_members;

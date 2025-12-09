import { NextRequest, NextResponse } from 'next/server';
import { getAllRows } from '@/lib/mongoDBCRUD';
import { GroupConversation } from '@/types/Group';

const GROUPS_COLLECTION = 'Groups';

export async function GET(req: NextRequest, ctx: unknown) {
  try {
    const paramsPromise = (ctx as { params: Promise<{ code: string }> }).params;
    const { code: inviteCode } = await paramsPromise;

    if (!inviteCode) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid invite code' 
      }, { status: 400 });
    }

    // Find group by invite code
    const result = await getAllRows<GroupConversation>(GROUPS_COLLECTION, {
      filters: { inviteCode },
      limit: 1,
    });

    const group = result.data?.[0];

    if (!group) {
      return NextResponse.json({ 
        success: false, 
        message: 'Link không hợp lệ hoặc đã hết hạn' 
      }, { status: 404 });
    }

    // Return group info (không trả full data nhạy cảm)
    return NextResponse.json({ 
      success: true, 
      group: {
        _id: group._id,
        name: group.name,
        avatar: group.avatar,
        description: group.description,
        members: group.members,
      }
    });

  } catch (error) {
    console.error('Get invite info error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
}

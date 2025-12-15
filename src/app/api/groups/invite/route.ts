import { NextRequest, NextResponse } from 'next/server';
import {  updateByField } from '@/lib/mongoDBCRUD';
import { GroupConversation } from '@/types/Group';
import { randomBytes } from 'crypto';

const GROUPS_COLLECTION = 'Groups';

// Generate random invite code
function generateInviteCode(): string {
  return randomBytes(6).toString('hex'); // 12 ký tự hex
}

export async function POST(req: NextRequest) {
  try {
    const { action, groupId } = await req.json();

    if (action === 'generate' || action === 'regenerate') {
      if (!groupId) {
        return NextResponse.json(
          {
            success: false,
            message: 'Missing groupId',
          },
          { status: 400 },
        );
      }

      // Generate new code
      const inviteCode = generateInviteCode();

      // Update group
      const updated = await updateByField<GroupConversation>(GROUPS_COLLECTION, '_id', groupId, { inviteCode });

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            message: 'Update failed',
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        inviteCode,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Invalid action',
      },
      { status: 400 },
    );
  } catch (error) {
    console.error('Invite API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error',
      },
      { status: 500 },
    );
  }
}

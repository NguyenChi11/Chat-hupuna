// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  addRow,
  deleteByField,
  deleteById,
  getAllRows,
  getRowByIdOrCode,
  updateByField,
  updateMany,
} from '@/lib/mongoDBCRUD';
import { Message, MESSAGES_COLLECTION_NAME } from '@/types/Message';
import { User, USERS_COLLECTION_NAME } from '@/types/User';
import { GroupConversation, GroupMemberSchema, MemberInfo } from '@/types/Group';
import { Filter, ObjectId } from 'mongodb';
import { getSocketInstance } from '@/lib/socketInstance';

type MongoFilters = Record<string, unknown>;
type MemberInput = string | GroupMemberSchema | MemberInfo | { id?: string; _id?: string };
type GroupSummary = { _id: string; name: string; avatar?: string; isGroup: boolean; members: string[] };

async function sendPushOnMessage(data: { roomId: string; senderId: string; content?: string }) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID || '';
  const apiKey = process.env.ONESIGNAL_REST_API_KEY || '';
  if (!appId || !apiKey) return;

  const roomId = String(data.roomId);
  const senderId = String(data.senderId);
  let recipients: string[] = [];
  let heading = 'Tin nhắn mới';
  const body = data.content || 'Bạn có tin nhắn mới';

  try {
    const senderRes = await getAllRows<User>(USERS_COLLECTION_NAME, {
      filters: { _id: ObjectId.isValid(senderId) ? new ObjectId(senderId) : senderId },
      limit: 1,
    });
    const sender = senderRes.data?.[0];
    if (sender && sender.name) heading = sender.name;
  } catch {}

  if (roomId.includes('_')) {
    const parts = roomId.split('_');
    const other = parts.find((p) => String(p) !== senderId) || parts[0];
    recipients = [String(other)];
  } else {
    try {
      const groupRes = await getAllRows<GroupConversation>('Groups', {
        filters: { _id: ObjectId.isValid(roomId) ? new ObjectId(roomId) : roomId },
        limit: 1,
      });
      const group = groupRes.data?.[0];
      if (group) {
        heading = group.name || heading;
        const members: (GroupMemberSchema | MemberInfo | string)[] = Array.isArray(group.members) ? group.members : [];
        const ids = members
          .map((m) => {
            if (typeof m === 'string') return String(m);
            const obj = m as GroupMemberSchema | MemberInfo;
            return obj._id ? String(obj._id) : (obj as MemberInfo).id ? String((obj as MemberInfo).id) : '';
          })
          .filter((id) => id && id !== senderId);
        recipients = Array.from(new Set(ids));
      }
    } catch {}
  }

  const targets = Array.from(new Set([...recipients, senderId])).filter(Boolean);
  if (targets.length === 0) return;

  const url = 'https://api.onesignal.com/notifications';
  let subscriptionIds: string[] = [];
  try {
    const usersRes = await getAllRows<User>(USERS_COLLECTION_NAME, {
      filters: { _id: { $in: targets.map((t) => (ObjectId.isValid(t) ? new ObjectId(t) : t)) } },
      limit: 9999,
    });
    subscriptionIds = Array.from(
      new Set(
        (usersRes.data || [])
          .map((u) =>
            Array.isArray((u as Record<string, unknown>)['onesignalSubs'])
              ? ((u as Record<string, unknown>)['onesignalSubs'] as string[])
              : [],
          )
          .flat()
          .filter((x) => typeof x === 'string' && x.trim().length > 0),
      ),
    );
  } catch {}

  const useSubs = subscriptionIds.length > 0;
  const payload = useSubs
    ? {
        app_id: appId,
        include_subscription_ids: subscriptionIds,
        target_channel: 'push',
        contents: { en: body, vi: body },
        headings: { en: heading, vi: heading },
        isAnyWeb: true,
      }
    : {
        app_id: appId,
        include_aliases: { external_id: targets },
        target_channel: 'push',
        contents: { en: body, vi: body },
        headings: { en: heading, vi: heading },
        isAnyWeb: true,
      };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // const txt = await res.text();
      const filtersPayload = {
        app_id: appId,
        target_channel: 'push',
        isAnyWeb: true,
        filters: targets
          .map((rid) => ({ field: 'tag', relation: '=', key: 'userId', value: rid }))
          .flatMap((f, i) => (i === 0 ? [f] : [{ operator: 'OR' }, f])),
        contents: { en: body, vi: body },
        headings: { en: heading, vi: heading },
      };
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${apiKey}`,
        },
        body: JSON.stringify(filtersPayload),
      });
    }
  } catch {}
}

export async function POST(req: NextRequest) {
  const {
    action,
    collectionName = MESSAGES_COLLECTION_NAME,
    data,
    filters,
    field,
    value,
    skip,
    limit,
    _id: requestId,
    code,
    sort,
    roomId,
    userId,
    messageId,
    assetType,
    beforeTs,
  } = await req.json();

  try {
    switch (action) {
      case 'create': {
        const newData = {
          ...data,
          // Dùng server timestamp để đảm bảo đồng bộ
          timestamp: Date.now(),
          // Người tạo tin nhắn mặc định đã đọc
          readBy: [data.sender],
        };

        // Xóa _id (nếu có) để MongoDB tự sinh ObjectId mới
        if (newData._id) delete newData._id;
        if (newData.id) delete newData.id;

        const newId = await addRow<Message>(collectionName, newData);
        try {
          await sendPushOnMessage({
            roomId: String(newData.roomId),
            senderId: String(newData.sender),
            content: String(newData.content || ''),
          });
        } catch {}
        return NextResponse.json({ success: true, _id: newId });
      }

      case 'read': {
        const { roomId, isPinned, searchQuery, ...otherFilters } = filters || {};

        const baseFilters: MongoFilters = {};
        if (roomId) {
          const variants: unknown[] = [roomId];
          const num = Number(roomId);
          if (!Number.isNaN(num)) variants.push(num);
          if (ObjectId.isValid(String(roomId))) variants.push(new ObjectId(String(roomId)));
          (baseFilters as Record<string, unknown>).roomId = { $in: variants };
        }

        if (isPinned !== undefined) {
          (baseFilters as Record<string, unknown>).isPinned = isPinned;
        }

        const finalFilters: MongoFilters = { ...baseFilters };
        for (const [k, v] of Object.entries(otherFilters || {})) {
          if (k === 'timestamp') continue;
          (finalFilters as Record<string, unknown>)[k] = v;
        }

        let searchOr: Array<Record<string, unknown>> | null = null;
        if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
          const escapedTerm = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const searchRegex = new RegExp(escapedTerm, 'i');
          searchOr = [{ content: { $regex: searchRegex } }, { fileName: { $regex: searchRegex } }];
        }

        const tsCondRaw = (otherFilters || {})['timestamp'] as Record<string, unknown> | undefined;
        if (tsCondRaw && typeof tsCondRaw === 'object') {
          const op = (['$lt', '$lte', '$gt', '$gte'] as const).find((k) => k in tsCondRaw);
          if (op) {
            const val = (tsCondRaw as Record<string, unknown>)[op] as number;
            const expr = { [op]: [{ $toDouble: '$timestamp' }, val] } as Record<string, unknown>;
            const tsOr = [{ timestamp: tsCondRaw }, { $expr: expr }];
            if (searchOr) {
              (finalFilters as Record<string, unknown>).$and = [{ $or: tsOr }, { $or: searchOr }];
            } else {
              (finalFilters as Record<string, unknown>).$or = tsOr;
            }
          } else if (searchOr) {
            (finalFilters as Record<string, unknown>).$or = searchOr;
          }
        } else if (searchOr) {
          (finalFilters as Record<string, unknown>).$or = searchOr;
        }

        const result = await getAllRows<Message>(collectionName, {
          search: undefined,
          skip,
          limit,
          filters: finalFilters,
          sort,
        });

        const messages: Message[] = result.data || [];

        // ... (phần còn lại của case 'read' để lấy thông tin sender và trả về)
        // ... (phần lấy danh sách senderIds, query users, enrichedMessages)

        // Lấy danh sách senderId (hỗ trợ cả ObjectId, number, string)
        const rawSenderIds = [
          ...new Set(
            messages.map((m) => {
              const s = (m as Message).sender as unknown;
              if (s && typeof s === 'object' && s !== null && '_id' in (s as Record<string, unknown>)) {
                return String((s as Record<string, unknown>)._id);
              }
              return String((m as Message).sender);
            }),
          ),
        ];

        const senderIdValues = rawSenderIds.map((idStr) => {
          if (ObjectId.isValid(idStr)) return new ObjectId(idStr);
          const num = Number(idStr);
          return Number.isNaN(num) ? idStr : num;
        });

        // ... (các bước lấy userMap và enrichedMessages)

        const usersResult = await getAllRows<User>(USERS_COLLECTION_NAME, {
          filters: { _id: { $in: senderIdValues } },
          limit: 999999,
        });
        const userMap = new Map<string, User>();
        (usersResult.data || []).forEach((u) => userMap.set(String(u._id), u));

        // Map info vào message
        const enrichedMessages = messages.map((msg) => {
          const user = userMap.get(String(msg.sender));
          return {
            ...msg,
            sender: user
              ? { _id: String(user._id), name: user.name, avatar: user.avatar }
              : { _id: String(msg.sender), name: 'Unknown', avatar: null },
          };
        });

        const uniqueMessages = Array.from(new Map(enrichedMessages.map((m) => [String(m._id), m])).values());
        return NextResponse.json({
          total: result.total,
          data: uniqueMessages,
        });
      }

      case 'readAssets': {
        if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
        const type = String(assetType || '').toLowerCase();
        const max = typeof limit === 'number' && limit > 0 ? Math.min(limit, 5000) : 6;

        const videoRegex = /\.(mp4|mov|mkv|webm|avi|m4v)$/i;
        const linkRegex = /(https?:\/\/|www\.)\S+/i;

        const baseFilters: MongoFilters = {
          roomId,
          isRecalled: { $ne: true },
        };
        if (typeof beforeTs === 'number' && beforeTs > 0) {
          (baseFilters as MongoFilters).timestamp = { $lte: beforeTs };
        }

        let mongoFilters: MongoFilters = { ...baseFilters };

        if (type === 'media') {
          mongoFilters = {
            ...baseFilters,
            $or: [
              { type: 'image' },
              { type: 'video' },
              {
                $and: [
                  { type: 'file' },
                  { $or: [{ fileUrl: { $regex: videoRegex } }, { fileName: { $regex: videoRegex } }] },
                ],
              },
            ],
          };
        } else if (type === 'file') {
          mongoFilters = {
            ...baseFilters,
            type: 'file',
            $nor: [{ fileUrl: { $regex: videoRegex } }, { fileName: { $regex: videoRegex } }],
          };
        } else if (type === 'link') {
          mongoFilters = {
            ...baseFilters,
            type: 'text',
            content: { $regex: linkRegex },
          };
        } else {
          return NextResponse.json({ error: 'Invalid assetType' }, { status: 400 });
        }

        const result = await getAllRows<Message>(collectionName, {
          filters: mongoFilters,
          limit: max,
          sort: { field: 'timestamp', order: 'desc' },
        });

        const items: { id: string; url?: string; fileName?: string; type?: string; timestamp: number }[] = (
          result.data || []
        ).map((msg) => {
          if (type === 'media') {
            const isVid = msg.type === 'video' || videoRegex.test(String(msg.fileUrl || msg.fileName || ''));
            return {
              id: String(msg._id),
              url: String(msg.fileUrl || ''),
              fileName: msg.fileName,
              type: isVid ? 'video' : 'image',
              timestamp: Number(msg.timestamp) || Date.now(),
            };
          }
          if (type === 'file') {
            return {
              id: String(msg._id),
              url: String(msg.fileUrl || msg.content || ''),
              fileName: msg.fileName || 'Tài liệu',
              timestamp: Number(msg.timestamp) || Date.now(),
            };
          }
          // link
          {
            const raw = String(msg.content || '');
            const firstMatch = raw.match(linkRegex);
            const onlyUrl = firstMatch ? String(firstMatch[0]) : '';
            return {
              id: String(msg._id),
              url: onlyUrl,
              timestamp: Number(msg.timestamp) || Date.now(),
            };
          }
        });

        const toDateKey = (ts: number) => {
          const d = new Date(ts);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        const toDateLabel = (ts: number) => {
          const d = new Date(ts);
          const today = new Date();
          const yday = new Date();
          yday.setDate(yday.getDate() - 1);
          const sameDate = (a: Date, b: Date) =>
            a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
          if (sameDate(d, today)) return 'Hôm nay';
          if (sameDate(d, yday)) return 'Hôm qua';
          return d.toLocaleDateString('vi-VN');
        };

        const map = new Map<string, { dateKey: string; dateLabel: string; items: typeof items }>();
        items.forEach((it) => {
          const key = toDateKey(it.timestamp);
          if (!map.has(key)) map.set(key, { dateKey: key, dateLabel: toDateLabel(it.timestamp), items: [] });
          map.get(key)!.items.push(it);
        });
        const groups = Array.from(map.values());
        groups.sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));
        groups.forEach((g) => g.items.sort((a, b) => b.timestamp - a.timestamp));

        const nextCursor =
          (result.data || []).length > 0 ? Math.min(...(result.data || []).map((m) => m.timestamp)) : null;

        return NextResponse.json({ success: true, total: result.total || items.length, groups, nextCursor });
      }

      case 'recall': {
        if (!messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
        const result = await updateByField<Message>(collectionName, '_id', messageId, { isRecalled: true });
        return NextResponse.json({ success: true, result });
      }

      case 'markAsRead': {
        if (!roomId || !userId) {
          return NextResponse.json({ error: 'Missing roomId or userId' }, { status: 400 });
        }

        // 1. Filter: Tìm các tin nhắn trong roomId có userId CHƯA đọc ($ne: not equal)
        const filter = {
          roomId,
          readBy: { $ne: userId },
        };

        // 2. Update: Thêm userId vào mảng readBy của các tin nhắn tìm được ($addToSet)
        const updateData = {
          $addToSet: { readBy: userId },
        };

        const result = await updateMany<Message>(collectionName, filter, updateData);

        return NextResponse.json({ success: true, result });
      }

      case 'togglePin': {
        // messageId: ID tin nhắn cần ghim/bỏ ghim
        // isPinned: Trạng thái mới (true/false) được gửi từ frontend
        if (!messageId || !data || typeof data.isPinned !== 'boolean') {
          return NextResponse.json({ error: 'Missing messageId or invalid data/isPinned status' }, { status: 400 });
        }

        const newPinnedStatus = data.isPinned;

        // Tìm tin nhắn theo ID và cập nhật trường isPinned
        const result = await updateByField<Message>(
          collectionName,
          '_id', // Tìm theo ID
          messageId,
          { isPinned: newPinnedStatus }, // Cập nhật trạng thái mới
        );

        return NextResponse.json({ success: true, result });
      }

      case 'getById':
        return NextResponse.json(await getRowByIdOrCode<Message>(collectionName, { _id: requestId, code }));

      case 'update': {
        if (!field || value === undefined)
          return NextResponse.json({ error: 'Missing field or value' }, { status: 400 });
        const key = String(field) as keyof Message;
        const val: string | number =
          typeof value === 'string' || typeof value === 'number' ? (value as string | number) : String(value);
        const ok = await updateByField<Message>(collectionName, key, val, data as Partial<Message>);
        return NextResponse.json({ success: ok });
      }

      case 'updateMany': {
        if (!filters || !data) return NextResponse.json({ error: 'Missing filters or data' }, { status: 400 });
        const result = await updateMany<Message>(collectionName, filters, { $set: data });
        return NextResponse.json({
          success: true,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        });
      }

      case 'delete': {
        if (!field || value === undefined)
          return NextResponse.json({ error: 'Missing field or value' }, { status: 400 });
        const isIdField = String(field) === '_id';
        let ok = false;
        if (isIdField) {
          ok = await deleteById(collectionName, String(value));
        } else {
          const key = String(field) as keyof Message;
          const val: string | number =
            typeof value === 'string' || typeof value === 'number' ? (value as string | number) : String(value);
          ok = await deleteByField<Message>(collectionName, key, val);
        }
        return NextResponse.json({ success: ok });
      }

      case 'globalSearch': {
        const searchTerm = data?.searchTerm;
        const searchUserId = data?.userId;

        if (!searchTerm || !searchUserId) {
          return NextResponse.json({ error: 'Missing userId or searchTerm' }, { status: 400 });
        }

        // ========== BƯỚC 1: LẤY DANH SÁCH GROUP MÀ USER LÀ THÀNH VIÊN ==========
        const groupRoomIds: string[] = [];
        const groupMap = new Map<string, GroupSummary>();

        try {
          const allGroupsResult = await getAllRows<GroupConversation>('Groups', {
            filters: {},
            limit: 9999,
          });

          // 🔥 SỬA LẠI: Filter groups mà user là thành viên
          const getMemberId = (m: MemberInput): string | null => {
            if (!m) return null;
            if (typeof m === 'string') return m;
            if (typeof m === 'object') {
              if ('_id' in m && m._id) return String(m._id);
              if ('id' in m && m.id) return String(m.id);
            }
            return null;
          };

          const userGroups = (allGroupsResult.data || []).filter((g) => {
            if (g.members && Array.isArray(g.members)) {
              const isMemberInArray = (g.members as MemberInput[]).some((m) => {
                const memberId = getMemberId(m);
                return String(memberId) === String(searchUserId);
              });
              if (isMemberInArray) return true;
            }
            return false;
          });

          userGroups.forEach((g) => {
            const gId = String(g._id);
            groupRoomIds.push(gId);

            let membersList: string[] = [];
            if (g.members && Array.isArray(g.members)) {
              membersList = (g.members as MemberInput[]).map((m) => getMemberId(m) || String(m));
            }

            groupMap.set(gId, {
              _id: gId,
              name: g.name || 'Nhóm',
              avatar: g.avatar,
              isGroup: true,
              members: membersList,
            });
          });
        } catch (e) {
          console.error('❌ [API] Error fetching groups:', e);
        }

        // ========== BƯỚC 2: TẠO REGEX TÌM KIẾM ==========
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedTerm, 'i');

        // ========== BƯỚC 3: LẤY DANH SÁCH ROOMID CHAT 1-1 ==========
        const oneToOneRoomIds: string[] = [];
        const userMap = new Map<string, User>();

        try {
          const allUsersResult = await getAllRows<User>(USERS_COLLECTION_NAME, {
            filters: {},
            limit: 9999,
          });

          (allUsersResult.data || []).forEach((u) => {
            userMap.set(String(u._id), u);
          });

          const otherUsers = allUsersResult.data?.filter((u) => String(u._id) !== String(searchUserId)) || [];

          otherUsers.forEach((otherUser) => {
            const ids = [searchUserId, String(otherUser._id)].sort();
            const roomId = `${ids[0]}_${ids[1]}`;
            oneToOneRoomIds.push(roomId);
          });
        } catch (e) {
          console.error('❌ [API] Error generating 1-1 rooms:', e);
        }

        const allAccessibleRoomIds = [...groupRoomIds, ...oneToOneRoomIds];

        // ========== BƯỚC 4: TÌM KIẾM TIN NHẮN ==========
        const searchFilters = {
          $and: [
            {
              $or: [{ content: { $regex: searchRegex } }, { fileName: { $regex: searchRegex } }],
            },
            {
              roomId: { $in: allAccessibleRoomIds },
            },
            { isDeleted: { $ne: true } },
            { isRecalled: { $ne: true } },
          ],
        };

        const searchResults = await getAllRows<Message>(collectionName, {
          filters: searchFilters,
          limit: data.limit || 100,
          sort: { field: 'timestamp', order: 'desc' },
        });

        const foundMessages: Message[] = searchResults.data || [];

        if (!foundMessages.length) {
          return NextResponse.json({ success: true, data: [], total: 0 });
        }

        // ========== BƯỚC 5: LÀM GIÀU DỮ LIỆU TIN NHẮN ==========
        const enrichedMessages = foundMessages.map((msg) => {
          const senderId = String(msg.sender);
          const senderUser = userMap.get(senderId);
          const isMyMessage = senderId === searchUserId;

          const chatInfo: {
            roomId: string;
            roomName: string;
            roomAvatar: string | null | undefined;
            isGroupChat: boolean;
            partnerId: string | null;
            partnerName: string;
            partnerAvatar: string | null | undefined;
          } = {
            roomId: msg.roomId,
            roomName: 'Cuộc trò chuyện',
            roomAvatar: null,
            isGroupChat: false,
            partnerId: null,
            partnerName: 'Người dùng',
            partnerAvatar: null,
          };

          // 🔥 CHECK GROUP TRƯỚC
          const isInGroup = groupMap.has(msg.roomId);

          if (isInGroup) {
            const group = groupMap.get(msg.roomId);
            chatInfo.isGroupChat = true;
            chatInfo.roomId = msg.roomId;
            chatInfo.roomName = group?.name || 'Nhóm';
            chatInfo.roomAvatar = group?.avatar || null;
            chatInfo.partnerId = null;
          } else {
            // Chat 1-1
            chatInfo.isGroupChat = false;

            let partnerId: string | null = null;

            if (msg.roomId && msg.roomId.includes('_')) {
              const parts = msg.roomId.split('_');
              partnerId = parts[0] === searchUserId ? parts[1] : parts[0];
            } else {
              partnerId = senderId === searchUserId ? (msg.receiver ? String(msg.receiver) : null) : senderId;
            }

            if (partnerId) {
              const partnerUser = userMap.get(partnerId);

              chatInfo.partnerId = partnerId;
              chatInfo.partnerName = partnerUser?.name || 'Người dùng';
              chatInfo.partnerAvatar = partnerUser?.avatar || null;
              chatInfo.roomName = chatInfo.partnerName;
              chatInfo.roomAvatar = chatInfo.partnerAvatar;

              const ids = [searchUserId, partnerId].sort();
              chatInfo.roomId = `${ids[0]}_${ids[1]}`;
            }
          }

          // Format content preview
          let contentPreview = '';
          if (msg.type === 'file' && msg.fileName) {
            contentPreview = `📎 ${msg.fileName}`;
          } else if (msg.type === 'image') {
            contentPreview = '🖼️ Hình ảnh';
          } else if (msg.type === 'sticker') {
            contentPreview = '😊 Sticker';
          } else {
            contentPreview = msg.content || 'Tin nhắn';
          }

          const displaySenderName = isMyMessage ? 'Bạn' : senderUser?.name || `User ${senderId.slice(0, 8)}`;
          const displayRoomName = chatInfo.isGroupChat ? chatInfo.roomName : chatInfo.partnerName;

          return {
            _id: String(msg._id),
            type: msg.type,
            content: msg.content,
            fileName: msg.fileName,
            fileUrl: msg.fileUrl,
            timestamp: msg.timestamp,

            sender: senderId,
            senderName: displaySenderName,
            senderAvatar: senderUser?.avatar || null,
            isMyMessage,

            receiver: msg.receiver ? String(msg.receiver) : null,

            ...chatInfo,

            displaySenderName,
            displayRoomName,
            contentPreview,

            replyToMessageId: msg.replyToMessageId,
            replyToMessageName: msg.replyToMessageName,
          };
        });

        // ========== BƯỚC 6: PHÂN LOẠI KẾT QUẢ ==========
        const messagesByType = {
          text: enrichedMessages.filter((m) => m.type === 'text'),
          file: enrichedMessages.filter((m) => m.type === 'file'),
          image: enrichedMessages.filter((m) => m.type === 'image'),
          video: enrichedMessages.filter((m) => m.type === 'video'),
          sticker: enrichedMessages.filter((m) => m.type === 'sticker'),
          reminder: enrichedMessages.filter((m) => m.type === 'reminder'),
          all: enrichedMessages,
        };

        const messagesBySource = {
          group: enrichedMessages.filter((m) => m.isGroupChat),
          oneToOne: enrichedMessages.filter((m) => !m.isGroupChat),
          all: enrichedMessages,
        };

        return NextResponse.json({
          success: true,
          data: enrichedMessages,
          total: searchResults.total || enrichedMessages.length,
          metadata: {
            searchTerm,
            totalResults: enrichedMessages.length,
            byType: {
              text: messagesByType.text.length,
              file: messagesByType.file.length,
              image: messagesByType.image.length,
              video: messagesByType.video.length,
              sticker: messagesByType.sticker.length,
              reminder: messagesByType.reminder.length,
            },
            bySource: {
              group: messagesBySource.group.length,
              oneToOne: messagesBySource.oneToOne.length,
            },
          },
        });
      }

      case 'readReminders': {
        const searchUserId = data?.userId;
        const untilTs = typeof data?.untilTs === 'number' ? data.untilTs : undefined;
        const fromTs = typeof data?.fromTs === 'number' ? data.fromTs : undefined;

        if (!searchUserId) {
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const groupRoomIds: string[] = [];
        try {
          const allGroupsResult = await getAllRows<GroupConversation>('Groups', {
            filters: {},
            limit: 9999,
          });

          const getMemberId = (m: MemberInput): string | null => {
            if (!m) return null;
            if (typeof m === 'string') return m;
            if (typeof m === 'object') {
              if ('_id' in m && m._id) return String(m._id);
              if ('id' in m && m.id) return String(m.id);
            }
            return null;
          };

          const userGroups = (allGroupsResult.data || []).filter((g) => {
            if (g.members && Array.isArray(g.members)) {
              return (g.members as MemberInput[]).some((m) => String(getMemberId(m)) === String(searchUserId));
            }
            return false;
          });

          userGroups.forEach((g) => groupRoomIds.push(String(g._id)));
        } catch {}

        const oneToOneRoomIds: string[] = [];
        try {
          const allUsersResult = await getAllRows<User>(USERS_COLLECTION_NAME, {
            filters: {},
            limit: 9999,
          });
          const otherUsers = (allUsersResult.data || []).filter((u) => String(u._id) !== String(searchUserId));
          otherUsers.forEach((otherUser) => {
            const ids = [searchUserId, String(otherUser._id)].sort();
            const roomId = `${ids[0]}_${ids[1]}`;
            oneToOneRoomIds.push(roomId);
          });
        } catch {}

        const allAccessibleRoomIds = [...groupRoomIds, ...oneToOneRoomIds];

        const reminderFilters: MongoFilters = {
          type: 'reminder',
          roomId: { $in: allAccessibleRoomIds },
          isDeleted: { $ne: true },
          isRecalled: { $ne: true },
          reminderFired: { $ne: true },
        };
        if (typeof fromTs === 'number' || typeof untilTs === 'number') {
          (reminderFilters as MongoFilters).reminderAt = {
            ...(typeof fromTs === 'number' ? { $gte: fromTs } : {}),
            ...(typeof untilTs === 'number' ? { $lte: untilTs } : {}),
          };
        }

        const searchResults = await getAllRows<Message>(collectionName, {
          filters: reminderFilters,
          limit: data?.limit || 5000,
          sort: { field: 'reminderAt', order: 'asc' },
        });

        return NextResponse.json({ success: true, data: searchResults.data || [], total: searchResults.total || 0 });
      }

      case 'fireReminder': {
        if (!messageId || !userId) {
          return NextResponse.json({ error: 'Missing messageId or userId' }, { status: 400 });
        }

        const rowRes = await getRowByIdOrCode<Message>(collectionName, { _id: messageId });
        const row = (rowRes?.row ?? null) as Message | null;

        if (!row || row.type !== 'reminder') {
          return NextResponse.json({ success: false, updated: false });
        }

        const latestAt = row.reminderAt || row.timestamp || Date.now();
        const repeat = row.reminderRepeat || 'none';

        // Tính nextAt cho recurring reminder
        let nextAt: number | null = null;
        if (repeat === 'daily') nextAt = latestAt + 24 * 60 * 60 * 1000;
        else if (repeat === 'weekly') nextAt = latestAt + 7 * 24 * 60 * 60 * 1000;
        else if (repeat === 'monthly') {
          const d = new Date(latestAt);
          d.setMonth(d.getMonth() + 1);
          nextAt = d.getTime();
        }

        // Update message
        const updateData = nextAt
          ? { reminderAt: nextAt, reminderFired: false, editedAt: Date.now() }
          : { reminderFired: true };

        const filter: Filter<Message> = {
          _id: ObjectId.isValid(String(messageId)) ? new ObjectId(String(messageId)) : String(messageId),
          type: 'reminder' as const, // ✅ Thêm 'as const'
          reminderFired: { $ne: true },
          reminderAt: latestAt,
        } as Filter<Message>; // ✅ Thêm type assertion

        const upd = await updateMany<Message>(collectionName, filter, { $set: updateData });
        const modified = upd?.modifiedCount ?? 0;

        if (!modified) {
          return NextResponse.json({ success: true, updated: false });
        }

        // ✅ TẠO THÔNG BÁO
        const timeStr = new Date(latestAt).toLocaleString('vi-VN');
        const notifyContent = `Đến giờ lịch hẹn: "${String(row.content || '')}" lúc ${timeStr}`;

        const notifyId = await addRow<Partial<Message>>(collectionName, {
          roomId: String(row.roomId),
          sender: String(userId),
          type: 'notify',
          content: notifyContent,
          timestamp: Date.now(),
          replyToMessageId: String(row._id),
        });

        // ✅ EMIT SOCKET - CHỈ 1 LẦN DUY NHẤT
        try {
          const io = getSocketInstance(); // Cần implement hàm này

          const roomId = String(row.roomId);

          // Emit thông báo
          io.in(roomId).emit('receive_message', {
            _id: notifyId,
            roomId: roomId,
            sender: String(userId),
            type: 'notify',
            content: notifyContent,
            timestamp: Date.now(),
            replyToMessageId: String(row._id),
          });

          // Nếu có nextAt, emit update reminder
          if (nextAt) {
            io.in(roomId).emit('edit_message', {
              _id: String(row._id),
              roomId: roomId,
              reminderAt: nextAt,
              editedAt: Date.now(),
            });
          }
        } catch (err) {
          console.error('❌ Socket emit error:', err);
        }

        // Push notification
        try {
          await sendPushOnMessage({
            roomId: String(row.roomId),
            senderId: String(userId),
            content: notifyContent,
          });
        } catch {}

        return NextResponse.json({ success: true, updated: true, notifyId, nextAt });
      }

      case 'editMessage': {
        const { messageId, newContent } = data;

        // 1. 🔥 LẤY TIN NHẮN HIỆN TẠI ĐỂ LƯU NỘI DUNG GỐC
        const existingMsg = await getRowByIdOrCode<Message>(collectionName, { _id: messageId });

        // 2. Xác định nội dung gốc (nếu originalContent chưa tồn tại)
        const originalContentToSave = existingMsg?.row.originalContent || existingMsg?.row.content;

        if (!messageId || !newContent || typeof newContent !== 'string' || !existingMsg) {
          return NextResponse.json({ error: 'Invalid data or message not found' }, { status: 400 });
        }

        // 3. Cập nhật data
        const updateData = {
          content: newContent,
          editedAt: Date.now(),
          originalContent: originalContentToSave,
        };

        const result = await updateByField<Message>(collectionName, '_id', messageId, updateData);

        return NextResponse.json({ success: true, result });
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('MongoDB API Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

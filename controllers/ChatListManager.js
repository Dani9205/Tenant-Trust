const { Op, fn, col } = require('sequelize');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Block = require('../models/Block');

class ChatListManager {
  constructor(io, connectedUsers) {
    this.io = io;
    this.connectedUsers = connectedUsers;
  }

  async fetchAndEmitChatList(socket, userId) {
    try {
      // Get distinct chat partners
      const senderChats = await Chat.findAll({
        attributes: [[fn('DISTINCT', col('receiverId')), 'otherId']],
        where: { senderId: userId },
        raw: true
      });

      const receiverChats = await Chat.findAll({
        attributes: [[fn('DISTINCT', col('senderId')), 'otherId']],
        where: { receiverId: userId },
        raw: true
      });

      const otherIds = new Set([
        ...senderChats.map(c => c.otherId),
        ...receiverChats.map(c => c.otherId)
      ]);

      if (otherIds.size === 0) {
        const chatList = [];
        if (socket) {
          socket.emit('chatList', chatList);
        } else {
          this.io.to(userId.toString()).emit('chatListUpdate', chatList);
        }
        return;
      }

      // Fetch user info and block status
      const [users, myBlocks, theirBlocks] = await Promise.all([
        User.findAll({
          where: { id: { [Op.in]: Array.from(otherIds) } },
          attributes: ['id', 'name', 'image', 'isOnline', 'lastSeen']
        }),
        Block.findAll({ where: { myId: userId }, attributes: ['hisId'] }),
        Block.findAll({ where: { hisId: userId }, attributes: ['myId'] })
      ]);

      const userMap = new Map(users.map(u => [u.id, u]));
      const iBlockedSet = new Set(myBlocks.map(b => b.hisId));
      const blockedBySet = new Set(theirBlocks.map(b => b.myId));

      // Build chat list items
      const chatItemsPromises = Array.from(otherIds).map(async (otherId) => {
        const [latestVisible, latestAny, unreadCount] = await Promise.all([
          Chat.findOne({
            where: {
              [Op.and]: [
                {
                  [Op.or]: [
                    { senderId: userId, receiverId: otherId },
                    { senderId: otherId, receiverId: userId }
                  ]
                },
                {
                  [Op.or]: [
                    { deletedBy: { [Op.is]: null } },
                    { deletedBy: { [Op.notLike]: `%${userId}%` } }
                  ]
                }
              ]
            },
            order: [['createdAt', 'DESC']]
          }),
          Chat.findOne({
            where: {
              [Op.or]: [
                { senderId: userId, receiverId: otherId },
                { senderId: otherId, receiverId: userId }
              ]
            },
            order: [['createdAt', 'DESC']]
          }),
          Chat.count({
            where: {
              senderId: otherId,
              receiverId: userId,
              readStatus: 0,
              [Op.or]: [
                { deletedBy: { [Op.is]: null } },
                { deletedBy: { [Op.notLike]: `%${userId}%` } }
              ]
            }
          })
        ]);

        const user = userMap.get(otherId);
        if (!user) return null;

        const isConnected = this.connectedUsers.has(otherId) && this.connectedUsers.get(otherId).length > 0;

        return {
          user: {
            id: otherId,
            name: user.name,
            image: user.image,
            isOnline: isConnected,
            lastSeen: isConnected ? null : user.lastSeen,
          },
          lastMessage: latestVisible ? {
            id: latestVisible.id,
            message: latestVisible.message,
            createdAt: latestVisible.createdAt,
            readStatus: latestVisible.readStatus,
            senderId: latestVisible.senderId,
          } : null,
          unreadCount,
          iBlockedOther: iBlockedSet.has(otherId),
          blockedByOther: blockedBySet.has(otherId),
          sortTime: latestAny ? latestAny.createdAt : new Date(0)
        };
      });

      const chatItems = await Promise.all(chatItemsPromises);
      const filteredItems = chatItems.filter(item => item !== null);
      filteredItems.sort((a, b) => new Date(b.sortTime) - new Date(a.sortTime));

      const chatList = filteredItems.map(({ sortTime, ...item }) => item);

      if (socket) {
        socket.emit('chatList', chatList);
      } else {
        this.io.to(userId.toString()).emit('chatListUpdate', chatList);
      }
      console.log(`Chat list sent to user ${userId}`);
    } catch (error) {
      console.error('Error fetching chat list:', error);
      if (socket) {
        socket.emit('socketError', { message: `Failed to fetch chat list: ${error.message || 'Unknown error'}` });
      }
    }
  }

  async updateChatListAfterNewMessage(senderId, receiverId) {
    try {
      if (this.connectedUsers.has(senderId)) {
        await this.fetchAndEmitChatList(null, senderId);
      }
      if (this.connectedUsers.has(receiverId)) {
        await this.fetchAndEmitChatList(null, receiverId);
      }
    } catch (error) {
      console.error('Error updating chat list:', error);
    }
  }
}

module.exports = ChatListManager;



// // controllers/ChatListManager.js
// const { Op } = require('sequelize');
// const User = require('../models/User');
// const Chat = require('../models/Chat');

// class ChatListManager {
//   constructor(io, connectedUsers) {
//     this.io = io;
//     this.connectedUsers = connectedUsers; // same map reference from ChatController
//   }

//   async fetchAndEmitChatList(socket, userId) {
//     try {
//       const chatListResults = await Chat.findAll({
//         where: {
//           [Op.or]: [{ senderId: userId }, { receiverId: userId }],
//           [Op.or]: [
//              { deletedBy: { [Op.is]: null } },
//              { deletedBy: { [Op.notLike]: `%${userId}%` } },
//           ],
//         },
//         include: [
//           { model: User, as: 'Sender', attributes: ['id', 'name', 'image', 'isOnline', 'lastSeen'] },
//           { model: User, as: 'Receiver', attributes: ['id', 'name', 'image', 'isOnline', 'lastSeen'] },
//         ],
//         order: [['createdAt', 'DESC']],
//       });

//       const uniqueChats = new Map();
//       chatListResults.forEach((chat) => {
//         const chatKey = chat.senderId < chat.receiverId
//           ? `${chat.senderId}-${chat.receiverId}`
//           : `${chat.receiverId}-${chat.senderId}`;

//         if (!uniqueChats.has(chatKey)) {
//           uniqueChats.set(chatKey, {
//             user: {
//               id: chat.senderId === userId ? chat.Receiver.id : chat.Sender.id,
//               name: chat.senderId === userId ? chat.Receiver.name : chat.Sender.name,
//               image: chat.senderId === userId ? chat.Receiver.image : chat.Sender.image,
//               // prefer in-memory online status if available
//               isOnline: (this.connectedUsers.has(chat.senderId === userId ? chat.Receiver.id : chat.Sender.id)
//                 && this.connectedUsers.get(chat.senderId === userId ? chat.Receiver.id : chat.Sender.id).length > 0)
//                 ? true
//                 : (chat.senderId === userId ? chat.Receiver.isOnline : chat.Sender.isOnline),
//               lastSeen: (this.connectedUsers.has(chat.senderId === userId ? chat.Receiver.id : chat.Sender.id)
//                 && this.connectedUsers.get(chat.senderId === userId ? chat.Receiver.id : chat.Sender.id).length > 0)
//                 ? null
//                 : (chat.senderId === userId ? chat.Receiver.lastSeen : chat.Sender.lastSeen),
//             },
//             lastMessage: {
//               id: chat.id,
//               message: chat.message,
//               createdAt: chat.createdAt,
//               readStatus: chat.readStatus,
//               senderId: chat.senderId,
//             },
//             unreadCount: chat.receiverId === userId && chat.readStatus === 0 ? 1 : 0,
//           });
//         } else if (chat.receiverId === userId && chat.readStatus === 0) {
//           const existing = uniqueChats.get(chatKey);
//           existing.unreadCount = (existing.unreadCount || 0) + 1;
//           uniqueChats.set(chatKey, existing);
//         }
//       });

//       const chatList = Array.from(uniqueChats.values());
//       if (socket) {
//         socket.emit('chatList', chatList);
//       } else {
//         this.io.to(userId.toString()).emit('chatListUpdate', chatList);
//       }
//       console.log(`Chat list sent to user ${userId}`);
//     } catch (error) {
//       console.error('Error fetching chat list:', error);
//     }
//   }

//   async updateChatListAfterNewMessage(senderId, receiverId) {
//     try {
//       // Emit to both parties if they are connected
//       if (this.connectedUsers.has(senderId)) {
//         await this.fetchAndEmitChatList(null, senderId);
//       }
//       if (this.connectedUsers.has(receiverId)) {
//         await this.fetchAndEmitChatList(null, receiverId);
//       }
//     } catch (error) {
//       console.error('Error updating chat list:', error);
//     }
//   }
// }

// module.exports = ChatListManager;

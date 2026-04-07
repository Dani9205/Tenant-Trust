// controllers/ChatListManager.js
const { Op } = require('sequelize');
const User = require('../models/User');
const Chat = require('../models/Chat');

class ChatListManager {
  constructor(io, connectedUsers) {
    this.io = io;
    this.connectedUsers = connectedUsers; // same map reference from ChatController
  }

  async fetchAndEmitChatList(socket, userId) {
    try {
      const chatListResults = await Chat.findAll({
        where: {
          [Op.and]: [
            { [Op.or]: [{ senderId: userId }, { receiverId: userId }] },
            {
              [Op.or]: [
                { deletedBy: { [Op.is]: null } },
                { deletedBy: { [Op.notLike]: `%${userId}%` } },
              ]
            }
          ]
        },
        include: [
          { model: User, as: 'Sender', attributes: ['id', 'name', 'image', 'isOnline', 'lastSeen'] },
          { model: User, as: 'Receiver', attributes: ['id', 'name', 'image', 'isOnline', 'lastSeen'] },
        ],
        order: [['createdAt', 'DESC']],
      });

      const uniqueChats = new Map();
      chatListResults.forEach((chat) => {
        const chatKey = chat.senderId < chat.receiverId
          ? `${chat.senderId}-${chat.receiverId}`
          : `${chat.receiverId}-${chat.senderId}`;

        const otherUserId = chat.senderId === userId ? chat.receiverId : chat.senderId;
        const otherUserModel = chat.senderId === userId ? chat.Receiver : chat.Sender;

        if (!uniqueChats.has(chatKey)) {
          const isConnected = (this.connectedUsers.has(otherUserId) &&
                               this.connectedUsers.get(otherUserId).length > 0);

          uniqueChats.set(chatKey, {
            user: {
              id: otherUserId,
              name: otherUserModel?.name,
              image: otherUserModel?.image,
              isOnline: isConnected ? true : otherUserModel?.isOnline,
              lastSeen: isConnected ? null  : otherUserModel?.lastSeen,
            },
            lastMessage: {
              id: chat.id,
              message: chat.message,
              createdAt: chat.createdAt,
              readStatus: chat.readStatus,
              senderId: chat.senderId,
            },
            unreadCount: chat.receiverId === userId && chat.readStatus === 0 ? 1 : 0,
          });
        } else if (chat.receiverId === userId && chat.readStatus === 0) {
          const existing = uniqueChats.get(chatKey);
          existing.unreadCount = (existing.unreadCount || 0) + 1;
          uniqueChats.set(chatKey, existing);
        }
      });

      const chatList = Array.from(uniqueChats.values());
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

const { Op } = require('sequelize');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Block = require('../models/Block');
const ChatListManager = require('./ChatListManager');

class ChatController {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // userId -> [socket, ...]
    this.chatListManager = new ChatListManager(io, this.userSockets);
    this.initializeSocketEvents();
  }

  async loadChatData(userId, otherUserId, socket) {
    try {
      // 1) Ensure both users exist
      const [meDb, otherUserDb] = await Promise.all([
        User.findByPk(userId, { attributes: ['id'] }),
        User.findByPk(otherUserId, { attributes: ['id', 'name', 'image', 'isOnline', 'lastSeen'] })
      ]);
      if (!meDb) {
        socket.emit('socketError', { message: 'Your account was not found.' });
        return null;
      }
      if (!otherUserDb) {
        socket.emit('socketError', { message: 'The user you’re trying to chat with was not found.' });
        return null;
      }

      // 2) Load messages
      let messages;
      try {
        messages = await Chat.findAll({
          where: {
            [Op.and]: [
              {
                [Op.or]: [
                  { senderId: userId, receiverId: otherUserId },
                  { senderId: otherUserId, receiverId: userId },
                ]
              },
              {
                [Op.or]: [
                  { deletedBy: { [Op.is]: null } },
                  { deletedBy: { [Op.notLike]: `%${userId}%` } },
                ]
              }
            ]
          },
          include: [
            { model: User, as: 'Sender', attributes: ['id', 'name', 'image'] },
            { model: User, as: 'Receiver', attributes: ['id', 'name', 'image'] },
          ],
          order: [['createdAt', 'ASC']],
        });
      } catch (err) {
        console.error('Sequelize findAll(messages) error:', err);
        socket.emit('socketError', { message: `Failed to query messages: ${err.message || 'Unknown DB error'}` });
        return null;
      }

      // 3) Online status
      const isOtherOnline = this.userSockets.has(otherUserId) && this.userSockets.get(otherUserId).length > 0;
      const otherUser = {
        id: otherUserDb.id,
        name: otherUserDb.name,
        image: otherUserDb.image,
        isOnline: !!isOtherOnline,
        lastSeen: isOtherOnline ? null : otherUserDb.lastSeen,
      };

      // 4) Block state
      let iBlockedEntry, blockedByEntry;
      try {
        [iBlockedEntry, blockedByEntry] = await Promise.all([
          Block.findOne({ where: { myId: userId, hisId: otherUserId } }),
          Block.findOne({ where: { myId: otherUserId, hisId: userId } }),
        ]);
      } catch (err) {
        console.error('Block lookup error:', err);
        socket.emit('socketError', { message: `Failed to check block status: ${err.message || 'Unknown DB error'}` });
        return null;
      }

      // 5) Format chat data for the response
      const chatData = messages.map(msg => ({
        messageId: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        message: msg.message,
        createdAt: msg.createdAt.toISOString(),
      }));

      // 6) Return data for joinChat response
      return {
        chatData,
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          image: otherUser.image,
          isOnline: otherUser.isOnline,
          lastSeen: otherUser.lastSeen
            ? (otherUser.lastSeen instanceof Date
                ? otherUser.lastSeen.toISOString()
                : typeof otherUser.lastSeen === 'string'
                ? otherUser.lastSeen
                : null)
            : null,
          blockedByOther: !!blockedByEntry ? 1 : 0,
          iBlockedOther: !!iBlockedEntry ? 1 : 0,
        }
      };
    } catch (error) {
      console.error('loadChatData error:', error);
      socket.emit('socketError', { message: `Failed to load chat data: ${error.message || 'Unknown error'}` });
      return null;
    }
  }

  initializeSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log('User connected with socket ID:', socket.id);

      socket.on('connectUser', async ({ userId }) => {
        try {
          socket.data.userId = userId;

          if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, []);
            await User.update({ isOnline: true, lastSeen: null }, { where: { id: userId } });
            this.io.emit('statusUpdate', { userId, isOnline: true });
          }

          const userSockets = this.userSockets.get(userId);
          if (!userSockets.includes(socket)) {
            userSockets.push(socket);
            this.userSockets.set(userId, userSockets);
          }

          socket.join(userId.toString());
        } catch (err) {
          console.error('connectUser error:', err);
          socket.emit('socketError', { message: `connectUser failed: ${err.message || 'Unknown error'}` });
        }
      });

      socket.on('joinChat', async ({ userId, otherUserId }) => {
        try {
          if (!userId || !otherUserId) {
            socket.emit('socketError', { message: 'User IDs are required.' });
            return;
          }

          if (userId === otherUserId) {
            socket.emit('socketError', { message: 'Cannot chat with yourself.' });
            return;
          }

          const roomName = [userId, otherUserId].sort().join('-');
          socket.join(roomName);
          console.log(`User ${userId} joined room ${roomName}.`);

          // Load chat data
          const data = await this.loadChatData(userId, otherUserId, socket);
          if (!data) return; // Error already emitted in loadChatData

          // Emit the response in the requested format
          socket.emit('joinChatSuccess', {
            success: true,
            message: 'Joined chat room successfully.',
            room: roomName,
            chatData: data.chatData,
            otherUser: data.otherUser,
          });

          // Emit existing loadChatData event for backward compatibility
          socket.emit('loadChatData', {
            otherUserId,
            messages: data.chatData.map(msg => ({
              id: msg.messageId,
              senderId: msg.senderId,
              receiverId: msg.receiverId,
              message: msg.message,
              createdAt: msg.createdAt,
              readStatus: 0, // Adjust if readStatus is available in your Chat model
            })),
            user: {
              id: data.otherUser.id,
              name: data.otherUser.name,
              image: data.otherUser.image,
              isOnline: data.otherUser.isOnline,
              lastSeen: data.otherUser.lastSeen,
            },
            iBlockedOther: data.otherUser.iBlockedOther === 1,
            blockedByOther: data.otherUser.blockedByOther === 1,
          });
        } catch (error) {
          console.error('Error in joinChat:', error);
          socket.emit('socketError', {
            message: 'Failed to join chat.',
            error: error.message || 'Unknown error',
          });
        }
      });

      socket.on('loadChat', async ({ userId, otherUserId }) => {
        if (socket.data.userId !== userId) return;
        await this.loadChatData(userId, otherUserId, socket);
      });

      socket.on('getChatList', async ({ userId }) => {
        if (!userId) {
          console.error('User ID is required to fetch chat list.');
          return;
        }
        await this.chatListManager.fetchAndEmitChatList(socket, userId);
      });

      socket.on('sendMessage', async (messageData) => {
        const { senderId, receiverId, message: messageContent, type } = messageData;

        if (!senderId || !receiverId || !messageContent) {
          socket.emit('socketError', { message: 'Invalid message data.' });
          return;
        }
        if (senderId === receiverId) {
          socket.emit('socketError', { message: 'Cannot send message to yourself.' });
          return;
        }

        try {
          const senderBlockedReceiver = await Block.findOne({ where: { myId: senderId, hisId: receiverId } });
          if (senderBlockedReceiver) {
            socket.emit('socketError', { message: 'Cannot send message: You have blocked this user.' });
            return;
          }
          const receiverBlockedSender = await Block.findOne({ where: { myId: receiverId, hisId: senderId } });
          if (receiverBlockedSender) {
            socket.emit('socketError', { message: 'Cannot send message: This user has blocked you.' });
            return;
          }

          const newMessage = await Chat.create({
            senderId,
            receiverId,
            message: messageContent,
            type,
            readStatus: 0
          });

          const roomName = [senderId, receiverId].sort().join('-');
          this.io.to(roomName).emit('receiveMessage', newMessage);

          await this.chatListManager.updateChatListAfterNewMessage(senderId, receiverId);
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('socketError', { message: `Failed to send message: ${error.message || 'Unknown error'}` });
        }
      });

      socket.on('markAllAsRead', async ({ receiverId, senderId }) => {
        if (!receiverId || !senderId) return;

        try {
          await Chat.update(
            { readStatus: 1 },
            { where: { receiverId, senderId, readStatus: 0 } }
          );

          this.io.to(receiverId.toString()).emit('messagesMarkedAsRead', { senderId });
          const roomName = [senderId, receiverId].sort().join('-');
          this.io.to(roomName).emit('messageReadStatusUpdated', { senderId });
          this.io.to(senderId.toString()).emit('messagesReadBy', { receiverId });

          await this.chatListManager.fetchAndEmitChatList(null, receiverId);
          await this.chatListManager.fetchAndEmitChatList(null, senderId);
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      });

      socket.on('markMessageAsRead', async ({ messageId }) => {
        if (!messageId || !socket.data.userId) return;

        try {
          const message = await Chat.findByPk(messageId);
          if (!message || message.receiverId !== socket.data.userId || message.readStatus === 1) return;

          await message.update({ readStatus: 1 });

          const roomName = [message.senderId, message.receiverId].sort().join('-');
          this.io.to(roomName).emit('messageRead', { messageId });

          this.io.to(message.senderId.toString()).emit('singleMessageRead', {
            messageId,
            receiverId: message.receiverId
          });

          await this.chatListManager.fetchAndEmitChatList(null, socket.data.userId);
          await this.chatListManager.fetchAndEmitChatList(null, message.senderId);
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });

      socket.on('deleteMessage', async ({ userId, messageId, type = 'me' }) => {
        try {
          const message = await Chat.findByPk(messageId);
          if (!message) {
            socket.emit('socketError', { message: 'Message not found' });
            return;
          }
          if (type === 'everyone' && userId !== message.senderId) {
            socket.emit('socketError', { message: 'Only sender can delete for everyone' });
            return;
          }

          let deletedBy = JSON.parse(message.deletedBy || '[]');
          const otherUser = type === 'everyone'
            ? (userId === message.senderId ? message.receiverId : message.senderId)
            : null;
          deletedBy = [...new Set([...deletedBy, userId, otherUser].filter(Boolean))];

          await message.update({ deletedBy: JSON.stringify(deletedBy) });

          const roomName = [message.senderId, message.receiverId].sort().join('-');
          this.io.to(roomName).emit('messageDeleted', { messageId, deletedBy });

          socket.emit('messageDeletedLocally', { messageId, deletedBy });

          await this.chatListManager.updateChatListAfterNewMessage(message.senderId, message.receiverId);
        } catch (error) {
          console.error('Error deleting message:', error);
        }
      });

      socket.on('clearChat', async ({ userId, otherUserId }) => {
        try {
          const messages = await Chat.findAll({
            where: {
              [Op.or]: [
                { senderId: userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: userId },
              ]
            }
          });

          let allMessagesCleared = true;

          for (const message of messages) {
            const deletedBy = JSON.parse(message.deletedBy || '[]');
            const updatedDeletedBy = new Set(deletedBy);
            updatedDeletedBy.add(userId);
            if (deletedBy.includes(otherUserId)) {
              updatedDeletedBy.add(otherUserId);
            }

            await message.update({ deletedBy: JSON.stringify([...updatedDeletedBy]) });

            if (updatedDeletedBy.size !== 2) {
              allMessagesCleared = false;
            }
          }

          socket.emit('chatCleared', { userId, otherUserId, allMessagesCleared });

          await this.chatListManager.fetchAndEmitChatList(null, userId);
        } catch (error) {
          console.error('Error clearing chat:', error);
        }
      });

      socket.on('toggleBlockUser', async ({ userId, otherUserId }) => {
        try {
          const blockEntry = await Block.findOne({ where: { myId: userId, hisId: otherUserId } });

          if (blockEntry) {
            await Block.destroy({ where: { myId: userId, hisId: otherUserId } });
            socket.emit('iUnblockedOther', { otherUserId });
            this.io.to(otherUserId.toString()).emit('unblockedByOther');
            console.log(`User ${userId} unblocked ${otherUserId}`);
          } else {
            await Block.create({ myId: userId, hisId: otherUserId });
            socket.emit('iBlockedOther', { otherUserId });
            this.io.to(otherUserId.toString()).emit('blockedByOther', { blockerId: userId });
            console.log(`User ${userId} blocked ${otherUserId}`);
          }
        } catch (error) {
          console.error('Error toggling block status:', error);
        }
      });

      socket.on('typing', ({ senderId, receiverId }) => {
        if (senderId !== socket.data.userId) return;
        const roomName = [senderId, receiverId].sort().join('-');
        this.io.to(roomName).emit('userTyping', { userId: senderId });
      });

      socket.on('stopTyping', ({ senderId, receiverId }) => {
        if (senderId !== socket.data.userId) return;
        const roomName = [senderId, receiverId].sort().join('-');
        this.io.to(roomName).emit('userStopTyping', { userId: senderId });
      });

      socket.on('disconnect', async () => {
        try {
          if (socket.data && socket.data.userId) {
            const userId = socket.data.userId;
            const sockets = this.userSockets.get(userId) || [];
            const index = sockets.indexOf(socket);
            if (index > -1) sockets.splice(index, 1);

            if (sockets.length === 0) {
              const lastSeen = new Date().toISOString();
              await User.update({ isOnline: false, lastSeen }, { where: { id: userId } })
                .catch(err => console.error('Error updating offline status:', err));
              this.io.emit('statusUpdate', { userId, isOnline: false, lastSeen });
            }
            this.userSockets.set(userId, sockets);
          }
          console.log('User disconnected:', socket.id);
        } catch (err) {
          console.error('disconnect handler error:', err);
        }
      });
    });
  }
}

module.exports = ChatController;





// // controllers/ChatController.js
// const Chat = require('../models/Chat');
// const User = require('../models/User');
// const Block = require('../models/Block');
// const ChatListManager = require('./ChatListManager');
// const { Op } = require('sequelize');

// class ChatController {
//   constructor(io) {
//     this.io = io;
//     this.userSockets = new Map(); // userId -> [socket, ...]
//     this.chatListManager = new ChatListManager(io, this.userSockets);
//     this.initializeSocketEvents();
//   }

//   initializeSocketEvents() {
//     this.io.on('connection', (socket) => {
//       console.log('User connected with socket ID:', socket.id);

//       socket.on('connectUser', async ({ userId }) => {
//         socket.data.userId = userId;

//         if (!this.userSockets.has(userId)) {
//           this.userSockets.set(userId, []);
//           // mark online and clear lastSeen so frontend shows "online" (no stale lastSeen)
//           await User.update({ isOnline: true, lastSeen: null }, { where: { id: userId } });
//           // notify everyone that user is online (no lastSeen included)
//           this.io.emit('statusUpdate', { userId, isOnline: true });
//         }

//         const userSockets = this.userSockets.get(userId);
//         if (!userSockets.includes(socket)) {
//           userSockets.push(socket);
//           this.userSockets.set(userId, userSockets);
//         }

//         socket.join(userId.toString());
//       });

//       socket.on('joinChat', async ({ userId, otherUserId }) => {
//   if (!userId || !otherUserId) {
//     socket.emit('error', { message: 'User IDs are required.' });
//     return;
//   }
//   if (userId === otherUserId) {
//     socket.emit('error', { message: 'Cannot chat with yourself.' });
//     return;
//   }

//   const roomName = [userId, otherUserId].sort().join('-');
//   socket.join(roomName);
//   console.log(`User ${userId} joined room ${roomName}.`);

//   try {
//     // Ensure both users exist (avoid null access crash)
//     const [meDb, otherUserDb] = await Promise.all([
//       User.findByPk(userId,       { attributes: ['id'] }),
//       User.findByPk(otherUserId,  { attributes: ['id','name','image','isOnline','lastSeen'] })
//     ]);
//     if (!meDb) {
//       socket.emit('error', { message: 'Your account was not found.' });
//       return;
//     }
//     if (!otherUserDb) {
//       socket.emit('error', { message: 'The user you’re trying to chat with was not found.' });
//       return;
//     }

//     // Allow deletedBy to be NULL or not containing the current user
//     const messages = await Chat.findAll({
//       where: {
//         [Op.or]: [
//           { senderId: userId, receiverId: otherUserId },
//           { senderId: otherUserId, receiverId: userId },
//         ],
//         [Op.or]: [
//           { deletedBy: { [Op.is]: null } },
//           { deletedBy: { [Op.notLike]: `%${userId}%` } },
//         ],
//       },
//       include: [
//         { model: User, as: 'Sender', attributes: ['id','name','image'] },
//         { model: User, as: 'Receiver', attributes: ['id','name','image'] },
//       ],
//       order: [['createdAt', 'ASC']],
//     });

//     // Online status from memory
//     const isOtherOnline = this.userSockets.has(otherUserId) && this.userSockets.get(otherUserId).length > 0;
//     const otherUser = {
//       id: otherUserDb.id,
//       name: otherUserDb.name,
//       image: otherUserDb.image,
//       isOnline: !!isOtherOnline,
//       lastSeen: isOtherOnline ? null : otherUserDb.lastSeen,
//     };

//     const [iBlockedEntry, blockedByEntry] = await Promise.all([
//       Block.findOne({ where: { myId: userId, hisId: otherUserId } }),
//       Block.findOne({ where: { myId: otherUserId, hisId: userId } }),
//     ]);

//     socket.emit('loadChatData', {
//       otherUserId,
//       messages,
//       user: otherUser,
//       iBlockedOther: !!iBlockedEntry,
//       blockedByOther: !!blockedByEntry,
//     });
//   } catch (error) {
//     console.error('Error fetching previous messages:', error);
//     socket.emit('error', { message: 'Failed to load chat data.' });
//   }
// });


//       socket.on('getChatList', async ({ userId }) => {
//         if (!userId) {
//           console.error('User ID is required to fetch chat list.');
//           return;
//         }
//         await this.chatListManager.fetchAndEmitChatList(socket, userId);
//       });

//       socket.on('sendMessage', async (messageData) => {
//         const { senderId, receiverId, message: messageContent, type } = messageData;

//         if (!senderId || !receiverId || !messageContent) {
//           console.error('Sender ID, receiver ID, and message content are required.');
//           socket.emit('error', { message: 'Invalid message data.' });
//           return;
//         }

//         if (senderId === receiverId) {
//           socket.emit('error', { message: 'Cannot send message to yourself.' });
//           return;
//         }

//         try {
//           const senderBlockedReceiver = await Block.findOne({ where: { myId: senderId, hisId: receiverId } });
//           if (senderBlockedReceiver) {
//             socket.emit('error', { message: 'Cannot send message: You have blocked this user.' });
//             return;
//           }

//           const receiverBlockedSender = await Block.findOne({ where: { myId: receiverId, hisId: senderId } });
//           if (receiverBlockedSender) {
//             socket.emit('error', { message: 'Cannot send message: This user has blocked you.' });
//             return;
//           }

//           const newMessage = await Chat.create({
//             senderId,
//             receiverId,
//             message: messageContent,
//             type,
//             readStatus: 0
//           });

//           const roomName = [senderId, receiverId].sort().join('-');
//           this.io.to(roomName).emit('receiveMessage', newMessage);

//           // Update chat lists for both users (if connected)
//           await this.chatListManager.updateChatListAfterNewMessage(senderId, receiverId);
//         } catch (error) {
//           console.error('Error sending message:', error);
//           socket.emit('error', { message: 'Failed to send message.' });
//         }
//       });

//       socket.on('markAllAsRead', async ({ receiverId, senderId }) => {
//         if (!receiverId || !senderId) {
//           console.error('Receiver ID and Sender ID are required.');
//           return;
//         }

//         try {
//           const [updatedCount] = await Chat.update(
//             { readStatus: 1 },
//             {
//               where: {
//                 receiverId,
//                 senderId,
//                 readStatus: 0
//               }
//             }
//           );

//           // Inform both parties and update chat-lists for both
//           this.io.to(receiverId.toString()).emit('messagesMarkedAsRead', { senderId });
//           const roomName = [senderId, receiverId].sort().join('-');
//           this.io.to(roomName).emit('messageReadStatusUpdated', { senderId });
//           this.io.to(senderId.toString()).emit('messagesReadBy', { receiverId });

//           // update chat list for receiver and sender so unread counts refresh
//           await this.chatListManager.fetchAndEmitChatList(null, receiverId);
//           await this.chatListManager.fetchAndEmitChatList(null, senderId);
//         } catch (error) {
//           console.error('Error marking messages as read:', error);
//         }
//       });

//       socket.on('markMessageAsRead', async ({ messageId }) => {
//         if (!messageId || !socket.data.userId) return;

//         try {
//           const message = await Chat.findByPk(messageId);
//           if (!message || message.receiverId !== socket.data.userId || message.readStatus === 1) {
//             return;
//           }

//           await message.update({ readStatus: 1 });

//           const roomName = [message.senderId, message.receiverId].sort().join('-');
//           this.io.to(roomName).emit('messageRead', { messageId });

//           this.io.to(message.senderId.toString()).emit('singleMessageRead', {
//             messageId,
//             receiverId: message.receiverId
//           });

//           // update chat lists for both sides
//           await this.chatListManager.fetchAndEmitChatList(null, socket.data.userId); // receiver
//           await this.chatListManager.fetchAndEmitChatList(null, message.senderId); // sender
//         } catch (error) {
//           console.error('Error marking message as read:', error);
//         }
//       });

//       socket.on('deleteMessage', async (data) => {
//         const { userId, messageId, type = 'me' } = data;

//         try {
//           const message = await Chat.findByPk(messageId);

//           if (!message) {
//             socket.emit('error', { message: 'Message not found' });
//             return;
//           }

//           if (type === 'everyone' && userId !== message.senderId) {
//             socket.emit('error', { message: 'Only sender can delete for everyone' });
//             return;
//           }

//           let deletedBy = JSON.parse(message.deletedBy || '[]');
//           const otherUser = type === 'everyone' ? (userId === message.senderId ? message.receiverId : message.senderId) : null;
//           deletedBy = [...new Set([...deletedBy, userId, otherUser].filter(Boolean))];

//           await message.update({ deletedBy: JSON.stringify(deletedBy) });

//           const roomName = [message.senderId, message.receiverId].sort().join('-');
//           this.io.to(roomName).emit('messageDeleted', { messageId, deletedBy });

//           socket.emit('messageDeletedLocally', { messageId, deletedBy });

//           await this.chatListManager.updateChatListAfterNewMessage(message.senderId, message.receiverId);
//         } catch (error) {
//           console.error('Error deleting message:', error);
//         }
//       });

//       socket.on('clearChat', async ({ userId, otherUserId }) => {
//         try {
//           const messages = await Chat.findAll({
//             where: {
//               [Op.or]: [
//                 { senderId: userId, receiverId: otherUserId },
//                 { senderId: otherUserId, receiverId: userId },
//               ]
//             }
//           });

//           let allMessagesCleared = true;

//           for (const message of messages) {
//             const deletedBy = JSON.parse(message.deletedBy || '[]');
//             const updatedDeletedBy = new Set(deletedBy);
//             updatedDeletedBy.add(userId);
//             if (deletedBy.includes(otherUserId)) {
//               updatedDeletedBy.add(otherUserId);
//             }

//             await message.update({ deletedBy: JSON.stringify([...updatedDeletedBy]) });

//             if (updatedDeletedBy.size !== 2) {
//               allMessagesCleared = false;
//             }
//           }

//           socket.emit('chatCleared', { userId, otherUserId, allMessagesCleared });

//           await this.chatListManager.fetchAndEmitChatList(null, userId);
//         } catch (error) {
//           console.error('Error clearing chat:', error);
//         }
//       });

//       socket.on('toggleBlockUser', async ({ userId, otherUserId }) => {
//         try {
//           const blockEntry = await Block.findOne({
//             where: {
//               myId: userId,
//               hisId: otherUserId,
//             },
//           });

//           if (blockEntry) {
//             await Block.destroy({
//               where: { myId: userId, hisId: otherUserId }
//             });

//             socket.emit('iUnblockedOther', { otherUserId });
//             this.io.to(otherUserId.toString()).emit('unblockedByOther');
//             console.log(`User ${userId} unblocked ${otherUserId}`);
//           } else {
//             await Block.create({ myId: userId, hisId: otherUserId });

//             socket.emit('iBlockedOther', { otherUserId });
//             this.io.to(otherUserId.toString()).emit('blockedByOther', { blockerId: userId });
//             console.log(`User ${userId} blocked ${otherUserId}`);
//           }
//         } catch (error) {
//           console.error('Error toggling block status:', error);
//         }
//       });

//       socket.on('typing', ({ senderId, receiverId }) => {
//         if (senderId !== socket.data.userId) return;
//         const roomName = [senderId, receiverId].sort().join('-');
//         this.io.to(roomName).emit('userTyping', { userId: senderId });
//       });

//       socket.on('stopTyping', ({ senderId, receiverId }) => {
//         if (senderId !== socket.data.userId) return;
//         const roomName = [senderId, receiverId].sort().join('-');
//         this.io.to(roomName).emit('userStopTyping', { userId: senderId });
//       });

//       socket.on('disconnect', async () => {
//         if (socket.data && socket.data.userId) {
//           const userId = socket.data.userId;
//           const sockets = this.userSockets.get(userId) || [];
//           const index = sockets.indexOf(socket);
//           if (index > -1) {
//             sockets.splice(index, 1);
//           }
//           if (sockets.length === 0) {
//             // set offline and set lastSeen to a concrete timestamp (ISO string)
//             const lastSeen = new Date().toISOString();
//             await User.update(
//               { isOnline: false, lastSeen },
//               { where: { id: userId } }
//             ).catch(err => console.error('Error updating offline status:', err));
//             // emit with lastSeen because now user is offline
//             this.io.emit('statusUpdate', { userId, isOnline: false, lastSeen });
//           }
//           this.userSockets.set(userId, sockets);
//         }
//         console.log('User disconnected:', socket.id);
//       });
//     });
//   }
// }

// module.exports = ChatController;

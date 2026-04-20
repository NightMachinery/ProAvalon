import { Command } from '../types';
import { rooms, sendReplyToCommand, updateCurrentGamesList } from '../../sockets';

export const rembot: Command = {
  command: 'rembot',
  help: '/rembot <name|all>: Host-only. Remove standalone SimpleBot seats before the game starts.',
  run: async (args, socket) => {
    const room = rooms[socket.request.user.inRoomId];
    if (!room) {
      sendReplyToCommand(socket, 'You are not in a room.');
      return;
    }

    if (room.host !== socket.request.user.username) {
      sendReplyToCommand(socket, 'Only the host can manage bots in this room.');
      return;
    }

    const result = room.removeStandaloneBots(args[1] || 'all', socket.request.user.username);
    if (result.success) {
      room.sendText(result.message, 'server-text-teal');
      room.distributeGameData();
      updateCurrentGamesList();
    } else {
      sendReplyToCommand(socket, result.message);
    }
  },
};

import { Command } from '../types';
import { rooms, sendReplyToCommand, updateCurrentGamesList } from '../../sockets';

export const restorehuman: Command = {
  command: 'restorehuman',
  help: '/restorehuman <player>: Host-only. Restore a reconnected player from bot control.',
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

    const result = room.restoreHumanSeat(args[1], socket.request.user.username);
    if (result.success) {
      room.sendText(result.message, 'server-text-teal');
      room.distributeGameData();
      updateCurrentGamesList();
    } else {
      sendReplyToCommand(socket, result.message);
    }
  },
};

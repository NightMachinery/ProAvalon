import { Command } from '../types';
import { rooms, sendReplyToCommand, updateCurrentGamesList } from '../../sockets';

export const switchseat: Command = {
  command: 'switchseat',
  help: '/switchseat <seat> <bot|original|username>: Host-only. Switch a running-game seat to SimpleBot, its original player, or a connected spectator.',
  run: async (args, socket) => {
    const room = rooms[socket.request.user.inRoomId];
    if (!room) {
      sendReplyToCommand(socket, 'You are not in a room.');
      return;
    }

    if (room.host !== socket.request.user.username) {
      sendReplyToCommand(socket, 'Only the host can manage seat controllers in this room.');
      return;
    }

    const targetSeat = args[1];
    const rawController = args[2];
    if (!targetSeat || !rawController) {
      sendReplyToCommand(
        socket,
        'Usage: /switchseat <seat> <bot|original|username>',
      );
      return;
    }

    const normalizedController = rawController.toLowerCase();
    const result = room.switchSeatController(targetSeat, {
      controllerType:
        normalizedController === 'bot'
          ? 'bot'
          : normalizedController === 'original'
            ? 'original'
            : 'spectator',
      controllerUsername:
        normalizedController === 'bot' || normalizedController === 'original'
          ? undefined
          : rawController,
      requestedByUsername: socket.request.user.username,
    });

    if (result.success) {
      room.sendText(result.message, 'server-text-teal');
      room.distributeGameData();
      updateCurrentGamesList();
    } else {
      sendReplyToCommand(socket, result.message);
    }
  },
};

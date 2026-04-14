import type GameWrapper from '../gameplay/gameEngine/gameWrapper';

export const DEFAULT_LISTED_EMPTY_ROOM_TTL_MINUTES = 10;
export const DEFAULT_UNLISTED_EMPTY_ROOM_TTL_MINUTES = 72 * 60;
export const MIN_EMPTY_ROOM_TTL_MINUTES = 1;
export const MAX_EMPTY_ROOM_TTL_MINUTES = 7 * 24 * 60;

export function getDefaultEmptyRoomTTLMinutes(listedInLobby: boolean): number {
  return listedInLobby
    ? DEFAULT_LISTED_EMPTY_ROOM_TTL_MINUTES
    : DEFAULT_UNLISTED_EMPTY_ROOM_TTL_MINUTES;
}

export function normalizeEmptyRoomTTLMinutes(
  value: unknown,
  listedInLobby: boolean,
): number {
  const defaultTTL = getDefaultEmptyRoomTTLMinutes(listedInLobby);
  const parsed = parseInt(String(value), 10);

  if (Number.isNaN(parsed)) {
    return defaultTTL;
  }

  return Math.min(
    MAX_EMPTY_ROOM_TTL_MINUTES,
    Math.max(MIN_EMPTY_ROOM_TTL_MINUTES, parsed),
  );
}

export function resolveRoomIdFromJoinRef(
  roomRef: unknown,
  rooms: GameWrapper[],
  publicRoomIdLookup: Map<string, number>,
): number | undefined {
  if (typeof roomRef === 'string' && publicRoomIdLookup.has(roomRef)) {
    return publicRoomIdLookup.get(roomRef);
  }

  let parsedRoomId: number;
  if (typeof roomRef === 'number') {
    parsedRoomId = roomRef;
  } else if (typeof roomRef === 'string' && /^\d+$/.test(roomRef)) {
    parsedRoomId = parseInt(roomRef, 10);
  } else {
    return undefined;
  }

  if (Number.isNaN(parsedRoomId)) {
    return undefined;
  }

  const room = rooms[parsedRoomId];
  if (!room || room.listedInLobby === false) {
    return undefined;
  }

  return parsedRoomId;
}

export function roomHasConnectedUsers(room: GameWrapper | undefined): boolean {
  return Boolean(room && room.allSockets && room.allSockets.length > 0);
}

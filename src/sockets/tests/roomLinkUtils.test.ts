import {
  DEFAULT_LISTED_EMPTY_ROOM_TTL_MINUTES,
  DEFAULT_UNLISTED_EMPTY_ROOM_TTL_MINUTES,
  MAX_EMPTY_ROOM_TTL_MINUTES,
  normalizeEmptyRoomTTLMinutes,
  resolveRoomIdFromJoinRef,
} from '../roomLinkUtils';

describe('roomLinkUtils', () => {
  it('should default TTL by lobby visibility when input is invalid', () => {
    expect(normalizeEmptyRoomTTLMinutes(undefined, true)).toEqual(
      DEFAULT_LISTED_EMPTY_ROOM_TTL_MINUTES,
    );
    expect(normalizeEmptyRoomTTLMinutes(undefined, false)).toEqual(
      DEFAULT_UNLISTED_EMPTY_ROOM_TTL_MINUTES,
    );
  });

  it('should clamp TTL to the supported range', () => {
    expect(normalizeEmptyRoomTTLMinutes(0, true)).toEqual(1);
    expect(
      normalizeEmptyRoomTTLMinutes(MAX_EMPTY_ROOM_TTL_MINUTES + 1, true),
    ).toEqual(MAX_EMPTY_ROOM_TTL_MINUTES);
  });

  it('should resolve opaque room ids via lookup', () => {
    const lookup = new Map<string, number>([['opaque-room', 4]]);

    expect(
      resolveRoomIdFromJoinRef('opaque-room', [] as any, lookup),
    ).toEqual(4);
  });

  it('should only allow legacy numeric room ids for lobby-listed rooms', () => {
    const rooms = [] as any;
    rooms[2] = { listedInLobby: true };
    rooms[3] = { listedInLobby: false };

    expect(resolveRoomIdFromJoinRef(2, rooms, new Map())).toEqual(2);
    expect(resolveRoomIdFromJoinRef('2', rooms, new Map())).toEqual(2);
    expect(resolveRoomIdFromJoinRef(3, rooms, new Map())).toEqual(undefined);
  });
});

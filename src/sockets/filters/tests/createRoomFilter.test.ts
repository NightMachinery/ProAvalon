import { CreateRoomFilter } from '../createRoomFilter';

describe('CreateRoomFilter', () => {
  it('should block a host who already has an active waiting room', () => {
    const filter = new CreateRoomFilter();

    expect(
      filter.createRoomRequest('host', [
        {
          host: 'host',
          allSockets: [{}],
          getStatus: () => 'Waiting',
        } as any,
      ]),
    ).toEqual(false);
  });

  it('should ignore empty waiting rooms in the recovery grace window', () => {
    const filter = new CreateRoomFilter();

    expect(
      filter.createRoomRequest('host', [
        {
          host: 'host',
          allSockets: [],
          getStatus: () => 'Waiting',
        } as any,
      ]),
    ).toEqual(true);
  });
});

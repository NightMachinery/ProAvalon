import { Alliance, See } from '../../types';
import { IRole, Role } from '../types';
import Game from '../../game';

class Spy implements IRole {
  room: Game;

  static role = Role.Spy;
  role = Role.Spy;

  alliance = Alliance.Spy;

  description = 'A standard Spy member.';

  orderPriorityInOptions: number;
  specialPhase: string;

  constructor(thisRoom: any) {
    this.room = thisRoom;
  }

  // Spy sees all spies except oberon
  see(): See {
    return this.room.getVisibleSpySeeData();
  }

  checkSpecialMove() {}

  getPublicGameData(): any {}
}

export default Spy;

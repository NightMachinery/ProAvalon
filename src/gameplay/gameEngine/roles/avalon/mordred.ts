import { Alliance, See } from '../../types';
import { IRole, Role } from '../types';
import Game from '../../game';

class Mordred implements IRole {
  room: Game;

  static role = Role.Mordred;
  role = Role.Mordred;

  alliance = Alliance.Spy;

  description = 'A spy who is invisible to Merlin.';
  orderPriorityInOptions = 60;
  specialPhase: string;

  constructor(thisRoom: any) {
    this.room = thisRoom;
  }

  // Morded sees all spies except oberon
  see(): See {
    return this.room.getVisibleSpySeeData();
  }

  checkSpecialMove() {}

  getPublicGameData(): any {}
}

export default Mordred;

import { Alliance, See } from '../../types';
import { IRole, Role } from '../types';
import Game from '../../game';

class Morgana implements IRole {
  room: Game;

  static role = Role.Morgana;
  role = Role.Morgana;
  alliance = Alliance.Spy;

  description = 'A spy who looks like Merlin to Percival.';
  orderPriorityInOptions = 70;

  specialPhase: string;

  constructor(thisRoom: any) {
    this.room = thisRoom;
  }

  // Morgana sees all spies except oberon
  see(): See {
    return this.room.getVisibleSpySeeData();
  }

  checkSpecialMove() {}

  getPublicGameData(): any {}
}

export default Morgana;

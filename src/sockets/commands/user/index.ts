import { Commands } from '../types';
import { help } from './help';
import { roll } from './roll';
import { navbar } from './navbar';
import { pausetimer } from './pausetimer';
import { unpausetimer } from './unpausetimer';
import { voidgame } from './voidgame';
import { addblacklist } from './addblacklist';
import { removeblacklist } from './removeblacklist';
import { getblacklist } from './getblacklist';
import { allchat } from './allchat';
import { mute } from './mute';
import { muted } from './muted';
import { unmute } from './unmute';
import { mods } from './mods';
import { pmmod } from './pmmod';
import { r } from './r';
import { addbot } from './addbot';
import { rembot } from './rembot';
import { takebot } from './takebot';
import { restorehuman } from './restorehuman';

export const userCommandsImported: Commands = {
  [help.command]: help,
  [mods.command]: mods,
  [pmmod.command]: pmmod,
  [r.command]: r,
  [allchat.command]: allchat,
  [navbar.command]: navbar,
  [roll.command]: roll,
  [unpausetimer.command]: unpausetimer,
  [pausetimer.command]: pausetimer,
  [voidgame.command]: voidgame,
  [addblacklist.command]: addblacklist,
  [removeblacklist.command]: removeblacklist,
  [getblacklist.command]: getblacklist,
  [mute.command]: mute,
  [unmute.command]: unmute,
  [muted.command]: muted,
  [addbot.command]: addbot,
  [rembot.command]: rembot,
  [takebot.command]: takebot,
  [restorehuman.command]: restorehuman,
};

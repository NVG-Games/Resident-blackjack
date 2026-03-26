// Map trump type → imported PNG asset
import oneUp from '../assets/trumps/one-up.png';
import twoUp from '../assets/trumps/two-up.png';
import twoUpPlus from '../assets/trumps/two-up-plus.png';
import card2 from '../assets/trumps/2-card.png';
import card3 from '../assets/trumps/3-card.png';
import card4 from '../assets/trumps/4-card.png';
import card5 from '../assets/trumps/5-card.png';
import card6 from '../assets/trumps/6-card.png';
import card7 from '../assets/trumps/7-card.png';
import remove from '../assets/trumps/remove.png';
import returnImg from '../assets/trumps/return.png';
import exchange from '../assets/trumps/exchange.png';
import trumpSwitch from '../assets/trumps/trump-switch.png';
import shieldPlus from '../assets/trumps/shield-plus.png';
import destroy from '../assets/trumps/destroy.png';
import destroyPlus from '../assets/trumps/destroy-plus.png';
import destroyPlusPlus from '../assets/trumps/destroy-plus-plus.png';
import perfectDraw from '../assets/trumps/perfect-draw.png';
import perfectDrawPlus from '../assets/trumps/perfect-draw-plus.png';
import goFor17 from '../assets/trumps/go-for-17.png';
import goFor24 from '../assets/trumps/go-for-24.png';
import goFor27 from '../assets/trumps/go-for-27.png';
import harvest from '../assets/trumps/harvest.png';
import shieldAssault from '../assets/trumps/shield-assault.png';
import happiness from '../assets/trumps/happiness.png';
import mindShift from '../assets/trumps/mind-shift.png';
import conjure from '../assets/trumps/conjure.png';
import escape from '../assets/trumps/escape.png';
import twentyOneUp from '../assets/trumps/twenty-one-up.png';
import oblivion from '../assets/trumps/oblivion.png';
import deadSilence from '../assets/trumps/dead-silence.png';
import desperation from '../assets/trumps/desperation.png';
import loveYourEnemy from '../assets/trumps/love-your-enemy.png';

import { TRUMP_TYPES } from './constants.js';

export const TRUMP_IMAGES = {
  [TRUMP_TYPES.ONE_UP]: oneUp,
  [TRUMP_TYPES.TWO_UP]: twoUp,
  [TRUMP_TYPES.TWO_UP_PLUS]: twoUpPlus,
  [TRUMP_TYPES.CARD_2]: card2,
  [TRUMP_TYPES.CARD_3]: card3,
  [TRUMP_TYPES.CARD_4]: card4,
  [TRUMP_TYPES.CARD_5]: card5,
  [TRUMP_TYPES.CARD_6]: card6,
  [TRUMP_TYPES.CARD_7]: card7,
  [TRUMP_TYPES.REMOVE]: remove,
  [TRUMP_TYPES.RETURN]: returnImg,
  [TRUMP_TYPES.EXCHANGE]: exchange,
  [TRUMP_TYPES.TRUMP_SWITCH]: trumpSwitch,
  [TRUMP_TYPES.SHIELD]: shieldPlus,       // use shield+ image (closest we have)
  [TRUMP_TYPES.SHIELD_PLUS]: shieldPlus,
  [TRUMP_TYPES.DESTROY]: destroy,
  [TRUMP_TYPES.DESTROY_PLUS]: destroyPlus,
  [TRUMP_TYPES.DESTROY_PLUS_PLUS]: destroyPlusPlus,
  [TRUMP_TYPES.PERFECT_DRAW]: perfectDraw,
  [TRUMP_TYPES.PERFECT_DRAW_PLUS]: perfectDrawPlus,
  [TRUMP_TYPES.ULTIMATE_DRAW]: perfectDrawPlus,   // fallback
  [TRUMP_TYPES.TRUMP_SWITCH_PLUS]: trumpSwitch,   // fallback
  [TRUMP_TYPES.GO_FOR_17]: goFor17,
  [TRUMP_TYPES.GO_FOR_24]: goFor24,
  [TRUMP_TYPES.GO_FOR_27]: goFor27,
  [TRUMP_TYPES.HARVEST]: harvest,
  [TRUMP_TYPES.SHIELD_ASSAULT]: shieldAssault,
  [TRUMP_TYPES.SHIELD_ASSAULT_PLUS]: shieldAssault,
  [TRUMP_TYPES.HAPPINESS]: happiness,
  [TRUMP_TYPES.MIND_SHIFT]: mindShift,
  [TRUMP_TYPES.MIND_SHIFT_PLUS]: mindShift,       // fallback
  [TRUMP_TYPES.CONJURE]: conjure,
  [TRUMP_TYPES.ESCAPE]: escape,
  [TRUMP_TYPES.TWENTY_ONE_UP]: twentyOneUp,
  [TRUMP_TYPES.OBLIVION]: oblivion,
  [TRUMP_TYPES.DEAD_SILENCE]: deadSilence,
  [TRUMP_TYPES.DESPERATION]: desperation,
  [TRUMP_TYPES.LOVE_YOUR_ENEMY]: loveYourEnemy,
  [TRUMP_TYPES.DESIRE]: happiness,        // fallback
  [TRUMP_TYPES.DESIRE_PLUS]: happiness,   // fallback
  [TRUMP_TYPES.CURSE]: desperation,       // fallback
  [TRUMP_TYPES.BLACK_MAGIC]: conjure,     // fallback
};

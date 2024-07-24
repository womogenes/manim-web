import { Color } from './util/color';
import { Vector3 } from './util/vector';
import { TipSide } from './mobject/geometry';

export const PI = Math.PI;
export const TAU = 2 * PI;

export const RADIANS = 1.0;
export const DEGREES = TAU / 360;

export const DEFAULT_PIXEL_WIDTH = 1280;
export const DEFAULT_PIXEL_HEIGHT = 720;
export const DEFAULT_FRAME_RATE = 25.0;

export const FRAME_HEIGHT = 8.0;
export const FRAME_WIDTH =
  (FRAME_HEIGHT * DEFAULT_PIXEL_WIDTH) / DEFAULT_PIXEL_HEIGHT;
export const FRAME_X_RADIUS = FRAME_WIDTH / 2;
export const FRAME_Y_RADIUS = FRAME_HEIGHT / 2;

export const SMALL_BUFFER = 0.1;
export const MED_SMALL_BUFFER = 0.25;
export const MED_LARGE_BUFFER = 0.5;
export const LARGE_BUFFER = 1.0;

export const ORIGIN = new Vector3(0, 0, 0);
export const LEFT = new Vector3(-1, 0, 0);
export const RIGHT = new Vector3(1, 0, 0);
export const UP = new Vector3(0, 1, 0);
export const DOWN = new Vector3(0, -1, 0);
export const OUT = new Vector3(0, 0, 1);
export const IN = new Vector3(0, 0, -1);

export const UL = new Vector3(-1, 1, 0);
export const UR = new Vector3(1, 1, 0);
export const DL = new Vector3(-1, -1, 0);
export const DR = new Vector3(1, -1, 0);

// Colors
export const WHITE = new Color(1, 1, 1, 1);
export const BLACK = new Color(0, 0, 0, 1);
export const TRANSPARENT = new Color(0, 0, 0, 0);

export const DARK_BLUE = new Color(0.13725, 0.41961, 0.55686); // #236B8E
export const DARK_BROWN = new Color(0.5451, 0.27059, 0.07451); // #8B4513
export const LIGHT_BROWN = new Color(0.80392, 0.52157, 0.24706); // #CD853F
export const BLUE_E = new Color(0.1098, 0.45882, 0.54118); // #1C758A
export const BLUE_D = new Color(0.16078, 0.67059, 0.79216); // #29ABCA
export const BLUE_C = new Color(0.3451, 0.76863, 0.86667); // #58C4DD
export const BLUE_B = new Color(0.61176, 0.86275, 0.92157); // #9CDCEB
export const BLUE_A = new Color(0.78039, 0.91373, 0.9451); // #C7E9F1
export const TEAL_E = new Color(0.28627, 0.65882, 0.56078); // #49A88F
export const TEAL_D = new Color(0.33333, 0.75686, 0.6549); // #55C1A7
export const TEAL_C = new Color(0.36078, 0.81569, 0.70196); // #5CD0B3
export const TEAL_B = new Color(0.46275, 0.86667, 0.75294); // #76DDC0
export const TEAL_A = new Color(0.67451, 0.91765, 0.84314); // #ACEAD7
export const GREEN_E = new Color(0.41176, 0.61176, 0.32157); // #699C52
export const GREEN_D = new Color(0.46667, 0.6902, 0.36471); // #77B05D
export const GREEN_C = new Color(0.51373, 0.75686, 0.40392); // #83C167
export const GREEN_B = new Color(0.65098, 0.81176, 0.54902); // #A6CF8C
export const GREEN_A = new Color(0.78824, 0.88627, 0.68235); // #C9E2AE
export const YELLOW_E = new Color(0.9098, 0.75686, 0.1098); // #E8C11C
export const YELLOW_D = new Color(0.95686, 0.82745, 0.27059); // #F4D345
export const YELLOW_C = new Color(1.0, 1.0, 0.0); // #FFFF00
export const YELLOW_B = new Color(1.0, 0.91765, 0.58039); // #FFEA94
export const YELLOW_A = new Color(1.0, 0.9451, 0.71373); // #FFF1B6
export const GOLD_E = new Color(0.78039, 0.55294, 0.27451); // #C78D46
export const GOLD_D = new Color(0.88235, 0.63137, 0.3451); // #E1A158
export const GOLD_C = new Color(0.94118, 0.67451, 0.37255); // #F0AC5F
export const GOLD_B = new Color(0.97647, 0.71765, 0.45882); // #F9B775
export const GOLD_A = new Color(0.96863, 0.78039, 0.59216); // #F7C797
export const RED_E = new Color(0.81176, 0.31373, 0.26667); // #CF5044
export const RED_D = new Color(0.90196, 0.35294, 0.29804); // #E65A4C
export const RED_C = new Color(0.98824, 0.38431, 0.33333); // #FC6255
export const RED_B = new Color(1.0, 0.50196, 0.50196); // #FF8080
export const RED_A = new Color(0.96863, 0.63137, 0.63922); // #F7A1A3
export const MAROON_E = new Color(0.58039, 0.25882, 0.3098); // #94424F
export const MAROON_D = new Color(0.63529, 0.30196, 0.38039); // #A24D61
export const MAROON_C = new Color(0.77255, 0.37255, 0.45098); // #C55F73
export const MAROON_B = new Color(0.92549, 0.57255, 0.67059); // #EC92AB
export const MAROON_A = new Color(0.92549, 0.67059, 0.75686); // #ECABC1
export const PURPLE_E = new Color(0.39216, 0.2549, 0.44706); // #644172
export const PURPLE_D = new Color(0.44314, 0.33333, 0.5098); // #715582
export const PURPLE_C = new Color(0.60392, 0.44706, 0.67451); // #9A72AC
export const PURPLE_B = new Color(0.69412, 0.53725, 0.77647); // #B189C6
export const PURPLE_A = new Color(0.79216, 0.63922, 0.9098); // #CAA3E8

export const BLUE = BLUE_C;
export const TEAL = TEAL_C;
export const GREEN = GREEN_C;
export const YELLOW = YELLOW_C;
export const GOLD = GOLD_C;
export const RED = RED_C;
export const MAROON = MAROON_C;
export const PURPLE = PURPLE_C;

export const LIGHT_GRAY = new Color(0.73333, 0.73333, 0.73333); // #BBBBBB
export const LIGHT_GREY = new Color(0.73333, 0.73333, 0.73333); // #BBBBBB
export const GRAY = new Color(0.53333, 0.53333, 0.53333); // #888888
export const GREY = new Color(0.53333, 0.53333, 0.53333); // #888888
export const DARK_GREY = new Color(0.26667, 0.26667, 0.26667); // #444444
export const DARK_GRAY = new Color(0.26667, 0.26667, 0.26667); // #444444
export const DARKER_GREY = new Color(0.13333, 0.13333, 0.13333); // #222222
export const DARKER_GRAY = new Color(0.13333, 0.13333, 0.13333); // #222222

export const GREY_BROWN = new Color(0.45098, 0.38824, 0.34118); // #736357
export const PINK = new Color(0.81961, 0.27843, 0.74118); // #D147BD
export const LIGHT_PINK = new Color(0.86275, 0.45882, 0.80392); // #DC75CD
export const GREEN_SCREEN = new Color(0.0, 1.0, 0.0); // #00FF00
export const ORANGE = new Color(1.0, 0.52549, 0.18431); // #FF862F

// Defaults
export const DEFAULT_MOBJECT_TO_EDGE_BUFFER = MED_LARGE_BUFFER;
export const DEFAULT_MOBJECT_TO_MOBJECT_BUFFER = MED_LARGE_BUFFER;

export const DEFAULT_STROKE_WIDTH = 4.0;

export const DEFAULT_DOT_RADIUS = 0.08;
export const DEFAULT_SMALL_DOT_RADIUS = 0.04;
export const DEFAULT_DASH_LENGTH = 0.05;
export const DEFAULT_ARROW_TIP_LENGTH = 0.35;

export const DEFAULT_ANIMATION_RUN_TIME = 1.0;
export const DEFAULT_ANIMATION_LAG_RATIO = 0.0;
export const DEFAULT_ANIMATION_LAGGED_START_LAG_RATIO = 0.05;

// Helpers
export const TIP_AT_START = TipSide.Start;
export const TIP_AT_END = TipSide.End;

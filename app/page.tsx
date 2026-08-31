"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Category = "chassis" | "body" | "move" | "cab" | "tool" | "help" | "decor";
type PartDef = {
  id: string;
  name: string;
  icon: string;
  category: Category;
  tags: string[];
  w: number;
  h: number;
};
type PartColorMode = "auto" | "primary" | "secondary" | "wheels" | "custom" | "original";
type Part = PartDef & {
  uid: string;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  flip: boolean;
  z: number;
  originalColor?: boolean;
  // Kept only so vehicles saved by the previous version still open correctly.
  colorMode?: PartColorMode;
  color?: string;
};
type Mission = {
  id: string;
  theme: string;
  place: string;
  title: string;
  story: string;
  character: string;
  icon: string;
  needs: string[];
  hint: string;
  reward: string;
  objective: string;
  steps: readonly [string, string, string];
  success: string;
  targetBefore: string;
  targetAfter: string;
  voiceHint: string;
  voiceKey: string;
};
type SaveData = {
  stars: number;
  completed: string[];
  recent: string[];
  unlocked: number;
  garage: { id: string; name: string; date: string; parts: Part[]; paint: Paint }[];
  tutorialSeen: boolean;
};
type Paint = {
  primary: string;
  secondary: string;
  wheels: string;
  pattern: string;
  sticker: string;
  stickerX?: number;
  stickerY?: number;
  finish: string;
};

const THEMES = [
  { name: "建筑工地", icon: "🏗️", color: "#ffb936" },
  { name: "农场田野", icon: "🌾", color: "#8bcf50" },
  { name: "城市维护", icon: "🏙️", color: "#56b6e9" },
  { name: "山地救援", icon: "⛰️", color: "#9b7a62" },
  { name: "消防防灾", icon: "🚒", color: "#ff6b5b" },
  { name: "港口物流", icon: "⚓", color: "#3dbdc0" },
  { name: "矿山探索", icon: "💎", color: "#8a75d1" },
  { name: "海滩水边", icon: "🏖️", color: "#38bcd6" },
  { name: "冰雪地区", icon: "❄️", color: "#91d9ef" },
  { name: "奇想任务", icon: "🌈", color: "#ec71b7" },
];

const PARTS: PartDef[] = [
  { id: "frame", name: "短轴基础底盘", icon: "▬", category: "chassis", tags: ["chassis"], w: 220, h: 70 },
  { id: "longframe", name: "三轴加长底盘", icon: "▬", category: "chassis", tags: ["chassis", "carry"], w: 270, h: 70 },
  { id: "heavyframe", name: "四轴重载底盘", icon: "▬", category: "chassis", tags: ["chassis", "carry", "rough"], w: 300, h: 76 },
  { id: "compactchassis", name: "叉车紧凑底盘", icon: "▬", category: "chassis", tags: ["chassis"], w: 190, h: 70 },
  { id: "excavatorchassis", name: "挖机旋转底盘", icon: "▬", category: "chassis", tags: ["chassis", "rough"], w: 230, h: 75 },
  { id: "bulldozerchassis", name: "推土强化底盘", icon: "▬", category: "chassis", tags: ["chassis", "rough"], w: 250, h: 75 },
  { id: "cranechassis", name: "起重支腿底盘", icon: "▬", category: "chassis", tags: ["chassis", "lift"], w: 270, h: 78 },
  { id: "dumpchassis", name: "翻斗承载底盘", icon: "▬", category: "chassis", tags: ["chassis", "carry"], w: 270, h: 74 },
  { id: "firechassis", name: "消防红色底盘", icon: "▬", category: "chassis", tags: ["chassis"], w: 250, h: 74 },
  { id: "farmchassis", name: "农场绿色底盘", icon: "▬", category: "chassis", tags: ["chassis", "rough"], w: 245, h: 74 },
  { id: "snowchassis", name: "雪地蓝色底盘", icon: "▬", category: "chassis", tags: ["chassis", "snow"], w: 250, h: 74 },
  { id: "miningchassis", name: "矿山防护底盘", icon: "▬", category: "chassis", tags: ["chassis", "rough"], w: 265, h: 76 },
  { id: "amphichassis", name: "水陆密封底盘", icon: "▬", category: "chassis", tags: ["chassis", "water"], w: 255, h: 76 },
  { id: "citychassis", name: "城市维护底盘", icon: "▬", category: "chassis", tags: ["chassis", "clean"], w: 245, h: 72 },
  { id: "rescuechassis", name: "白色救援底盘", icon: "▬", category: "chassis", tags: ["chassis", "rescue"], w: 255, h: 74 },
  { id: "fantasychassis", name: "紫色能量底盘", icon: "▬", category: "chassis", tags: ["chassis"], w: 255, h: 74 },
  { id: "hoverframe", name: "气垫船承载骨架", icon: "▬", category: "chassis", tags: ["chassis", "water", "hover"], w: 270, h: 78 },
  { id: "airframe", name: "工程飞机机身骨架", icon: "▬", category: "chassis", tags: ["chassis", "air"], w: 285, h: 80 },
  { id: "gliderframe", name: "滑翔伞轻型骨架", icon: "▬", category: "chassis", tags: ["chassis", "air"], w: 250, h: 78 },
  { id: "pontoonframe", name: "水陆浮筒底盘", icon: "▬", category: "chassis", tags: ["chassis", "water"], w: 275, h: 80 },
  { id: "utilitybody", name: "实体工具车身", icon: "▰", category: "body", tags: ["body"], w: 180, h: 100 },
  { id: "cargo", name: "加长货运车身", icon: "▰", category: "body", tags: ["body", "carry"], w: 210, h: 105 },
  { id: "miningdumpbody", name: "黑色重载车厢", icon: "▰", category: "body", tags: ["body", "carry", "rough"], w: 210, h: 110 },
  { id: "forkliftbody", name: "叉车配重车身", icon: "▰", category: "body", tags: ["body", "carry"], w: 170, h: 110 },
  { id: "excavatorbase", name: "挖机实体机身", icon: "▰", category: "body", tags: ["body", "rough"], w: 190, h: 110 },
  { id: "bulldozerbody", name: "推土动力车身", icon: "▰", category: "body", tags: ["body", "push"], w: 190, h: 110 },
  { id: "cranebody", name: "起重动力车身", icon: "▰", category: "body", tags: ["body"], w: 195, h: 110 },
  { id: "bucketbody", name: "实体翻斗车厢", icon: "▰", category: "body", tags: ["body", "carry"], w: 205, h: 110 },
  { id: "firebody", name: "消防装备车身", icon: "▰", category: "body", tags: ["body", "fire", "water"], w: 195, h: 112 },
  { id: "tractorbody", name: "农场动力车身", icon: "▰", category: "body", tags: ["body", "farm"], w: 190, h: 108 },
  { id: "snowbody", name: "扫雪动力车身", icon: "▰", category: "body", tags: ["body", "snow"], w: 195, h: 110 },
  { id: "miningbody", name: "矿山防护车身", icon: "▰", category: "body", tags: ["body", "rough"], w: 195, h: 110 },
  { id: "tank", name: "密封水箱车身", icon: "▰", category: "body", tags: ["body", "water"], w: 195, h: 108 },
  { id: "citybody", name: "城市维护车身", icon: "▰", category: "body", tags: ["body", "clean"], w: 190, h: 108 },
  { id: "rescuebody", name: "白色救援车身", icon: "▰", category: "body", tags: ["body", "rescue"], w: 195, h: 110 },
  { id: "fantasybody", name: "紫色奇想车身", icon: "▰", category: "body", tags: ["body"], w: 195, h: 110 },
  { id: "hoverbody", name: "气垫船工程舱", icon: "▰", category: "body", tags: ["body", "water", "hover"], w: 215, h: 110 },
  { id: "airbody", name: "工程飞机机身", icon: "▰", category: "body", tags: ["body", "air", "carry"], w: 225, h: 105 },
  { id: "gliderpod", name: "滑翔伞设备舱", icon: "▰", category: "body", tags: ["body", "air", "rescue"], w: 190, h: 105 },
  { id: "seaplanebody", name: "水上救援机身", icon: "▰", category: "body", tags: ["body", "air", "water", "rescue"], w: 225, h: 108 },
  { id: "wheel", name: "黄心越野轮", icon: "●", category: "move", tags: ["move"], w: 78, h: 78 },
  { id: "orangewheel", name: "橙心工程轮", icon: "●", category: "move", tags: ["move"], w: 78, h: 78 },
  { id: "bluewheel", name: "蓝心救援轮", icon: "●", category: "move", tags: ["move"], w: 78, h: 78 },
  { id: "redwheel", name: "红心消防轮", icon: "●", category: "move", tags: ["move"], w: 78, h: 78 },
  { id: "smallwheel", name: "黄色小轮", icon: "●", category: "move", tags: ["move"], w: 58, h: 58 },
  { id: "farmwheel", name: "绿色农场轮", icon: "●", category: "move", tags: ["move", "rough"], w: 64, h: 64 },
  { id: "citywheel", name: "蓝色城市轮", icon: "●", category: "move", tags: ["move"], w: 60, h: 60 },
  { id: "fantasywheel", name: "紫色星星轮", icon: "●", category: "move", tags: ["move"], w: 68, h: 68 },
  { id: "track", name: "黄色工程履带", icon: "⬭", category: "move", tags: ["move", "rough"], w: 180, h: 66 },
  { id: "miningtrack", name: "黑色矿山履带", icon: "⬭", category: "move", tags: ["move", "rough"], w: 180, h: 66 },
  { id: "snowtrack", name: "蓝色雪地履带", icon: "⬭", category: "move", tags: ["move", "snow"], w: 180, h: 66 },
  { id: "greentrack", name: "绿色越野履带", icon: "⬭", category: "move", tags: ["move", "rough"], w: 180, h: 66 },
  { id: "rollerwheel", name: "宽幅压路滚筒", icon: "●", category: "move", tags: ["move", "roll"], w: 110, h: 110 },
  { id: "paddlewheel", name: "水陆桨轮", icon: "●", category: "move", tags: ["move", "water"], w: 100, h: 100 },
  { id: "ski", name: "雪地滑橇", icon: "⌣", category: "move", tags: ["move", "snow"], w: 150, h: 60 },
  { id: "hover", name: "紫色悬浮垫", icon: "◉", category: "move", tags: ["move"], w: 140, h: 70 },
  { id: "hovercraftskirt", name: "气垫船气囊", icon: "▱", category: "move", tags: ["move", "water", "hover"], w: 190, h: 74 },
  { id: "wing", name: "工程飞机机翼", icon: "✈", category: "move", tags: ["move", "air"], w: 210, h: 78 },
  { id: "paraglider", name: "救援滑翔伞翼", icon: "🪂", category: "move", tags: ["move", "air"], w: 230, h: 150 },
  { id: "propeller", name: "航空螺旋桨", icon: "✣", category: "move", tags: ["move", "air", "power"], w: 112, h: 112 },
  { id: "cab", name: "驾驶室", icon: "▣", category: "cab", tags: ["cab"], w: 116, h: 112 },
  { id: "bubblecab", name: "泡泡驾驶舱", icon: "◒", category: "cab", tags: ["cab"], w: 126, h: 104 },
  { id: "lampcab", name: "探险驾驶室", icon: "▥", category: "cab", tags: ["cab", "light"], w: 122, h: 116 },
  { id: "engine", name: "轰隆动力机", icon: "⚙", category: "help", tags: ["power"], w: 125, h: 105 },
  { id: "battery", name: "闪电电池箱", icon: "⚡", category: "help", tags: ["power"], w: 122, h: 102 },
  { id: "suspension", name: "弹簧减震器", icon: "〽", category: "help", tags: ["rough"], w: 118, h: 92 },
  { id: "firecab", name: "红色消防车头", icon: "▣", category: "cab", tags: ["cab", "fire"], w: 126, h: 122 },
  { id: "farmcab", name: "绿色农场车头", icon: "▣", category: "cab", tags: ["cab", "farm"], w: 122, h: 120 },
  { id: "rescuecab", name: "白色救援车头", icon: "▣", category: "cab", tags: ["cab", "rescue"], w: 124, h: 120 },
  { id: "bulldozercab", name: "推土机车头", icon: "▣", category: "cab", tags: ["cab"], w: 122, h: 116 },
  { id: "cranecab", name: "高视野吊车头", icon: "▣", category: "cab", tags: ["cab", "lift"], w: 122, h: 122 },
  { id: "miningcab", name: "防护矿山车头", icon: "▣", category: "cab", tags: ["cab", "rough"], w: 128, h: 122 },
  { id: "forkcab", name: "紧凑叉车车头", icon: "▣", category: "cab", tags: ["cab", "carry"], w: 118, h: 118 },
  { id: "amphicab", name: "泡泡水陆车头", icon: "◒", category: "cab", tags: ["cab", "water"], w: 126, h: 118 },
  { id: "citycab", name: "红色城市车头", icon: "▣", category: "cab", tags: ["cab", "clean"], w: 124, h: 120 },
  { id: "farmcab2", name: "圆窗农场车头", icon: "▣", category: "cab", tags: ["cab", "farm"], w: 124, h: 120 },
  { id: "amphicab2", name: "蓝色水陆车头", icon: "◒", category: "cab", tags: ["cab", "water"], w: 126, h: 118 },
  { id: "snowcab", name: "暖暖雪地车头", icon: "▣", category: "cab", tags: ["cab", "snow"], w: 122, h: 120 },
  { id: "fantasycab", name: "紫色魔法车头", icon: "▣", category: "cab", tags: ["cab"], w: 124, h: 120 },
  { id: "hovercab", name: "气垫船驾驶舱", icon: "▣", category: "cab", tags: ["cab", "water", "hover"], w: 135, h: 120 },
  { id: "pilotcab", name: "飞机透明座舱", icon: "▣", category: "cab", tags: ["cab", "air"], w: 140, h: 116 },
  { id: "gliderseat", name: "滑翔伞安全座椅", icon: "▣", category: "cab", tags: ["cab", "air", "rescue"], w: 126, h: 126 },
  { id: "bubblecockpit", name: "救援观察舱", icon: "▣", category: "cab", tags: ["cab", "air", "rescue"], w: 138, h: 126 },
  { id: "shovel", name: "挖掘斗", icon: "⤵", category: "tool", tags: ["dig", "clear"], w: 130, h: 86 },
  { id: "blade", name: "推土铲", icon: "◢", category: "tool", tags: ["push", "clear", "snow"], w: 145, h: 76 },
  { id: "crane", name: "起重吊臂", icon: "⌝", category: "tool", tags: ["lift"], w: 150, h: 180 },
  { id: "fork", name: "叉车臂", icon: "乚", category: "tool", tags: ["lift", "carry"], w: 120, h: 108 },
  { id: "drill", name: "钻头", icon: "◆", category: "tool", tags: ["drill", "dig"], w: 125, h: 72 },
  { id: "augerdrill", name: "长螺旋钻机", icon: "⟿", category: "tool", tags: ["drill", "dig"], w: 196, h: 78 },
  { id: "roller", name: "压路滚筒", icon: "⬤", category: "tool", tags: ["roll"], w: 110, h: 110 },
  { id: "plow", name: "农田犁", icon: "≋", category: "tool", tags: ["farm", "dig"], w: 142, h: 76 },
  { id: "hose", name: "喷水炮", icon: "➹", category: "tool", tags: ["water", "fire"], w: 140, h: 76 },
  { id: "tow", name: "救援拖钩", icon: "⛓", category: "tool", tags: ["tow", "rescue"], w: 125, h: 64 },
  { id: "brush", name: "清扫刷", icon: "✺", category: "tool", tags: ["clean"], w: 112, h: 112 },
  { id: "snowblade", name: "弧形扫雪铲", icon: "❄", category: "tool", tags: ["snow", "push"], w: 148, h: 91 },
  { id: "grabber", name: "液压抓木爪", icon: "♆", category: "tool", tags: ["lift", "clear"], w: 128, h: 128 },
  { id: "mixer", name: "水泥搅拌筒", icon: "◒", category: "tool", tags: ["mix"], w: 148, h: 118 },
  { id: "hammer", name: "破碎锤", icon: "⇣", category: "tool", tags: ["drill", "clear"], w: 104, h: 142 },
  { id: "wreckingball", name: "工程大摆锤", icon: "●", category: "tool", tags: ["smash", "clear"], w: 190, h: 130 },
  { id: "liftplatform", name: "高空作业篮", icon: "♜", category: "tool", tags: ["lift", "rescue"], w: 148, h: 158 },
  { id: "conveyor", name: "装卸传送臂", icon: "↗", category: "tool", tags: ["carry", "lift"], w: 160, h: 110 },
  { id: "lamp", name: "亮亮探照灯", icon: "🔦", category: "help", tags: ["light", "rescue"], w: 86, h: 70 },
  { id: "siren", name: "安全警示灯", icon: "🚨", category: "help", tags: ["rescue", "fire"], w: 74, h: 62 },
  { id: "bridge", name: "折叠小桥", icon: "〰", category: "help", tags: ["bridge", "carry"], w: 176, h: 62 },
  { id: "rescuebox", name: "蓝色救援物资箱", icon: "✚", category: "help", tags: ["rescue", "carry"], w: 110, h: 90 },
  { id: "toolbox", name: "红色随车工具箱", icon: "▰", category: "help", tags: ["rescue"], w: 105, h: 80 },
  { id: "aidkit", name: "白色急救箱", icon: "✚", category: "help", tags: ["rescue"], w: 95, h: 88 },
  { id: "cones", name: "安全路锥架", icon: "▲", category: "help", tags: ["rescue"], w: 125, h: 82 },
  { id: "step", name: "防滑侧踏板", icon: "▬", category: "help", tags: [], w: 105, h: 60 },
  { id: "spare", name: "随车备用轮", icon: "●", category: "help", tags: ["rough"], w: 88, h: 88 },
  { id: "flag", name: "小旗子", icon: "🚩", category: "decor", tags: [], w: 65, h: 82 },
  { id: "star", name: "大星星", icon: "★", category: "decor", tags: [], w: 72, h: 72 },
  { id: "eyes", name: "笑脸眼睛", icon: "◕‿◕", category: "decor", tags: [], w: 108, h: 54 },
  { id: "pipe", name: "彩虹排气管", icon: "♨", category: "decor", tags: [], w: 70, h: 92 },
];

const SPRITES: Record<string, [number, number]> = {
  frame:[6,0], longframe:[6,1], heavyframe:[6,2], compactchassis:[6,3],
  excavatorchassis:[6,4], bulldozerchassis:[6,5], cranechassis:[6,6], dumpchassis:[6,7],
  firechassis:[6,8], farmchassis:[6,9], snowchassis:[6,10], miningchassis:[6,11],
  amphichassis:[6,12], citychassis:[6,13], rescuechassis:[6,14], fantasychassis:[6,15],
  hoverframe:[12,8], airframe:[12,9], gliderframe:[12,10], pontoonframe:[12,11],
  utilitybody:[7,0], cargo:[7,1], miningdumpbody:[7,2], forkliftbody:[7,3],
  excavatorbase:[7,4], bulldozerbody:[7,5], cranebody:[7,6], bucketbody:[7,7],
  firebody:[7,8], tractorbody:[7,9], snowbody:[7,10], miningbody:[7,11],
  tank:[7,12], citybody:[7,13], rescuebody:[7,14], fantasybody:[7,15],
  hoverbody:[12,4], airbody:[12,5], gliderpod:[12,6], seaplanebody:[12,7],
  cab:[8,0], bubblecab:[8,1], lampcab:[8,2], firecab:[8,3],
  farmcab:[8,4], rescuecab:[8,5], bulldozercab:[8,6], cranecab:[8,7],
  miningcab:[8,8], forkcab:[8,9], amphicab:[8,10], citycab:[8,11],
  farmcab2:[8,12], amphicab2:[8,13], snowcab:[8,14], fantasycab:[8,15],
  hovercab:[12,0], pilotcab:[12,1], gliderseat:[12,2], bubblecockpit:[12,3],
  shovel:[9,0], blade:[9,1], crane:[9,2], fork:[9,3],
  drill:[9,4], roller:[9,5], plow:[9,6], hose:[9,7],
  tow:[9,8], brush:[9,9], snowblade:[9,10], grabber:[9,11],
  mixer:[9,12], hammer:[9,13], liftplatform:[9,14], conveyor:[9,15],
  wheel:[10,0], orangewheel:[10,1], bluewheel:[10,2], redwheel:[10,3],
  smallwheel:[10,4], farmwheel:[10,5], citywheel:[10,6], fantasywheel:[10,7],
  track:[10,8], miningtrack:[10,9], snowtrack:[10,10], greentrack:[10,11],
  rollerwheel:[13,0], paddlewheel:[10,13], ski:[13,1], hover:[13,2],
  hovercraftskirt:[12,12], wing:[12,13], paraglider:[12,14], propeller:[12,15],
  engine:[11,0], battery:[11,1], suspension:[11,2], lamp:[11,3],
  siren:[11,4], bridge:[11,5], rescuebox:[11,6], flag:[11,7],
  star:[11,8], eyes:[11,9], pipe:[11,10], toolbox:[11,11],
  aidkit:[11,12], cones:[11,13], step:[11,14], spare:[11,15],
};

const SPRITE_SHEETS: Record<number, string> = {
  6: "v9-workshop-chassis.png",
  7: "v9-workshop-bodies.png",
  8: "v9-workshop-cabs.png",
  9: "v9-workshop-tools.png",
  10: "v9-workshop-movement.png",
  11: "v10-side-extras.png",
  12: "v10-side-transport.png",
  13: "v10-side-special-movement.png",
};

const PART_IMAGE_ASSETS: Record<string, string> = {
  augerdrill: "tool-auger-drill-v1.png",
  wreckingball: "tool-wrecking-ball-v1.png",
  hovercab: "transport-hovercab-v11.png",
  pilotcab: "transport-pilotcab-v11.png",
  gliderseat: "transport-gliderseat-v11.png",
  bubblecockpit: "transport-bubblecockpit-v11.png",
  hoverbody: "transport-hoverbody-v11.png",
  airbody: "transport-airbody-v11.png",
  gliderpod: "transport-gliderpod-v11.png",
  seaplanebody: "transport-seaplanebody-v13.png",
  hoverframe: "transport-hoverframe-v11.png",
  airframe: "transport-airframe-v11.png",
  gliderframe: "transport-gliderframe-v11.png",
  pontoonframe: "transport-pontoonframe-v13.png",
  hovercraftskirt: "transport-hovercraftskirt-v11.png",
  wing: "transport-wing-v11.png",
  paraglider: "transport-paraglider-v11.png",
  propeller: "transport-propeller-v11.png",
  greentrack: "movement-greentrack-v13.png",
  ski: "movement-ski-v13.png",
  hover: "movement-hover-v13.png",
};

function hasPartArt(id: string) {
  return Boolean(SPRITES[id] || PART_IMAGE_ASSETS[id]);
}

// The hosted game lives at the site root, while the Windows edition is opened
// directly from app-dist/index.html. Keep one content build working in both
// places instead of letting "/assets" resolve to the computer's drive root.
function resourcePath(path: string) {
  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    return `.${path}`;
  }
  return path;
}

function spriteStyle(id: string): React.CSSProperties | undefined {
  if (PART_IMAGE_ASSETS[id]) return {
    backgroundImage: `url(${resourcePath(`/assets/${PART_IMAGE_ASSETS[id]}?v=1`)})`,
    backgroundPosition: "center",
    backgroundSize: "contain",
  };
  const sprite = SPRITES[id];
  if (!sprite) return undefined;
  const index = sprite[1];
  const col = index % 4;
  const row = Math.floor(index / 4);
  return {
    backgroundImage: `url(${resourcePath(`/assets/${SPRITE_SHEETS[sprite[0]]}?v=9.1`)})`,
    backgroundPosition: `${col * 33.333}% ${row * 33.333}%`,
  };
}

const recolorCache = new Map<string, ImageData>();

function rgbToHsv(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = ((hue / 6) + 1) % 1;
  }
  return [hue, max ? delta / max : 0, max] as const;
}

function hsvToRgb(hue: number, saturation: number, value: number) {
  const section = Math.floor(hue * 6);
  const fraction = hue * 6 - section;
  const p = value * (1 - saturation);
  const q = value * (1 - fraction * saturation);
  const t = value * (1 - (1 - fraction) * saturation);
  const channels = [[value, t, p], [q, value, p], [p, value, t], [p, q, value], [t, p, value], [value, p, q]][section % 6];
  return channels.map((channel) => Math.round(channel * 255));
}

function hueDistance(a: number, b: number) {
  const distance = Math.abs(a - b);
  return Math.min(distance, 1 - distance);
}

function RecoloredPartArt({ id, color, accent, pattern, category }: { id: string; color: string; accent: string; pattern: string; category: Category }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sprite = SPRITES[id];
    const imageAsset = PART_IMAGE_ASSETS[id];
    if (!canvas || (!sprite && !imageAsset)) return;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    const cacheKey = `${id}:${color}:${accent}:${pattern}`;
    const cached = recolorCache.get(cacheKey);
    if (cached) {
      context.putImageData(cached, 0, 0);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (imageAsset) {
        const fit = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
        const width = image.naturalWidth * fit;
        const height = image.naturalHeight * fit;
        context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      } else if (sprite) {
        const sourceWidth = image.naturalWidth / 4;
        const sourceHeight = image.naturalHeight / 4;
        const col = sprite[1] % 4;
        const row = Math.floor(sprite[1] / 4);
        context.drawImage(image, col * sourceWidth, row * sourceHeight, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      }
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const hueBins = new Array(36).fill(0) as number[];

      for (let index = 0; index < pixels.data.length; index += 4) {
        if (pixels.data[index + 3] < 32) continue;
        const [hue, saturation, value] = rgbToHsv(pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]);
        if (saturation < .28 || value < .16) continue;
        if (category === "cab" && hue > .47 && hue < .64) continue; // keep blue glass untouched
        hueBins[Math.floor(hue * hueBins.length) % hueBins.length] += saturation * pixels.data[index + 3];
      }

      const sourceHue = (hueBins.indexOf(Math.max(...hueBins)) + .5) / hueBins.length;
      const [targetHue, targetSaturation, targetValue] = rgbToHsv(
        Number.parseInt(color.slice(1, 3), 16),
        Number.parseInt(color.slice(3, 5), 16),
        Number.parseInt(color.slice(5, 7), 16),
      );
      const [accentHue, accentSaturation, accentValue] = rgbToHsv(
        Number.parseInt(accent.slice(1, 3), 16),
        Number.parseInt(accent.slice(3, 5), 16),
        Number.parseInt(accent.slice(5, 7), 16),
      );

      for (let index = 0; index < pixels.data.length; index += 4) {
        if (pixels.data[index + 3] < 32) continue;
        const [hue, saturation, value] = rgbToHsv(pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]);
        if (saturation < .25 || hueDistance(hue, sourceHue) > .115) continue;
        const pixel = index / 4;
        const x = pixel % canvas.width;
        const y = Math.floor(pixel / canvas.width);
        const useAccent = pattern === "stripe"
          ? (x + y) % 42 > 29
          : pattern === "dots" && ((x % 30) - 15) ** 2 + ((y % 30) - 15) ** 2 < 28;
        const paintHue = useAccent ? accentHue : targetHue;
        const paintSaturation = useAccent ? accentSaturation : targetSaturation;
        const paintValue = useAccent ? accentValue : targetValue;
        const nextValue = Math.max(.08, Math.min(1, value * .86 + paintValue * .14));
        const nextSaturation = Math.max(.18, Math.min(1, paintSaturation * .82 + saturation * .18));
        const [red, green, blue] = hsvToRgb(paintHue, nextSaturation, nextValue);
        pixels.data[index] = red;
        pixels.data[index + 1] = green;
        pixels.data[index + 2] = blue;
      }
      recolorCache.set(cacheKey, pixels);
      context.putImageData(pixels, 0, 0);
    };
    image.src = resourcePath(imageAsset ? `/assets/${imageAsset}?v=1` : `/assets/${SPRITE_SHEETS[sprite![0]]}?v=9.1`);
    return () => { cancelled = true; };
  }, [accent, category, color, id, pattern]);

  return <canvas ref={canvasRef} className="part-recolor" width="256" height="256" aria-hidden="true"/>;
}

const ACTION_EFFECT: Record<string, { scene: string; label: string }> = {
  dig: { scene: "🟫🪨", label: "挖斗一铲一铲挖开泥土" },
  lift: { scene: "📦⬆️", label: "吊臂稳稳举起重物" },
  carry: { scene: "📦📦", label: "车厢装好物资送到目的地" },
  drill: { scene: "🪨✨", label: "钻头转起来打开通道" },
  smash: { scene: "⚫💥🧱", label: "大摆锤来回摆动，把旧砖墙轻轻拆开" },
  roll: { scene: "〰️➡️", label: "滚筒把路面压得平平整整" },
  push: { scene: "🧱➡️", label: "推土铲把障碍推到一边" },
  tow: { scene: "🚙〰️", label: "拖钩拉着受困车辆前进" },
  farm: { scene: "🌱🌱", label: "农具翻开泥土种下希望" },
  clear: { scene: "🍂💨", label: "工具把道路清理干净" },
  water: { scene: "💦🌳", label: "水炮喷出清凉的水花" },
  clean: { scene: "🍃✨", label: "刷子旋转着扫走杂物" },
  snow: { scene: "❄️💨", label: "雪铲推开厚厚的积雪" },
  rough: { scene: "⛰️➡️", label: "履带稳稳越过崎岖道路" },
  bridge: { scene: "🌉✅", label: "折叠桥展开连接两边" },
  light: { scene: "🔦✨", label: "探照灯照亮前面的路" },
  fire: { scene: "💦🔥", label: "水炮安全地浇灭小火苗" },
  mix: { scene: "🌀🏗️", label: "搅拌筒转动准备好水泥" },
  rescue: { scene: "🛟💪", label: "救援设备把伙伴带回安全处" },
  fork: { scene: "📦⬆️", label: "货叉稳稳托起箱子送上货架" },
};

const ACTION_GUIDE: Record<string, {
  tool: string;
  objective: string;
  steps: readonly [string, string, string];
  success: string;
  before: string;
  after: string;
}> = {
  dig: { tool: "挖斗或挖掘臂", objective: "把指定位置挖开，并把挖出的泥土放到旁边", steps: ["装上挖斗或挖掘臂", "让工具靠近车身前端", "装好轮子或履带再出发"], success: "挖斗落下，目标区域被整齐挖开", before: "🟫🪨", after: "🕳️✨" },
  lift: { tool: "吊臂、起重钩或升降台", objective: "把目标稳稳举起，再放到故事指定的位置", steps: ["选择能升高的工具", "把工具装在车身上方或后部", "给车辆装好移动部件"], success: "吊臂升起，目标被稳稳放到正确位置", before: "📦⬇️", after: "📦✅" },
  carry: { tool: "货斗、货箱或承载平台", objective: "把要搬运的物品装上车，并安全送到目的地", steps: ["选择能装货的车身", "给货箱留出足够空间", "装好轮子或履带"], success: "货物没有掉落，全部安全送达", before: "📦📦", after: "🏁✅" },
  drill: { tool: "旋转钻头", objective: "对准软岩或障碍钻开通道，不碰旁边的区域", steps: ["装上旋转钻头", "让钻头朝向车辆前方", "使用稳定的底盘和移动部件"], success: "钻头转动，通道顺利打开", before: "🪨⛔", after: "🕳️💎" },
  smash: { tool: "工程大摆锤", objective: "停在安全标线外，让摆锤摆动并拆开指定的旧矮墙", steps: ["装上工程大摆锤", "把摆锤安装在车身上方", "使用宽底盘和稳定的移动部件"], success: "摆锤稳稳摆动，旧砖墙变成整齐的小砖堆", before: "🧱🧱", after: "🧱✨" },
  roll: { tool: "压路滚筒", objective: "从起点压到终点，让整段路面变得平整", steps: ["装上宽滚筒", "让滚筒接近地面", "装好驾驶室和移动部件"], success: "滚筒慢慢压过，路面变得平平整整", before: "〰️〰️", after: "━━━━" },
  push: { tool: "推土铲或雪铲", objective: "把挡路物推到标线外，重新打开通道", steps: ["选择宽宽的推铲", "把推铲装在车辆前端", "装好有抓地力的轮子或履带"], success: "推铲向前，障碍被整齐推到一边", before: "🧱⛔", after: "➡️✅" },
  tow: { tool: "拖钩或救援绞盘", objective: "连接受困目标，慢慢把它拉回安全区域", steps: ["装上拖钩或绞盘", "把拖具放在车身后部", "选择能稳定移动的轮子或履带"], success: "拖具绷紧，受困的伙伴安全回来了", before: "🚙🕳️", after: "🚙✅" },
  farm: { tool: "犁、耙或播种工具", objective: "沿着田垄作业，让土地达到播种条件", steps: ["装上农田作业工具", "让农具接近地面", "使用适合田野的移动部件"], success: "整齐的田垄出现了，可以开始播种啦", before: "🟫🟫", after: "🌱🌱" },
  clear: { tool: "抓斗、推铲或清障臂", objective: "把散落的障碍收拢并移出道路", steps: ["选择能清障的工具", "把工具装在车身前端或侧面", "留出稳定的移动空间"], success: "道路上的障碍被清理干净", before: "🪨🍂", after: "🛣️✨" },
  water: { tool: "水箱、水炮或喷洒器", objective: "把水准确送到目标区域，并均匀喷洒", steps: ["带上储水设备", "装上水炮或喷洒器", "让喷水口朝向车辆外侧"], success: "清凉的水花准确落在需要的地方", before: "🌱☀️", after: "🌿💧" },
  clean: { tool: "旋转清扫刷", objective: "把地面杂物扫进收集区，不留在道路中央", steps: ["装上旋转清扫刷", "让刷子贴近地面", "装好能慢速前进的移动部件"], success: "刷子转起来，地面重新亮晶晶", before: "🍂🧻", after: "✨✨" },
  snow: { tool: "雪铲、扫雪刷或雪地履带", objective: "清出一条从入口到出口都能通行的雪路", steps: ["装上雪地清理工具", "让工具靠近地面", "选择轮胎或履带稳定前进"], success: "积雪被推到路边，通道重新打开", before: "❄️⛔", after: "🛣️✅" },
  rough: { tool: "履带或越野轮", objective: "平稳穿过崎岖路段，把物资送到终点", steps: ["选择履带或越野轮", "把车身和底盘连接好", "确认货物有承载位置"], success: "车辆稳稳越过石路，物资准时到达", before: "⛰️📦", after: "⛺✅" },
  bridge: { tool: "折叠桥或架桥平台", objective: "把桥面展开到缺口两端，连接两边道路", steps: ["带上一座折叠桥", "把桥架装在承载平台上", "使用稳定的底盘移动到缺口旁"], success: "桥面展开，两边道路连起来了", before: "🛣️🌊🛣️", after: "🛣️🌉🛣️" },
  light: { tool: "探照灯或照明架", objective: "照亮故事里的目标和前方路线", steps: ["装上一盏探照灯", "把灯放在较高位置", "调整朝向让灯照向车辆前方"], success: "灯光亮起，隐藏的路线清楚出现", before: "🌫️❓", after: "🔦✨" },
  fire: { tool: "水箱和消防水炮", objective: "在安全位置对准小火苗喷水，直到火苗完全熄灭", steps: ["带上水箱", "装上消防水炮", "让水炮朝向车辆外侧"], success: "水炮喷出水花，小火苗安全熄灭", before: "🔥🔥", after: "💧✨" },
  mix: { tool: "搅拌筒和出料槽", objective: "把材料搅拌均匀，再送到指定施工位置", steps: ["装上搅拌筒", "给搅拌筒准备承载车身", "装好移动部件运到现场"], success: "搅拌筒转动，材料均匀送达", before: "🪨💧", after: "🌀✅" },
  rescue: { tool: "救援平台、绞盘或救生设备", objective: "靠近需要帮助的伙伴，把它安全带回指定区域", steps: ["装上救援设备", "给救援目标留出承载位置", "选择适合现场的移动部件"], success: "伙伴坐上救援平台，安全回到大家身边", before: "🆘🌊", after: "🛟✅" },
  fork: { tool: "升降货叉", objective: "把货叉插到箱子下方，抬起后放上指定货架", steps: ["装上升降货叉", "让货叉朝向车辆前方", "选择紧凑稳定的底盘"], success: "货叉升起，箱子整齐住进货架", before: "📦⬇️", after: "📦⬆️✅" },
};

const HINT_VOICE_LINES: Record<string, string> = {
  dig: "小提示：装上挖斗，再准备轮子或履带。",
  lift: "小提示：选择能升高的吊臂或升降台。",
  carry: "小提示：准备能装货的车身，再装好移动部件。",
  drill: "小提示：装上钻头，让钻尖朝向车辆前方。",
  smash: "小提示：装上工程大摆锤，再选择宽而稳定的底盘。",
  roll: "小提示：让压路滚筒靠近地面。",
  push: "小提示：把宽推铲安装在车辆前端。",
  tow: "小提示：把拖钩或绞盘安装在车身后部。",
  farm: "小提示：让农田工具贴近地面，再沿田垄前进。",
  clear: "小提示：抓斗、推铲或清障臂都能清理道路。",
  water: "小提示：水箱和喷水设备要一起带上。",
  clean: "小提示：把旋转清扫刷安装在接近地面的位置。",
  snow: "小提示：雪铲要在车头前面，履带走雪地更稳。",
  rough: "小提示：选择履带或越野轮，崎岖路面会更稳定。",
  bridge: "小提示：把折叠桥放在稳定的承载平台上。",
  light: "小提示：把探照灯装高一点，并朝向车辆前方。",
  fire: "小提示：带上水箱和消防水炮，并在安全位置喷水。",
  mix: "小提示：搅拌筒需要结实的车身来承载。",
  rescue: "小提示：带上救援平台、绞盘或救生设备。",
  fork: "小提示：让货叉朝前，并使用紧凑稳定的底盘。",
};

const THEME_STAGE: Record<string, string> = {
  建筑工地: "construction", 农场田野: "farm", 城市维护: "city", 山地救援: "mountain", 消防防灾: "fire",
  港口物流: "port", 矿山探索: "mine", 海滩水边: "coast", 冰雪地区: "snow", 奇想任务: "fantasy",
};

const EVENT_SEEDS = [
  ["建筑工地", "地基里的硬土", "小河狸", "🦫", "新图书馆要开工啦，可是地面硬邦邦的。帮小河狸挖出整齐的地基吧！", "dig", "装上会挖土的工具"],
  ["建筑工地", "高高的钢梁", "斑马工长", "🦓", "活动中心的钢梁太高了，大家踮起脚也够不到。需要一位大力士！", "lift", "装上能举高高的工具"],
  ["建筑工地", "沙石搬家", "熊猫师傅", "🐼", "一堆沙石挡住了工地小路，把它们装起来运走吧。", "carry", "装上可以装东西的车厢"],
  ["建筑工地", "隧道向前进", "鼹鼠工程师", "🐹", "小山下面要开一条圆圆的隧道，前面有一层软岩石。", "drill", "装上会转动的钻头"],
  ["建筑工地", "水泥路变平", "河马队长", "🦛", "刚铺好的路面像波浪一样，校车开过去会摇摇晃晃。", "roll", "装上圆圆的大滚筒"],
  ["建筑工地", "旧砖墙轻轻拆", "狐狸建筑师", "🦊", "旧砖块排成了一堵矮墙，新花园没有入口啦。请停在黄色标线外，用大摆锤把指定墙段拆成小砖堆。", "smash", "装上工程大摆锤和宽而稳定的底盘"],
  ["农场田野", "南瓜大丰收", "兔子农夫", "🐰", "圆滚滚的南瓜成熟啦，一次要运好多好多！", "carry", "装上大车厢来装南瓜"],
  ["农场田野", "泥地里的小牛", "奶牛妈妈", "🐮", "小牛追蝴蝶时陷进软泥里，正在等温柔的帮助。", "tow", "装上结实的拖钩"],
  ["农场田野", "给土地挠痒痒", "小鸡农夫", "🐥", "春天到了，土地睡了一个冬天，要先松松土才能播种。", "farm", "装上农田用的犁"],
  ["农场田野", "干草垛旅行", "绵羊爷爷", "🐑", "乌云要来了，快把金黄的干草运进谷仓吧。", "carry", "需要能装货的车身"],
  ["农场田野", "小水沟堵住了", "青蛙园丁", "🐸", "树叶堵住了灌溉水沟，蔬菜们都在口渴。", "clear", "装上能清理障碍的工具"],
  ["农场田野", "果树喝水啦", "刺猬果农", "🦔", "今天太阳暖洋洋，苹果树想喝一场及时的水。", "water", "带上水箱或喷水设备"],
  ["城市维护", "落叶转圈圈", "松鼠清洁员", "🐿️", "风把落叶吹满了广场，大家走路沙沙响。", "clean", "装上会旋转的清扫刷"],
  ["城市维护", "路灯打瞌睡", "猫头鹰电工", "🦉", "街角的路灯不亮了，可灯泡住得太高。", "lift", "用能升高的工具靠近路灯"],
  ["城市维护", "水管打喷嚏", "鸭子维修员", "🦆", "公园水管噗噗冒泡，泥土盖住了阀门。", "dig", "装上挖土工具找到阀门"],
  ["城市维护", "小路积雪", "企鹅邮差", "🐧", "邮局门前积了厚厚一层雪，信件送不出去啦。", "snow", "雪地工具可以帮大忙"],
  ["城市维护", "倒下的小树", "考拉园丁", "🐨", "风吹倒了一棵小树，它正好躺在人行道上休息。", "lift", "把小树轻轻举起来"],
  ["城市维护", "坑洼变平整", "柴犬巡查员", "🐕", "自行车道有几个小坑，骑车的小伙伴一颠一颠。", "roll", "用滚筒把新路压平"],
  ["山地救援", "石头拦路", "山羊向导", "🐐", "几块圆石滚到山路中间，野餐巴士过不去。", "clear", "把挡路石头清走"],
  ["山地救援", "小吉普打滑", "小熊旅客", "🐻", "小吉普的轮子在泥坡上呼呼打转，需要拉一把。", "tow", "结实拖钩能把车拉出来"],
  ["山地救援", "山谷送物资", "鹰队长", "🦅", "帐篷和面包要送到山谷营地，道路弯弯曲曲。", "rough", "履带更适合崎岖道路"],
  ["山地救援", "溪水上的小桥", "鹿老师", "🦌", "孩子们要去自然课堂，可木板桥少了一段。", "bridge", "带上一座折叠小桥"],
  ["山地救援", "雾里的亮光", "浣熊探险家", "🦝", "山间起了白雾，回家的路藏起来了。", "light", "装一盏亮亮的探照灯"],
  ["山地救援", "帐篷飞走了", "兔子露营家", "🐇", "一顶蓝帐篷被风吹到矮树上，像一朵奇怪的花。", "lift", "把帐篷从树上取下来"],
  ["消防防灾", "谷仓旁的小火苗", "小马消防员", "🐴", "一小堆干草冒起火苗，大家已经站到安全的地方。", "fire", "带上水和喷水设备"],
  ["消防防灾", "森林想喝水", "大象护林员", "🐘", "天气太干燥，给森林边缘洒水，让泥土湿润起来。", "water", "装满一车清凉的水"],
  ["消防防灾", "安全通道的木头", "狮子队长", "🦁", "几根木头挡住了消防通道，需要快快移到一边。", "lift", "用吊臂举起木头"],
  ["消防防灾", "屋顶上的风筝", "长颈鹿消防员", "🦒", "风筝缠在低低的屋檐上，小朋友在远处等候。", "lift", "升高工具能安全取下来"],
  ["消防防灾", "夜间安全巡逻", "狗狗消防员", "🐶", "夜里的仓库需要检查一圈，角落里黑黑的。", "light", "用探照灯照亮角落"],
  ["消防防灾", "水箱补给", "河马消防员", "🦛", "消防练习要开始了，训练场的大水桶还空着。", "water", "带水过去补充水桶"],
  ["港口物流", "彩色集装箱", "海豹船长", "🦭", "三个彩色箱子要整齐放上货船，船很快就要出发。", "lift", "需要举起重物的工具"],
  ["港口物流", "木材排排坐", "水獭装卸员", "🦦", "一捆捆木材躺在码头上，要搬进黄色仓库。", "carry", "车厢可以运很多木材"],
  ["港口物流", "小船回家", "海豚领航员", "🐬", "一艘小船被浪推到沙滩上，想回到蓝蓝的水里。", "tow", "用拖钩拉动小船"],
  ["港口物流", "码头泡泡纸", "螃蟹清洁员", "🦀", "包装泡泡纸被风吹得到处都是，像一群透明蝴蝶。", "clean", "用清扫刷把它们收好"],
  ["港口物流", "大箱子上货架", "鲸鱼仓库长", "🐳", "大箱子要住到第二层货架，可它自己爬不上去。", "fork", "叉车工具最会搬箱子"],
  ["港口物流", "灯塔的小灯泡", "海鸥管理员", "🕊️", "码头的小灯塔需要换灯泡，它站得高高的。", "lift", "举高高就能够到灯泡"],
  ["矿山探索", "软岩石后面", "穿山甲博士", "🦔", "探测器说软岩石后面藏着闪亮的石英。", "drill", "钻头能打开探索通道"],
  ["矿山探索", "矿石小山", "小熊矿工", "🐻", "采集好的彩色矿石堆成小山，要运到研究室。", "carry", "用车厢装走矿石"],
  ["矿山探索", "洞穴亮起来", "蝙蝠向导", "🦇", "新发现的洞穴黑乎乎，墙上可能有漂亮花纹。", "light", "先用灯照亮再前进"],
  ["矿山探索", "入口的小石块", "鼹鼠队长", "🐹", "碎石散在洞穴入口，推车进不去。", "push", "宽铲可以推走碎石"],
  ["矿山探索", "地下小水洼", "青蛙地质家", "🐸", "地下泉水积成了水洼，需要挖一条浅沟引走它。", "dig", "挖掘工具能开出水沟"],
  ["矿山探索", "水晶轻轻搬", "狐狸研究员", "🦊", "一块大水晶很漂亮，也很怕摔，要稳稳地搬运。", "lift", "用吊臂轻轻吊起来"],
  ["海滩水边", "漂流木集合", "海龟爷爷", "🐢", "潮水送来许多漂流木，把散步小路挡住了。", "clear", "清理工具可以打开道路"],
  ["海滩水边", "沙堡要加高", "章鱼建筑师", "🐙", "海边沙堡还差一座高塔，需要运来一车细沙。", "carry", "车厢能带来很多沙子"],
  ["海滩水边", "小帆船搁浅", "企鹅水手", "🐧", "小帆船睡在沙滩上，海水够不到它。", "tow", "用拖钩送它回到水边"],
  ["海滩水边", "堤岸的小缺口", "河狸工程师", "🦫", "小堤岸被浪冲出缺口，要用沙石填起来。", "push", "推土工具能推平沙石"],
  ["海滩水边", "贝壳广场清洁", "寄居蟹管理员", "🦀", "海草铺满了贝壳广场，请把海草扫到收集箱。", "clean", "旋转刷子最会打扫"],
  ["海滩水边", "口渴的小椰树", "猴子园丁", "🐒", "刚种下的小椰树叶子耷拉着，想喝淡水。", "water", "带清水给小树喝"],
  ["冰雪地区", "邮局前的雪堆", "北极熊邮长", "🐻‍❄️", "风把雪堆在邮局门口，包裹都在等着出发。", "snow", "装上雪地清理工具"],
  ["冰雪地区", "企鹅玩偶不见了", "小企鹅", "🐧", "最喜欢的企鹅玩偶掉进松软雪堆，只露出一顶红帽子。", "dig", "轻轻挖开雪找玩偶"],
  ["冰雪地区", "暖毯送到家", "北极狐奶奶", "🦊", "一车暖毯要送去雪村，路面滑溜溜。", "snow", "雪地履带走得更稳"],
  ["冰雪地区", "冰面小障碍", "海豹巡查员", "🦭", "几块碎冰挡住了安全练习场，要推到标线外。", "push", "用宽铲推开碎冰"],
  ["冰雪地区", "雪夜指路灯", "驯鹿向导", "🦌", "雪花越下越密，回营地的标志看不清啦。", "light", "亮灯能照出方向"],
  ["冰雪地区", "雪人鼻子太高", "雪兔宝宝", "🐇", "大雪人的胡萝卜鼻子掉了，可它的脸太高啦。", "lift", "把胡萝卜举到高处"],
  ["奇想任务", "长颈鹿的蛋糕", "长颈鹿寿星", "🦒", "超级高的生日蛋糕做好啦，怎样让它平稳到达派对？", "carry", "长底盘适合运大蛋糕"],
  ["奇想任务", "巨型南瓜滚来了", "魔法兔子", "🐰", "巨型南瓜咕噜咕噜停在村口，大家想把它搬去展览。", "lift", "大力吊臂来帮忙"],
  ["奇想任务", "恐龙游乐场", "小恐龙", "🦕", "游乐场要铺一条平平的彩虹跑道，小恐龙已经穿好跑鞋。", "roll", "用滚筒把跑道压平"],
  ["奇想任务", "云朵卡在树上", "星星邮差", "⭐", "一小朵云迷路卡在树梢，它想回到天空朋友身边。", "lift", "把云朵送得高高的"],
  ["奇想任务", "月亮花口渴", "月亮兔", "🌙", "夜里才开放的月亮花醒来了，却找不到闪闪的露水。", "water", "送去一箱清亮的水"],
  ["奇想任务", "彩虹下的金星星", "独角兽", "🦄", "一颗金星星落在软泥里，只露出闪亮的小角。", "dig", "挖掘工具能找到星星"],
] as const;

const EXTRA_EVENT_SEEDS = [
  ["建筑工地", "操场边的小土坡", "袋鼠校长", "🦘", "新操场的入口被一座小土坡挡住了。请从黄色标线开始，把泥土推到右边的收集区。", "push", "把宽推铲装在车头前面"],
  ["建筑工地", "雨棚立柱上楼", "熊猫焊工", "🐼", "四根雨棚立柱要从地面送到二层平台。每次吊一根，放进蓝色方框里。", "lift", "吊臂需要能升高并稳稳放下"],
  ["建筑工地", "搅拌一车彩色水泥", "河马配料员", "🦛", "儿童乐园要铺一块蓝色软地面。请把砂石和水搅匀，再运到滑梯旁。", "mix", "装上搅拌筒和能承载它的车身"],
  ["建筑工地", "地下管道的入口", "鼹鼠测量员", "🐹", "测量标记下面有一块薄岩层。只钻开红旗正下方，给新管道留出入口。", "drill", "让钻头朝前并对准岩层"],
  ["农场田野", "玉米苗的三条水线", "小鹿农夫", "🦌", "三排玉米苗叶子卷起来了。请沿着田边慢慢走，让每一排都淋到水。", "water", "带水箱和向侧面喷水的设备"],
  ["农场田野", "苹果筐送进仓库", "刺猬采摘员", "🦔", "六筐苹果排在果园门口。请装进货箱，送到红屋顶仓库里。", "carry", "大货箱能一次装下更多果筐"],
  ["农场田野", "稻草人重新站好", "麻雀队长", "🐦", "稻草人被风吹倒在田埂上。请把它轻轻吊起，放回木桩旁。", "lift", "用吊臂轻轻提起稻草人"],
  ["农场田野", "播种前的直田垄", "羊驼农夫", "🦙", "播种机明天要来，菜地还没有田垄。请从木牌走到小屋，犁出三条直直的沟。", "farm", "把犁装低一点并沿地面工作"],
  ["城市维护", "公交站牌擦亮亮", "浣熊清洁员", "🦝", "雨后泥点盖住了公交站牌下的小广场。请把泥叶扫进绿色垃圾箱。", "clean", "清扫刷要靠近地面"],
  ["城市维护", "树坑里的新土", "考拉园丁", "🐨", "新栽的小树根旁少了一圈土。请运来细土，倒进白色树坑线以内。", "carry", "用货斗装土并运到树坑旁"],
  ["城市维护", "地下阀门找到了", "水獭维修员", "🦦", "蓝色水管一直滴水，阀门藏在路边软土下面。请挖开小旗圈出的地方。", "dig", "只挖开标记区域就能找到阀门"],
  ["城市维护", "窄巷里的纸箱", "猫咪巡查员", "🐱", "三个空纸箱挡住了窄巷出口。请抬起它们，放到巷口回收车旁。", "lift", "小型升降工具更适合窄巷"],
  ["山地救援", "落在坡下的背包", "狐狸向导", "🦊", "蓝背包滚到缓坡下，旁边的路很窄。请用救援绞盘把背包拉回木牌边。", "rescue", "绞盘或救援平台能安全带回背包"],
  ["山地救援", "两箱药品过石路", "鹰医生", "🦅", "营地需要两箱急救用品。石路凹凸不平，请平稳送到白帐篷门口。", "rough", "履带或越野轮走石路更稳"],
  ["山地救援", "雨后的小塌方", "山羊巡路员", "🐐", "雨把碎石冲到山路中央。请从左到右清出一条能让小巴通过的路。", "clear", "抓斗或推铲都能清走碎石"],
  ["山地救援", "山谷信号灯", "猫头鹰通讯员", "🦉", "傍晚的白雾盖住了营地信号牌。请把探照灯抬高，照向红色三角牌。", "light", "高处的探照灯能照得更远"],
  ["消防防灾", "厨房演习的小火盆", "斑点狗教官", "🐶", "安全演习开始了，金属火盆里有一簇训练火苗。请停在黄线外喷水。", "fire", "水箱和水炮要一起带上"],
  ["消防防灾", "枯叶隔离带", "大象护林员", "🐘", "林边的枯叶堆得太厚。请把它们扫进远处的收集框，留出一条干净隔离带。", "clean", "旋转刷能把枯叶集中起来"],
  ["消防防灾", "消防栓前的花盆", "小马消防员", "🐴", "两个大花盆挡住了消防栓。请把它们吊到墙边白色方框里。", "lift", "用吊臂逐个搬开花盆"],
  ["消防防灾", "训练塔水池补水", "河马教官", "🦛", "训练塔旁的蓝水池只剩一半水。请带水过去，喷到水位线位置。", "water", "大水箱和喷洒设备最合适"],
  ["港口物流", "冷藏箱赶轮船", "北极狐理货员", "🦊", "两只冷藏箱要在汽笛响前送到三号泊位。请把箱子装稳再出发。", "carry", "用封闭货箱或宽平台运送"],
  ["港口物流", "渔网卷上货架", "海狮仓管员", "🦭", "圆圆的渔网卷太重，工人抱不动。请用货叉托起，放到一层蓝货架。", "fork", "货叉要从渔网卷下方托起"],
  ["港口物流", "航道浮标归位", "海豚巡航员", "🐬", "黄色浮标被浪推到浅滩。请挂好拖钩，把它慢慢拉回水中标记处。", "tow", "拖钩适合拉动浮标"],
  ["港口物流", "木屑离开装卸区", "螃蟹清洁员", "🦀", "装木材后，码头上落了一地木屑。请全部扫进棕色收集箱。", "clean", "让清扫刷贴着码头地面"],
  ["矿山探索", "发光矿石的窄缝", "穿山甲博士", "🦔", "探测器在窄缝后面闪烁。请对准白色圆点钻开软岩，停在矿石前。", "drill", "钻头要朝向岩缝并保持稳定"],
  ["矿山探索", "样本箱回实验室", "蝙蝠研究员", "🦇", "四个标好号码的样本箱不能颠簸。请装进车厢，送到洞口实验室。", "carry", "稳定货箱和履带能保护样本"],
  ["矿山探索", "矿洞顶的检查牌", "鼹鼠安全员", "🐹", "高处检查牌被灰尘盖住了。请升高工作平台，让安全员靠近检查。", "lift", "升降台要稳稳装在车身上"],
  ["矿山探索", "岔路口照明", "狐狸地质家", "🦊", "洞穴有左右两条岔路，右边标记看不清。请把灯照向蓝箭头。", "light", "高位探照灯可以照亮岔路"],
  ["海滩水边", "潮池里的玩具船", "海獭救生员", "🦦", "玩具船漂进浅潮池，被海草缠住了。请用救援设备带它回沙滩小旗旁。", "rescue", "救生平台或绞盘都能帮忙"],
  ["海滩水边", "木栈道下的细沙", "海龟工长", "🐢", "木栈道下被浪冲出一个浅坑。请运来细沙，填到木板下方。", "carry", "货斗能把细沙送到栈道边"],
  ["海滩水边", "冲上岸的海草", "寄居蟹清洁员", "🦀", "一长条海草盖住了沙滩通道。请从入口扫到蓝色收集网里。", "clean", "清扫刷适合收拢柔软海草"],
  ["海滩水边", "小堤岸再压实", "河狸工程师", "🦫", "刚填好的堤岸沙土松松的。请沿白线来回压一遍，让表面平整结实。", "roll", "宽滚筒要贴着堤岸表面"],
  ["冰雪地区", "诊所门前通道", "北极狐医生", "🦊", "夜里又下了雪，诊所门口到主路之间被盖住了。请清出一条直通道。", "snow", "雪铲装在车头前面最方便"],
  ["冰雪地区", "冰屋顶上的红围巾", "海豹宝宝", "🦭", "红围巾被风吹到低矮冰屋顶上。请用升降工具取下，放进门口篮子。", "lift", "升降台能把围巾轻轻取下"],
  ["冰雪地区", "雪地研究箱", "驯鹿研究员", "🦌", "三个保温研究箱要送到远处蓝帐篷。请走有旗子的安全雪路。", "rough", "雪地履带能让车辆不打滑"],
  ["冰雪地区", "路标露出来", "企鹅巡查员", "🐧", "路标下半段被松雪埋住了。请轻轻挖开周围的雪，不碰到路标。", "dig", "小挖斗适合精细清雪"],
  ["奇想任务", "机器人丢了齿轮", "小机器人", "🤖", "一枚金齿轮滚进彩色沙坑。请挖开闪光的位置，把齿轮找出来。", "dig", "用挖斗对准闪光点"],
  ["奇想任务", "龙宝宝的彩虹浴", "龙宝宝", "🐲", "龙宝宝跑过云朵操场，身上沾满星星灰。请均匀喷一场轻轻的彩虹水。", "water", "水箱和喷洒器能变出彩虹水花"],
  ["奇想任务", "会飞的书架", "猫头鹰魔法师", "🦉", "三本故事书飞到高书架顶端。请用升降工具把它们逐本接回篮子。", "lift", "升降台要到达高书架旁"],
  ["奇想任务", "月球小车回基地", "星星队长", "⭐", "月球小车卡在软软的银色沙坑里。请接好拖具，沿蓝箭头拉回圆顶基地。", "tow", "拖钩和越野轮适合月球沙地"],
] as const;

const ALL_EVENT_SEEDS = [...EVENT_SEEDS, ...EXTRA_EVENT_SEEDS] as const;

const MISSIONS: Mission[] = ALL_EVENT_SEEDS.map((e, i) => {
  const guide = ACTION_GUIDE[e[5]];
  return {
  id: `mission-${i + 1}`,
  theme: e[0],
  title: e[1],
  character: e[2],
  icon: e[3],
  place: e[0],
  story: e[4],
  needs: e[5] === "fork" ? ["lift"] : [e[5]],
  hint: e[6],
  reward: ["⭐", "🌼", "⚡", "🌈", "🍀", "🎈"][i % 6],
  objective: `${e[1]}现场：${guide.objective}。`,
  steps: guide.steps,
  success: guide.success,
  targetBefore: guide.before,
  targetAfter: guide.after,
  voiceHint: HINT_VOICE_LINES[e[5]],
  voiceKey: e[5],
  };
});

const CATEGORY_LABELS: Record<Category, { label: string; tip: string; part: string }> = {
  chassis: { label: "车底", tip: "第一步，托住整辆车", part: "frame" },
  body: { label: "车身", tip: "把设备装在它上面", part: "utilitybody" },
  move: { label: "轮子", tip: "让车走起来", part: "wheel" },
  cab: { label: "车头", tip: "小司机坐这里", part: "cab" },
  tool: { label: "工具", tip: "挖、推、吊和钻", part: "shovel" },
  help: { label: "随车物品", tip: "灯、箱子和安全用品", part: "rescuebox" },
  decor: { label: "贴纸", tip: "把车装扮漂亮", part: "star" },
};

const DEFAULT_PAINT: Paint = {
  primary: "#ffc52f",
  secondary: "#ff7b3e",
  wheels: "#f5b52b",
  pattern: "none",
  sticker: "",
  stickerX: 58,
  stickerY: 52,
  finish: "clean",
};

const PART_TINTS = ["#f2b632", "#e86642", "#45ad76", "#3f91cf", "#745bb0", "#d65f93", "#ecebe2"];
const SAFETY_STICKERS = [
  { id: "", sprite: -1, label: "无贴纸" },
  { id: "warning", sprite: 0, label: "注意安全" },
  { id: "flammable", sprite: 1, label: "易燃" },
  { id: "explosive", sprite: 2, label: "易爆" },
  { id: "no-fire", sprite: 3, label: "禁止烟火" },
  { id: "fire-safe", sprite: 4, label: "防火" },
  { id: "electric", sprite: 5, label: "高压危险" },
  { id: "hot", sprite: 6, label: "当心高温" },
  { id: "helmet", sprite: 7, label: "戴安全帽" },
  { id: "first-aid", sprite: 8, label: "急救" },
  { id: "rescue", sprite: 9, label: "紧急救援" },
  { id: "construction", sprite: 10, label: "施工注意" },
];

function SafetyStickerIcon({ sticker }: { sticker: (typeof SAFETY_STICKERS)[number] }) {
  if (sticker.sprite < 0) return <span className="safety-icon-none">—</span>;
  const col = sticker.sprite % 4;
  const row = Math.floor(sticker.sprite / 4);
  return <span className="safety-icon" style={{
    backgroundImage: `url(${resourcePath("/assets/safety-icons-v1.png")})`,
    backgroundPosition: `${col * 33.333}% ${row * 33.333}%`,
  }}/>;
}

function defaultPartColor(part: Part, paint: Paint) {
  if (part.category === "move") return paint.wheels;
  if (part.category === "tool") return paint.secondary;
  return paint.primary;
}

function resolvedPartColor(part: Part, paint: Paint) {
  if (part.colorMode === "primary") return paint.primary;
  if (part.colorMode === "secondary") return paint.secondary;
  if (part.colorMode === "wheels") return paint.wheels;
  // A part-level colour is an explicit override. Older saved builds and the
  // quick-colour bar may not have a colorMode field, so do not silently throw
  // the child's chosen colour away just because that metadata is missing.
  if (part.color && !part.originalColor) return part.color;
  return defaultPartColor(part, paint);
}

function directPartColor(part: Part, paint: Paint) {
  if (part.originalColor || part.colorMode === "original") return undefined;
  return resolvedPartColor(part, paint);
}

function PartArtwork({ part, paint, hit = false }: { part: Part; paint: Paint; hit?: boolean }) {
  const color = directPartColor(part, paint);
  return <>
    <span className="part-art" style={spriteStyle(part.id)}/>
    {color && <RecoloredPartArt id={part.id} color={color} accent={paint.secondary} pattern={paint.pattern} category={part.category}/>}
    {hit && <span className="part-hit"/>}
  </>;
}

function SafetySticker({ value, x = 58, y = 52, draggable = false, onPointerDown }: { value: string; x?: number; y?: number; draggable?: boolean; onPointerDown?: React.PointerEventHandler<HTMLElement> }) {
  if (!value) return null;
  const sticker = SAFETY_STICKERS.find((item) => item.id === value);
  const position = { left: `${x}%`, top: `${y}%` };
  if (!sticker) return <i className={`part-sticker legacy-sticker ${draggable ? "draggable" : ""}`} style={position} onPointerDown={onPointerDown}>{value}</i>;
  return <i className={`part-sticker safety-sticker ${draggable ? "draggable" : ""}`} aria-label={sticker.label} style={position} onPointerDown={onPointerDown}><SafetyStickerIcon sticker={sticker}/></i>;
}
const DEFAULT_SAVE: SaveData = {
  stars: 0,
  completed: [],
  recent: [],
  unlocked: 3,
  garage: [],
  tutorialSeen: false,
};

function safeLoad(): SaveData {
  if (typeof window === "undefined") return DEFAULT_SAVE;
  try {
    const raw = localStorage.getItem("buildyard-save-v1");
    if (!raw) return DEFAULT_SAVE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SAVE,
      ...parsed,
      unlocked: Math.max(3, Number(parsed.unlocked) || 0),
      garage: Array.isArray(parsed.garage) ? parsed.garage : [],
    };
  } catch {
    return DEFAULT_SAVE;
  }
}

let currentNarration: HTMLAudioElement | null = null;
let narrationRun = 0;

function playNarrationFiles(files: string[], enabled = true) {
  if (!enabled || typeof Audio === "undefined" || !files.length) return;
  currentNarration?.pause();
  const run = ++narrationRun;
  const playAt = (index: number) => {
    if (run !== narrationRun || index >= files.length) return;
    const audio = new Audio(files[index]);
    audio.volume = .92;
    currentNarration = audio;
    audio.addEventListener("ended", () => playAt(index + 1), { once: true });
    audio.addEventListener("error", () => playAt(index + 1), { once: true });
    void audio.play().catch(() => {
      // Autoplay may be blocked; the large microphone buttons remain available.
    });
  };
  playAt(0);
}

function playMissionNarration(mission: Mission, hintOnly = false, enabled = true) {
  const hintFile = resourcePath(`/audio/hint-${mission.voiceKey}.wav`);
  playNarrationFiles(hintOnly ? [hintFile] : [resourcePath(`/audio/${mission.id}.wav`), hintFile], enabled);
}

function newPart(def: PartDef, index: number): Part {
  return {
    ...def,
    uid: `${def.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    x: 330 + (index % 4) * 35,
    y: 210 + (index % 3) * 28,
    rotate: 0,
    scale: 1,
    flip: false,
    z: Date.now(),
  };
}

type AssemblyAnchor = { x: number; y: number; size: number };

type TransportMode = "ground" | "hover" | "air";

const ROUND_MOVES = new Set(["wheel", "orangewheel", "bluewheel", "redwheel", "smallwheel", "farmwheel", "citywheel", "fantasywheel", "rollerwheel", "paddlewheel"]);
const WIDE_MOVES = new Set(["track", "miningtrack", "snowtrack", "greentrack", "ski", "hover", "hovercraftskirt"]);
const AIR_MOVES = new Set(["wing", "paraglider", "propeller"]);
const BOOM_TOOLS = new Set(["shovel", "crane", "liftplatform", "conveyor", "wreckingball"]);
const DECK_TOOLS = new Set(["mixer", "hose"]);
const REAR_TOOLS = new Set(["tow", "plow"]);
function getTransportMode(input: Part[]): TransportMode {
  if (input.some((part) => AIR_MOVES.has(part.id) || ["airframe", "gliderframe"].includes(part.id))) return "air";
  if (input.some((part) => ["hoverframe", "hoverbody", "hovercab", "hovercraftskirt"].includes(part.id))) return "hover";
  return "ground";
}

function movementBottomRatio(id: string) {
  if (id === "hovercraftskirt") return .72;
  return .949;
}

function toolMountKind(id: string) {
  if (BOOM_TOOLS.has(id)) return "boom";
  if (DECK_TOOLS.has(id)) return "deck";
  if (REAR_TOOLS.has(id)) return "rear";
  return "front";
}

function assembleParts(input: Part[], width = 900, height = 600, anchor?: AssemblyAnchor): Part[] {
  const newestToolAtStation = new Map<string, string>();
  input.forEach((part) => {
    if (part.category === "tool") newestToolAtStation.set(toolMountKind(part.id), part.uid);
  });
  input = input.filter((part) => part.category !== "tool" || newestToolAtStation.get(toolMountKind(part.id)) === part.uid);
  const defaultSize = Math.max(210, Math.min(320, width * .38, height * .52));
  const currentRoot = input.find((p) => p.category === "chassis");
  const hasPlacedRoot = Boolean(currentRoot && currentRoot.w >= 190 && Math.abs(currentRoot.w - currentRoot.h) < 4);
  const rootSize = anchor?.size || (hasPlacedRoot ? currentRoot!.w : defaultSize);
  const rootX = anchor?.x ?? (hasPlacedRoot ? currentRoot!.x : Math.max(35, width * .43 - rootSize / 2));
  const rootY = anchor?.y ?? (hasPlacedRoot ? currentRoot!.y : Math.max(25, height * .78 - rootSize * .84));
  const deckY = rootY + rootSize * .56;
  const groundY = rootY + rootSize * .84;
  const transportMode = getTransportMode(input);
  const counts: Partial<Record<Category, number>> = {};
  const wheelCount = Math.max(1, input.filter((p) => p.category === "move" && ROUND_MOVES.has(p.id)).length);
  let wheelNo = 0;
  let wideMoveNo = 0;
  return input.map((part) => {
    const n = counts[part.category] || 0;
    counts[part.category] = n + 1;
    let x = rootX;
    let y = rootY;
    const rotate = 0;
    let size = rootSize;
    let flip = false;
    let layer = part.category === "chassis" ? 20 : part.category === "body" ? 30 : part.category === "move" ? 40 : part.category === "tool" ? 50 : part.category === "cab" ? 60 : part.category === "help" ? 70 : 80;
    if (part.category === "chassis") {
      x = rootX;
      y = rootY;
    } else if (part.category === "body") {
      size = rootSize * (transportMode === "ground" ? .76 : .74);
      x = rootX + rootSize * (transportMode === "ground" ? .02 : .06);
      y = transportMode === "ground" ? deckY - size * .859 : rootY + rootSize * .14;
    } else if (part.category === "move") {
      if (part.id === "wing") {
        size = rootSize * 1.02;
        x = rootX - rootSize * .01;
        y = rootY + rootSize * .02;
        layer = 24;
      } else if (part.id === "paraglider") {
        size = rootSize * 1.16;
        x = rootX - rootSize * .08;
        y = rootY - rootSize * .68;
        layer = 26;
      } else if (part.id === "propeller") {
        size = rootSize * .36;
        x = rootX + rootSize * .8;
        y = rootY + rootSize * .36;
        layer = 58;
      } else if (WIDE_MOVES.has(part.id)) {
        size = rootSize * .9;
        x = rootX + (rootSize - size) / 2 + wideMoveNo * 8;
        y = groundY - size * movementBottomRatio(part.id) + wideMoveNo * 5;
        layer = 25 + wideMoveNo;
        wideMoveNo += 1;
      } else if (ROUND_MOVES.has(part.id)) {
        size = rootSize * (wheelCount >= 4 ? .25 : wheelCount === 3 ? .29 : wheelCount === 2 ? .34 : .36);
        const ratio = wheelCount === 1 ? .5 : .16 + wheelNo * (.68 / (wheelCount - 1));
        const wheelCenter = rootX + rootSize * ratio;
        x = wheelCenter - size / 2;
        y = groundY - size * movementBottomRatio(part.id);
        layer = 55;
        wheelNo += 1;
      }
    } else if (part.category === "cab") {
      size = rootSize * (transportMode === "air" ? .44 : .58);
      x = rootX + rootSize * (transportMode === "air" ? .54 : .42);
      y = transportMode === "air" ? rootY + rootSize * .25 : deckY - size * .941;
    } else if (part.category === "tool") {
      const mount = toolMountKind(part.id);
      if (mount === "rear") {
        size = rootSize * .6;
        x = rootX - rootSize * .4;
        y = deckY - size * .54;
        flip = true;
      } else if (mount === "boom") {
        size = rootSize * (part.id === "shovel" ? .82 : part.id === "crane" ? .78 : .72);
        x = rootX + rootSize * (part.id === "shovel" ? .27 : part.id === "crane" ? .05 : .12);
        y = deckY - size * .53;
        layer = 48;
      } else if (mount === "deck") {
        size = rootSize * .56;
        x = rootX + rootSize * .12;
        y = deckY - size * .86;
        layer = 46;
      } else {
        size = rootSize * .64;
        x = rootX + rootSize * .72;
        y = deckY - size * .54;
      }
    } else if (part.category === "help") {
      if (["engine", "battery"].includes(part.id)) {
        size = rootSize * .28;
        x = rootX + rootSize * (.08 + (n % 2) * .28);
        y = rootY + rootSize * .3;
      } else if (["suspension", "step"].includes(part.id)) {
        size = rootSize * .22;
        x = rootX + rootSize * .36;
        y = rootY + rootSize * .53;
      } else if (["lamp", "siren"].includes(part.id)) {
        size = rootSize * .17;
        x = rootX + rootSize * (.66 + (n % 2) * .16);
        y = rootY + rootSize * .1;
      } else if (part.id === "bridge") {
        size = rootSize * .46;
        x = rootX + rootSize * .2;
        y = rootY - rootSize * .04;
      } else {
        size = rootSize * .25;
        x = rootX + rootSize * (.12 + (n % 3) * .22);
        y = rootY + rootSize * .28;
      }
    } else {
      if (part.id === "flag") {
        size = rootSize * .22;
        x = rootX + rootSize * .79;
        y = rootY + rootSize * .06;
      } else if (part.id === "pipe") {
        size = rootSize * .19;
        x = rootX + rootSize * .04;
        y = rootY + rootSize * .23;
      } else {
        size = rootSize * .17;
        x = rootX + rootSize * (.22 + (n % 2) * .28);
        y = rootY + rootSize * .34;
      }
    }
    return { ...part, x, y, w: size, h: size, rotate, flip, scale: 1, z: layer + n };
  });
}

function preparePerformanceBuild(input: Part[], _action: string): Part[] {
  if (!input.length) return [];

  // Departure is a presentation of the child's build, not a second auto-assembly.
  // Fit the complete rotated composition into the stage while preserving every
  // authored position, size, rotation, flip and layer relationship.
  const bounds = input.map((part) => {
    const width = part.w * part.scale;
    const height = part.h * part.scale;
    const centerX = part.x + width / 2;
    const centerY = part.y + height / 2;
    const radians = part.rotate * Math.PI / 180;
    const rotatedWidth = Math.abs(Math.cos(radians)) * width + Math.abs(Math.sin(radians)) * height;
    const rotatedHeight = Math.abs(Math.sin(radians)) * width + Math.abs(Math.cos(radians)) * height;
    return {
      centerX,
      centerY,
      minX: centerX - rotatedWidth / 2,
      maxX: centerX + rotatedWidth / 2,
      minY: centerY - rotatedHeight / 2,
      maxY: centerY + rotatedHeight / 2,
    };
  });
  const minX = Math.min(...bounds.map((box) => box.minX));
  const maxX = Math.max(...bounds.map((box) => box.maxX));
  const minY = Math.min(...bounds.map((box) => box.minY));
  const maxY = Math.max(...bounds.map((box) => box.maxY));
  const padding = 9;
  const availableWidth = 430 - padding * 2;
  const availableHeight = 218 - padding * 2;
  const fit = Math.min(availableWidth / Math.max(1, maxX - minX), availableHeight / Math.max(1, maxY - minY), 1.15);

  return input.map((part, index) => {
    const box = bounds[index];
    const displayedWidth = part.w * part.scale * fit;
    const displayedHeight = part.h * part.scale * fit;
    return {
      ...part,
      x: padding + (box.centerX - minX) * fit - displayedWidth / 2,
      y: padding + (box.centerY - minY) * fit - displayedHeight / 2,
      w: part.w * fit,
      h: part.h * fit,
    };
  });
}

export default function Home() {
  const [screen, setScreen] = useState<"home" | "mission" | "build" | "performance" | "garage">("home");
  const [save, setSave] = useState<SaveData>(DEFAULT_SAVE);
  const [saveReady, setSaveReady] = useState(false);
  const [mission, setMission] = useState<Mission | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("chassis");
  const [paint, setPaint] = useState<Paint>(DEFAULT_PAINT);
  const [snap, setSnap] = useState(true);
  const [moveWhole, setMoveWhole] = useState(false);
  const [mode, setMode] = useState<"mission" | "free">("mission");
  const [history, setHistory] = useState<Part[][]>([]);
  const [future, setFuture] = useState<Part[][]>([]);
  const [result, setResult] = useState<null | { ok: boolean; missing: string[]; reason?: string }>(null);
  const [performanceRun, setPerformanceRun] = useState(0);
  const [showPaint, setShowPaint] = useState(false);
  const [showParent, setShowParent] = useState(false);
  const [voice] = useState(true);
  const [toast, setToast] = useState("");
  const [tutorial, setTutorial] = useState(0);
  const [garageDeleteId, setGarageDeleteId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ uid: string; dx: number; dy: number; group: boolean; lastX: number; lastY: number } | null>(null);
  const parentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      setSave(safeLoad());
      setSaveReady(true);
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (!saveReady) return;
    try {
      localStorage.setItem("buildyard-save-v1", JSON.stringify(save));
    } catch { /* local play still works */ }
  }, [save, saveReady]);

  const unlockedThemes = THEMES.slice(0, save.unlocked);
  const availableMissions = MISSIONS.filter((item) => unlockedThemes.some((theme) => theme.name === item.theme));
  const selectedPart = parts.find((p) => p.uid === selected);
  const assemblyRoot = parts.find((p) => p.category === "chassis");
  const stickerHostUid = [...parts].filter((part) => part.category === "body").sort((a, b) => b.z - a.z)[0]?.uid;
  const garageDeleteCar = save.garage.find((car) => car.id === garageDeleteId);
  const performanceAction = mission?.needs[0] || [...parts].reverse().find((p) => p.category === "tool")?.tags[0] || "drive";
  const performanceParts = useMemo(() => preparePerformanceBuild(parts, performanceAction), [parts, performanceAction]);
  const performanceMode = getTransportMode(performanceParts);
  const performanceScale = 1;
  const performanceVariant = performanceParts.some((part) => part.id === "paraglider") ? "glider" : performanceMode;

  const showResult = (next: { ok: boolean; missing: string[]; reason?: string }) => {
    setPerformanceRun((run) => run + 1);
    setResult(next);
    setScreen("performance");
  };

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-24), parts.map((p) => ({ ...p }))]);
    setFuture([]);
  }, [parts]);

  const pickMission = () => {
    const pool = availableMissions;
    const fresh = pool.filter((m) => !save.recent.includes(m.id) && !save.completed.includes(m.id));
    const candidates = fresh.length ? fresh : pool.filter((m) => !save.recent.includes(m.id));
    const differentTheme = candidates.filter((item) => item.theme !== mission?.theme);
    const drawPool = differentTheme.length ? differentTheme : (candidates.length ? candidates : pool);
    const chosen = drawPool[Math.floor(Math.random() * drawPool.length)];
    if (!chosen) return;
    setMission(chosen);
    setSave((s) => ({ ...s, recent: [...s.recent.slice(-9), chosen.id] }));
    setScreen("mission");
    setTimeout(() => playMissionNarration(chosen, false, voice), 250);
  };

  const startBuild = (kind: "mission" | "free") => {
    setMode(kind);
    setParts([]);
    setSelected(null);
    setCategory("chassis");
    setPaint(DEFAULT_PAINT);
    setHistory([]);
    setFuture([]);
    setResult(null);
    setShowPaint(false);
    setMoveWhole(false);
    setScreen("build");
    if (!save.tutorialSeen) setTutorial(1);
  };

  const addPart = (def: PartDef) => {
    const alreadyOnVehicle = def.category === "tool" && parts.find((part) => part.id === def.id);
    if (alreadyOnVehicle) {
      setSelected(alreadyOnVehicle.uid);
      setToast("这个工具已经装好啦，需要两个可以点“复制”");
      setTimeout(() => setToast(""), 1700);
      return;
    }
    const mountedAtStation = def.category === "tool"
      ? parts.find((part) => part.category === "tool" && toolMountKind(part.id) === toolMountKind(def.id))
      : undefined;
    pushHistory();
    const rect = canvasRef.current?.getBoundingClientRect();
    const item = newPart(def, 0);
    setParts((current) => {
      const oldRoot = current.find((p) => p.category === "chassis");
      let compatible = [...current];
      if (def.category === "chassis") compatible = compatible.filter((p) => p.category !== "chassis");
      if (def.category === "body") compatible = compatible.filter((p) => p.category !== "body");
      if (def.category === "cab") compatible = compatible.filter((p) => p.category !== "cab");
      if (mountedAtStation) compatible = compatible.filter((p) => p.uid !== mountedAtStation.uid);
      const needsFrame = def.category !== "chassis" && !compatible.some((p) => p.category === "chassis");
      const frame = needsFrame ? newPart(PARTS.find((p) => p.id === "frame")!, compatible.length) : null;
      const next = [...compatible, ...(frame ? [frame] : []), item];
      const rootAnchor = oldRoot ? { x: oldRoot.x, y: oldRoot.y, size: oldRoot.w } : undefined;
      const arranged = assembleParts(next, rect?.width, rect?.height, rootAnchor);
      const existing = new Map(compatible.map((p) => [p.uid, p]));
      const suggested = new Map(arranged.map((p) => [p.uid, p]));

      // Adding a module must never reassemble work the child has already placed.
      // Use auto-layout only to suggest positions for the genuinely new part (and
      // an automatically supplied frame); every existing instance stays verbatim.
      return next.map((part) => existing.get(part.uid) || suggested.get(part.uid) || part);
    });
    setSelected(item.uid);
    if (mountedAtStation) {
      setToast("这个作业位换上新工具啦！");
      setTimeout(() => setToast(""), 1600);
    }
    if (tutorial === 1) setTutorial(2);
  };

  const autoAssemble = () => {
    if (!parts.length) return;
    pushHistory();
    const rect = canvasRef.current?.getBoundingClientRect();
    const root = parts.find((p) => p.category === "chassis");
    setParts(assembleParts(parts, rect?.width, rect?.height, root ? { x: root.x, y: root.y, size: root.w } : undefined));
    setSelected(null);
    setToast("咔嗒！零件连接好啦");
    setTimeout(() => setToast(""), 1600);
  };

  const updateSelected = (patch: Partial<Part>) => {
    if (!selected) return;
    pushHistory();
    setParts((all) => all.map((p) => p.uid === selected ? { ...p, ...patch } : p));
  };

  const deleteSelected = () => {
    if (!selected) return;
    pushHistory();
    setParts((all) => all.filter((p) => p.uid !== selected));
    setSelected(null);
  };

  const duplicateSelected = () => {
    if (!selectedPart) return;
    pushHistory();
    const copy = { ...selectedPart, uid: `${selectedPart.id}-${Date.now()}-copy`, x: selectedPart.x + 24, y: selectedPart.y + 24, z: Math.max(...parts.map((p) => p.z)) + 1 };
    setParts((all) => [...all, copy]);
    setSelected(copy.uid);
  };

  const undo = () => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setFuture((f) => [parts, ...f]);
    setParts(previous);
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
  };
  const redo = () => {
    if (!future.length) return;
    setHistory((h) => [...h, parts]);
    setParts(future[0]);
    setFuture((f) => f.slice(1));
    setSelected(null);
  };

  const onPointerDown = (e: React.PointerEvent, part: Part) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return;
    setSelected(part.uid);
    pushHistory();
    dragging.current = {
      uid: part.uid,
      dx: e.clientX - box.left - part.x,
      dy: e.clientY - box.top - part.y,
      group: moveWhole,
      lastX: e.clientX - box.left,
      lastY: e.clientY - box.top,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !canvasRef.current) return;
    const box = canvasRef.current.getBoundingClientRect();
    const pointerX = e.clientX - box.left;
    const pointerY = e.clientY - box.top;
    if (dragging.current.group) {
      let deltaX = pointerX - dragging.current.lastX;
      let deltaY = pointerY - dragging.current.lastY;
      const minX = Math.min(...parts.map((p) => p.x));
      const minY = Math.min(...parts.map((p) => p.y));
      const maxX = Math.max(...parts.map((p) => p.x + p.w * p.scale));
      const maxY = Math.max(...parts.map((p) => p.y + p.h * p.scale));
      deltaX = Math.max(-minX - 30, Math.min(box.width - maxX + 30, deltaX));
      deltaY = Math.max(-minY - 30, Math.min(box.height - maxY + 30, deltaY));
      setParts((all) => all.map((p) => ({ ...p, x: p.x + deltaX, y: p.y + deltaY })));
      dragging.current.lastX = pointerX;
      dragging.current.lastY = pointerY;
      return;
    }
    let x = pointerX - dragging.current.dx;
    let y = pointerY - dragging.current.dy;
    if (snap) {
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
    }
    const uid = dragging.current.uid;
    setParts((all) => all.map((p) => p.uid === uid ? {
      ...p,
      x: Math.max(-20, Math.min(box.width - p.w * p.scale + 20, x)),
      y: Math.max(-20, Math.min(box.height - p.h * p.scale + 20, y)),
    } : p));
  };
  const onPointerUp = () => {
    dragging.current = null;
    if (tutorial === 2) setTutorial(3);
  };

  const evaluate = () => {
    if (mode === "free") {
      if (!parts.length) {
        setToast("先从仓库挑一个零件，再让作品出发吧！");
        setTimeout(() => setToast(""), 1800);
        return;
      }
      showResult({ ok: true, missing: [] });
      return;
    }
    const tags = new Set(parts.flatMap((p) => p.tags));
    const functionTags = new Set(parts.filter((p) => ["body", "move", "tool", "help"].includes(p.category)).flatMap((p) => p.tags));
    const missing = (mission?.needs || []).filter((n) => !functionTags.has(n));
    if (!tags.has("chassis")) return showResult({ ok: false, missing, reason: "先装一副底盘，车身、轮子和工具才有牢固的安装位置。" });
    if (!tags.has("body")) return showResult({ ok: false, missing, reason: "还需要一个结实的车身，让零件们有地方坐好。" });
    if (!tags.has("move")) return showResult({ ok: false, missing, reason: "车车还没有会走路的轮子或履带呢！" });
    if (!tags.has("cab")) return showResult({ ok: false, missing, reason: "装上一间驾驶室，工程师才能安全地开车。" });
    if (missing.length) return showResult({ ok: false, missing, reason: mission?.hint });
    const root = parts.find((p) => p.category === "chassis")!;
    const rootCenter = { x: root.x + root.w / 2, y: root.y + root.h / 2 };
    const connected = parts.filter((p) => p.uid !== root.uid && (p.category === "move" || p.tags.some((t) => mission?.needs.includes(t))))
      .every((p) => Math.hypot(p.x + p.w / 2 - rootCenter.x, p.y + p.h / 2 - rootCenter.y) < root.w * 1.65);
    if (!connected) return showResult({ ok: false, missing, reason: "有零件离车身太远啦，点一下“自动拼好”，让连接座咔嗒扣上。" });
    showResult({ ok: true, missing: [] });
    const wasNew = mission && !save.completed.includes(mission.id);
    if (mission) {
      setSave((s) => {
        const completed = s.completed.includes(mission.id) ? s.completed : [...s.completed, mission.id];
        const nextUnlock = Math.min(THEMES.length, Math.max(s.unlocked, 3 + Math.floor(completed.length / 4)));
        return { ...s, completed, unlocked: nextUnlock, stars: s.stars + (wasNew ? 3 : 1) };
      });
    }
  };

  const saveCar = () => {
    if (!parts.length) return;
    const entry = {
      id: `car-${Date.now()}`,
      name: mission ? `${mission.title}号` : `创意工程车 ${save.garage.length + 1}`,
      date: new Date().toLocaleDateString("zh-CN"),
      parts,
      paint,
    };
    setSave((s) => ({ ...s, garage: [entry, ...s.garage].slice(0, 30) }));
    setToast("工程车收藏好啦！");
    setTimeout(() => setToast(""), 1800);
  };

  const deleteGarageCar = (id: string) => {
    setSave((s) => ({ ...s, garage: s.garage.filter((car) => car.id !== id) }));
    setGarageDeleteId(null);
  };

  const dragSticker = (event: React.PointerEvent<HTMLElement>) => {
    if (!paint.sticker) return;
    event.preventDefault();
    event.stopPropagation();
    const sticker = event.currentTarget;
    const host = sticker.closest(".part") as HTMLElement | null;
    if (!host) return;
    const stickerRect = sticker.getBoundingClientRect();
    const grabOffsetX = event.clientX - (stickerRect.left + stickerRect.width / 2);
    const grabOffsetY = event.clientY - (stickerRect.top + stickerRect.height / 2);
    sticker.setPointerCapture(event.pointerId);
    sticker.classList.add("is-dragging");

    const move = (pointer: PointerEvent) => {
      const hostRect = host.getBoundingClientRect();
      const x = Math.max(12, Math.min(88, ((pointer.clientX - grabOffsetX - hostRect.left) / hostRect.width) * 100));
      const y = Math.max(14, Math.min(86, ((pointer.clientY - grabOffsetY - hostRect.top) / hostRect.height) * 100));
      setPaint((current) => ({ ...current, stickerX: x, stickerY: y }));
    };
    const finish = (pointer: PointerEvent) => {
      sticker.classList.remove("is-dragging");
      if (sticker.hasPointerCapture(pointer.pointerId)) sticker.releasePointerCapture(pointer.pointerId);
      sticker.removeEventListener("pointermove", move);
      sticker.removeEventListener("pointerup", finish);
      sticker.removeEventListener("pointercancel", finish);
    };
    sticker.addEventListener("pointermove", move);
    sticker.addEventListener("pointerup", finish);
    sticker.addEventListener("pointercancel", finish);
  };

  const resetProgress = () => {
    if (!confirm("要清空所有星星、解锁和收藏的工程车吗？")) return;
    setSave(DEFAULT_SAVE);
    setShowParent(false);
    setScreen("home");
  };

  const exportCar = () => {
    const node = canvasRef.current;
    if (!node) return;
    const summary = `我的工程车：${parts.map((p) => p.name).join("、") || "还没有零件"}`;
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "我的工程车.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const wheel = (e: React.WheelEvent) => {
    if (!selectedPart) return;
    e.preventDefault();
    setParts((all) => all.map((p) => p.uid === selected ? { ...p, scale: Math.max(.55, Math.min(1.55, p.scale - e.deltaY * .001)) } : p));
  };

  const buildPreview = (carParts: Part[], carPaint: Paint, small = false, previewScale?: number) => {
    if (!carParts.length) return <div className="empty-car">🚧</div>;
    const minX = Math.min(...carParts.map((p) => p.x));
    const minY = Math.min(...carParts.map((p) => p.y));
    const scale = previewScale ?? (small ? .27 : 1);
    const previewStickerHost = [...carParts].filter((part) => part.category === "body").sort((a, b) => b.z - a.z)[0]?.uid;
    return carParts.map((p) => (
      <div key={p.uid} className={`part part-${p.category} part-id-${p.id} ${hasPartArt(p.id) ? "with-art" : ""}`} style={{
        left: (p.x - minX) * scale + (small ? 12 : 0),
        top: (p.y - minY) * scale + (small ? 15 : 0),
        width: p.w * p.scale * scale,
        height: p.h * p.scale * scale,
        transform: `rotate(${p.rotate}deg) scaleX(${p.flip ? -1 : 1})`,
        zIndex: p.z,
        "--part-color": resolvedPartColor(p, carPaint),
        "--part-accent": carPaint.secondary,
      } as React.CSSProperties}><span className="part-motion">{p.category === "tool" && <span className={`tool-adapter mount-${toolMountKind(p.id)}`}/>} {hasPartArt(p.id) ? <PartArtwork part={p} paint={carPaint}/> : p.icon}</span>{p.uid === previewStickerHost && <SafetySticker value={carPaint.sticker} x={carPaint.stickerX} y={carPaint.stickerY}/>}</div>
    ));
  };

  if (screen === "home") return (
    <main className="home-shell">
      <div className="sky-decor cloud c1">☁</div><div className="sky-decor cloud c2">☁</div>
      <div className="sun">☀</div>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">🔩</span><div><b>工程车创造营</b><small>BUILD & GO!</small></div></div>
        <div className="top-actions"><span className="voice-status">🎙️ 只用真人感配音</span><span className="star-count">⭐ {save.stars}</span></div>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">今天也有新任务！</span>
          <h1>小小工程师，<br/><em>开工啦！</em></h1>
          <p>挑零件、拼车车、换颜色，<br/>开着独一无二的工程车去帮忙。</p>
          <button className="primary giant" onClick={pickMission}><span>🎲</span><b>开始随机任务</b><i>{availableMissions.length} 个可选故事</i></button>
          <button className="secondary giant" onClick={() => { setMission(null); startBuild("free"); }}><span>🧰</span><b>自由创造</b><i>随便拼</i></button>
        </div>
        <div className="hero-machine" aria-label="卡通工程车">
          <div className="machine-arm">⌝</div><div className="machine-cab">◕‿◕</div>
          <div className="machine-body">创造号</div><div className="machine-wheel w1">⚙</div><div className="machine-wheel w2">⚙</div>
        </div>
      </section>
      <section className="home-bottom">
        <button className="garage-card" onClick={() => setScreen("garage")}>
          <span className="garage-icon">🏠</span><span><b>我的车库</b><small>收藏了 {save.garage.length} 辆车</small></span><i>›</i>
        </button>
        <div className="themes-strip"><b>已探索</b>{THEMES.map((t, i) => <span key={t.name} className={i < save.unlocked ? "" : "locked"} title={t.name}>{i < save.unlocked ? t.icon : "🔒"}</span>)}</div>
        <button className="parent-link" onPointerDown={() => { parentTimer.current = setTimeout(() => setShowParent(true), 900); }} onPointerUp={() => parentTimer.current && clearTimeout(parentTimer.current)} onPointerLeave={() => parentTimer.current && clearTimeout(parentTimer.current)}>家长长按进入</button>
      </section>
      {showParent && <div className="modal-shade"><div className="parent-panel"><button className="close" onClick={() => setShowParent(false)}>×</button><h2>家长设置</h2><p>游戏只在这台设备保存数据，不收集孩子的信息。</p><div className="setting"><span>🎙️ 系统机械朗读已永久关闭，仅接收真人感配音。</span></div><div className="parent-stats"><span><b>{save.completed.length}</b>完成任务</span><span><b>{save.garage.length}</b>收藏作品</span><span><b>{save.unlocked}</b>解锁主题</span></div><button className="danger" onClick={resetProgress}>重置全部进度</button></div></div>}
    </main>
  );

  if (screen === "mission" && mission) {
    const theme = THEMES.find((t) => t.name === mission.theme)!;
    return <main className="story-screen" style={{ "--theme": theme.color } as React.CSSProperties}>
      <header className="simple-header"><button onClick={() => setScreen("home")}>‹ 回家</button><span>随机任务 · 当前可选 {availableMissions.length} / 共 {MISSIONS.length} 个故事</span><span className="star-count">⭐ {save.stars}</span></header>
      <section className="story-card">
        <div className="story-scene"><span className="scene-icon">{theme.icon}</span><div className="character">{mission.icon}</div><div className="help-bubble">帮帮忙！</div></div>
        <div className="story-copy"><span className="theme-pill">{theme.icon} {mission.theme}</span><h1>{mission.title}</h1><p>{mission.story}</p><div className="speaker"><span>{mission.icon}</span><div><b>{mission.character}</b><small>故事播完后，会接着说一句简短提示</small></div><button onClick={() => playMissionNarration(mission, false, true)}>🎙️ 听故事和提示</button></div>
          <section className="mission-brief" aria-label="任务说明">
            <div className="mission-objective"><span>🎯</span><div><small>这次要做什么</small><b>{mission.objective}</b></div></div>
            <ol>{mission.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
            <div className="mission-success"><span>🏁</span><div><small>完成时会看到</small><b>{mission.success}</b></div></div>
          </section>
          <div className="mission-hint"><span>💡</span><div><small>选零件提示</small><b>{mission.hint}</b><em>{mission.voiceHint}</em></div><button className="hint-voice-button" onClick={() => playMissionNarration(mission, true, true)}>▶ 只听提示</button></div>
          <button className="primary story-start" onClick={() => startBuild("mission")}>去仓库造车 <span>→</span></button>
          <button className="text-btn" onClick={pickMission}>🎲 换一个没看过的故事（最近 10 个不重复）</button>
        </div>
      </section>
    </main>;
  }

  if (screen === "performance" && result) {
    const theme = THEMES.find((item) => item.name === mission?.theme) || THEMES[0];
    const stageName = mission ? THEME_STAGE[mission.theme] || "construction" : "test-track";
    const isMissionSuccess = result.ok && mode === "mission" && mission;
    return <main className={`performance-screen stage-${stageName} ${result.ok ? "performance-success" : "performance-needs-help"}`} style={{ "--theme": theme.color } as React.CSSProperties}>
      <header className="performance-header">
        <button onClick={() => { setResult(null); setScreen("build"); }}>‹ 返回拼装</button>
        <div><small>{mission ? `${theme.icon} ${mission.theme}` : "🛞 创意试车场"}</small><b>{mission?.title || "我的工程车试车"}</b></div>
        <span className="performance-status">{result.ok ? "任务演出" : "检查时间"}</span>
      </header>

      <section key={performanceRun} className={`theatre-stage mode-${performanceMode} variant-${performanceVariant} action-${performanceAction} ${result.ok ? "is-playing" : "is-paused"}`} aria-label="任务动画舞台">
        <div className="theatre-sky"><i/><i/><i/></div>
        <div className="theatre-landmarks" aria-hidden="true"><span/><span/><span/></div>
        <div className="theatre-story-board">
          <span>{mission?.icon || "🤩"}</span>
          <div><small>现场任务</small><b>{mission?.objective || "让你的创意工程车完成一次试运行。"}</b></div>
        </div>
        <div className="theatre-ground"><i/><i/><i/><i/></div>

        <div className="theatre-work-zone">
          <div className="theatre-target theatre-before"><small>作业前</small><b>{mission?.targetBefore || "🏁"}</b></div>
          <div className="theatre-action-burst"><span>{ACTION_EFFECT[performanceAction]?.scene || "✨"}</span><i>✦</i><i>✦</i><i>✦</i></div>
          <div className="theatre-target theatre-after"><small>作业完成</small><b>{mission?.targetAfter || "🏁✅"}</b></div>
        </div>

        <div className="performance-route theatre-route"><div className="result-vehicle-art">{buildPreview(performanceParts, paint, false, performanceScale)}</div></div>
        <div className="theatre-character"><span>{result.ok ? mission?.icon || "🤩" : "🐣"}</span><b>{result.ok ? "太棒啦！" : "我们再检查一下"}</b></div>

        {result.ok ? <div className="theatre-captions" aria-live="polite">
          <span>① 到达现场</span><span>② 停稳并开始作业</span><span>③ {mission?.success || "顺利完成试车"}</span>
        </div> : <div className="theatre-check-card"><span>🧰</span><div><small>这次没有扣分</small><b>{result.reason}</b><p>回到原来的作品继续修改，位置和涂装都会保留。</p></div></div>}
      </section>

      <footer className="performance-footer">
        <div>
          <span className="result-label">{result.ok ? (mode === "free" ? "试车完成" : "故事任务完成") : "还差一个小帮手"}</span>
          <h1>{result.ok ? (mission ? `${mission.character}看到工作真的完成啦！` : "这辆创意工程车跑起来啦！") : "车车停稳，等你回去调整"}</h1>
          <p>{result.ok ? (mission?.success || "所有零件一起完成了试运行。") : result.reason}</p>
          {isMissionSuccess && <div className="reward">获得贴纸 <b>{mission.reward}</b> ＋ ⭐⭐⭐</div>}
        </div>
        <div className="performance-buttons">
          {!result.ok ? <button className="primary" onClick={() => { setResult(null); setScreen("build"); }}>回仓库继续修改</button> : <>
            <button className="secondary replay-button" onClick={() => setPerformanceRun((run) => run + 1)}>↻ 再看一遍</button>
            <button className="secondary" onClick={saveCar}>♥ 收藏这辆车</button>
            <button className="primary" onClick={() => { saveCar(); setResult(null); mode === "mission" ? pickMission() : setScreen("home"); }}>{mode === "mission" ? "下一个故事" : "回到首页"}</button>
          </>}
        </div>
      </footer>
      {toast && <div className="toast">{toast}</div>}
    </main>;
  }

  if (screen === "garage") return <main className="garage-screen">
    <header className="simple-header"><button onClick={() => setScreen("home")}>‹ 回家</button><span>我的工程车库</span><span className="star-count">⭐ {save.stars}</span></header>
    <div className="garage-title"><div><span>🏠</span><h1>我的车车收藏</h1><p>每一辆都是独一无二的作品！</p></div><button className="primary" onClick={() => { setMission(null); startBuild("free"); }}>＋ 再造一辆</button></div>
    <section className="garage-grid">
      {save.garage.length ? save.garage.map((car) => <article key={car.id} className="car-card" onClick={() => { setParts(assembleParts(car.parts, 900, 600)); setPaint(car.paint); setMission(null); setMode("free"); setScreen("build"); }}>
        <button className="car-delete" aria-label={`删除 ${car.name}`} title="删除这辆车" onClick={(event) => { event.stopPropagation(); setGarageDeleteId(car.id); }}>🗑️<span>删除</span></button>
        <div className="car-thumb">{buildPreview(car.parts, car.paint, true)}</div><h3>{car.name}</h3><p>{car.parts.length} 个零件 · {car.date}</p>
      </article>) : <div className="empty-garage"><span>🚜</span><h2>车库还空空的</h2><p>去创造第一辆工程车吧！</p></div>}
    </section>
    {garageDeleteCar && <div className="modal-shade" onClick={() => setGarageDeleteId(null)}><div className="garage-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-car-title" onClick={(event) => event.stopPropagation()}>
      <span className="delete-car-icon">🗑️</span><h2 id="delete-car-title">把这辆车移出车库吗？</h2><p>“{garageDeleteCar.name}”会从这台设备的车库里删除。</p>
      <div className="garage-delete-actions"><button className="secondary" onClick={() => setGarageDeleteId(null)}>先留着</button><button className="garage-delete-confirm" onClick={() => deleteGarageCar(garageDeleteCar.id)}>确定删除</button></div>
    </div></div>}
  </main>;

  return <main className="build-screen">
    <header className="build-header">
      <button className="back-btn" aria-label="回到游戏首页" onClick={() => setScreen("home")}><span>⌂</span><small>回家</small></button>
      <div className="build-title"><small>{mode === "mission" ? `${mission?.icon} ${mission?.title}` : "🌈 想怎么拼都可以"}</small><b>{mode === "mission" ? "任务工程车" : "自由创造工坊"}</b></div>
      <div className="build-actions"><button onClick={undo} disabled={!history.length}>↶<small>上一步</small></button><button onClick={redo} disabled={!future.length}>↷<small>下一步</small></button><button onClick={() => setSnap(!snap)} className={snap ? "active" : ""}>🧲<small>靠近对齐</small></button><button onClick={() => { setMoveWhole(!moveWhole); setSelected(null); }} className={moveWhole ? "active whole-move" : "whole-move"}>🚚<small>搬整辆车</small></button><button onClick={autoAssemble}>🧩<small>排整齐</small></button><button onClick={() => setShowPaint(true)}>🎨<small>换颜色</small></button></div>
      <button className="go-btn" onClick={evaluate}>开工！<span>▶</span></button>
    </header>
    <div className="work-area">
      <aside className="warehouse">
        <div className="warehouse-head"><span>🧰</span><div><b>选零件</b><small>先选一类，再点喜欢的零件</small></div></div>
        <div className="category-tabs">{(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => <button key={c} aria-label={`${CATEGORY_LABELS[c].label}：${CATEGORY_LABELS[c].tip}`} className={category === c ? "active" : ""} onClick={() => setCategory(c)}><span className="category-picture"><span className="part-art" style={spriteStyle(CATEGORY_LABELS[c].part)}/></span><b>{CATEGORY_LABELS[c].label}</b></button>)}</div>
        <div className="category-kid-tip"><span>👆</span><div><b>{CATEGORY_LABELS[category].label}</b><small>{CATEGORY_LABELS[category].tip}</small></div></div>
        <div className="parts-grid">{PARTS.filter((p) => p.category === category).map((p) => <button key={p.id} className="part-card" onClick={() => addPart(p)}>{["augerdrill", "wreckingball"].includes(p.id) && <small className="new-tool-badge">新工具</small>}<span className={`mini-part ${hasPartArt(p.id) ? "has-art" : `part-${p.category}`}`}>{hasPartArt(p.id) ? <span className="part-art" style={spriteStyle(p.id)}/> : p.icon}</span><b>{p.name}</b><i>＋</i></button>)}</div>
      </aside>
      <section className="canvas-wrap">
        <div className="canvas-info"><span>{moveWhole ? "🚚 现在拖一下，就能搬动整辆车" : "☝ 现在一次移动一个零件"}</span><span>已经放了 {parts.length} 个</span></div>
        <div className={`build-canvas pattern-${paint.pattern} finish-${paint.finish}`} ref={canvasRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={wheel}>
          {snap && assemblyRoot && <div aria-hidden="true" className="rig-guide" style={{ left: assemblyRoot.x, top: assemblyRoot.y, width: assemblyRoot.w * assemblyRoot.scale, height: assemblyRoot.h * assemblyRoot.scale }}>
            <span className="rig-guide-note">参考位置，也可以自己摆</span>
            <span className="rig-body-zone">车身放这里</span>
            <span className="rig-deck-line"><i>上面能放设备</i></span>
            <span className="rig-axle-line"><i>轮子贴近这条线</i></span>
            <span className="rig-cab-zone">车头放这里</span>
            <span className="rig-wheel-zone">轮子放这里</span>
            <span className="rig-front-tool-zone">前面工具</span>
            <span className="rig-rear-tool-zone">后面工具</span>
          </div>}
          <div className="horizon"><span>☁</span><span>☁</span></div><div className="ground-line"/>
          {!parts.length && <div className="canvas-empty"><span>👈</span><b>第 1 步：点一个“车底”</b><small>然后再选车身、车头和轮子</small></div>}
          {parts.map((p) => <div key={p.uid} data-part-id={p.id} data-category={p.category} onPointerDown={(e) => onPointerDown(e, p)} className={`part part-${p.category} part-id-${p.id} ${hasPartArt(p.id) ? "with-art" : ""} ${selected === p.uid ? "selected" : ""}`} style={{
            left: p.x, top: p.y, width: p.w * p.scale, height: p.h * p.scale,
            transform: `rotate(${p.rotate}deg) scaleX(${p.flip ? -1 : 1})`, zIndex: p.z,
            "--part-layer": p.z,
            "--part-color": resolvedPartColor(p, paint),
            "--part-accent": paint.secondary,
          } as React.CSSProperties}>{p.category === "tool" && <span className={`tool-adapter mount-${toolMountKind(p.id)}`}/>} {hasPartArt(p.id) ? <PartArtwork part={p} paint={paint} hit/> : <span>{p.icon}</span>}{p.uid === stickerHostUid && <SafetySticker value={paint.sticker} x={paint.stickerX} y={paint.stickerY} draggable onPointerDown={dragSticker}/>}</div>)}
          {selectedPart && !showPaint && !result && <div className="part-color-bar" aria-label="单个零件调色">
            <b>直接换色</b>
            {PART_TINTS.map((color) => <button key={color} aria-label={`改成 ${color}`} className={!selectedPart.originalColor && selectedPart.color === color ? "chosen color-dot" : "color-dot"} style={{ background: color }} onClick={() => updateSelected({ color, originalColor: false, colorMode: "custom" })}/>) }
            <button aria-label="恢复素材原色" title="恢复素材原色" className={selectedPart.originalColor ? "chosen original-paint" : "original-paint"} onClick={() => updateSelected({ originalColor: true, color: undefined, colorMode: undefined })}><span>✦</span><small>原色</small></button>
          </div>}
          {selectedPart && !showPaint && !result && <div className="selection-tools">
            <b>{selectedPart.name}</b>
            <button aria-label="左转" onClick={() => updateSelected({ rotate: selectedPart.rotate - 15 })}>↶<small>左转</small></button>
            <button aria-label="右转" onClick={() => updateSelected({ rotate: selectedPart.rotate + 15 })}>↷<small>右转</small></button>
            <button aria-label="缩小" onClick={() => updateSelected({ scale: Math.max(.45, selectedPart.scale - .1) })}>−<small>缩小</small></button>
            <button aria-label="放大" onClick={() => updateSelected({ scale: Math.min(1.8, selectedPart.scale + .1) })}>＋<small>放大</small></button>
            <button aria-label="翻面" onClick={() => updateSelected({ flip: !selectedPart.flip })}>⇆<small>翻面</small></button>
            <button aria-label="复制" onClick={duplicateSelected}>⧉<small>复制</small></button>
            <button aria-label="置前" onClick={() => updateSelected({ z: Math.max(...parts.map((p) => p.z)) + 1 })}>⇧<small>置前</small></button>
            <button aria-label="置后" onClick={() => updateSelected({ z: Math.min(...parts.map((p) => p.z)) - 1 })}>⇩<small>置后</small></button>
            <button aria-label="删除" className="trash" onClick={deleteSelected}>🗑<small>删除</small></button>
          </div>}
        </div>
      </section>
    </div>

    {showPaint && <div className="paint-drawer"><div className="drawer-head"><div><span>🎨</span><b>神奇涂装屋</b><small>给工程车换身新衣服</small></div><button onClick={() => setShowPaint(false)}>完成 ✓</button></div>
      <div className="paint-section"><b>车身颜色</b><div className="swatches">{["#ffc52f","#ff704b","#59c986","#45aaf2","#9b78e8","#ef71ae","#f5f1dd"].map((c, i) => <button key={c} aria-label={`车身颜色 ${i + 1}`} className={paint.primary === c ? "chosen" : ""} style={{ background: c }} onClick={() => setPaint({ ...paint, primary: c })}/>)}</div></div>
      <div className="paint-section"><b>搭配颜色</b><div className="swatches">{["#ff7b3e","#2e98d1","#754fbb","#68b33e","#f4e04d","#ffffff"].map((c, i) => <button key={c} aria-label={`搭配颜色 ${i + 1}`} className={paint.secondary === c ? "chosen" : ""} style={{ background: c }} onClick={() => setPaint({ ...paint, secondary: c })}/>)}</div></div>
      <div className="paint-section"><b>轮胎轮毂颜色</b><div className="swatches">{["#27313d","#ffd43b","#ff6b4a","#46aaf2","#8b6fe8","#f3f3ec"].map((c, i) => <button key={c} aria-label={`轮胎颜色 ${i + 1}`} className={paint.wheels === c ? "chosen" : ""} style={{ background: c }} onClick={() => setPaint({ ...paint, wheels: c })}/>)}</div></div>
      <div className="paint-section"><b>花纹</b><div className="option-row">{[["none","纯色"],["stripe","闪电"],["dots","圆点"]].map(([v,n]) => <button key={v} className={paint.pattern === v ? "chosen" : ""} onClick={() => setPaint({ ...paint, pattern: v })}>{v === "stripe" ? "⚡" : v === "dots" ? "●●" : "▰"}<small>{n}</small></button>)}</div></div>
      <div className="paint-section safety-paint-section"><b>安全警告装饰</b><small className="paint-help">选好后，直接按住车身上的标志拖动位置</small><div className="sticker-row safety-sticker-row">{SAFETY_STICKERS.map((sticker) => <button key={sticker.id || "none"} aria-label={sticker.label} title={sticker.label} className={paint.sticker === sticker.id ? "chosen" : ""} onClick={() => setPaint({ ...paint, sticker: sticker.id, stickerX: paint.stickerX ?? 58, stickerY: paint.stickerY ?? 52 })}><SafetyStickerIcon sticker={sticker}/><small>{sticker.label}</small></button>)}</div></div>
      <div className="paint-section"><b>特别效果</b><div className="option-row"><button className={paint.finish === "clean" ? "chosen" : ""} onClick={() => setPaint({ ...paint, finish: "clean" })}>✨<small>亮晶晶</small></button><button className={paint.finish === "mud" ? "chosen" : ""} onClick={() => setPaint({ ...paint, finish: "mud" })}>🟤<small>泥点勇士</small></button></div></div>
    </div>}

    {tutorial > 0 && <div className={`tutorial tip-${tutorial}`}><button onClick={() => { setTutorial(0); setSave((s) => ({ ...s, tutorialSeen: true })); }}>跳过</button><span>{tutorial === 1 ? "👈" : tutorial === 2 ? "☝️" : "🎨"}</span><b>{tutorial === 1 ? "先选一副喜欢的底盘" : tutorial === 2 ? "底盘、车身和车头会自动对齐，也都能单独拖动" : "继续加轮子和工具，然后换个漂亮颜色！"}</b>{tutorial === 3 && <button className="got-it" onClick={() => { setTutorial(0); setSave((s) => ({ ...s, tutorialSeen: true })); }}>知道啦！</button>}</div>}
    {toast && <div className="toast">{toast}</div>}
  </main>;
}

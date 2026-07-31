"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Category = "body" | "move" | "cab" | "tool" | "help" | "decor";
type PartDef = {
  id: string;
  name: string;
  icon: string;
  category: Category;
  tags: string[];
  w: number;
  h: number;
};
type Part = PartDef & {
  uid: string;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  flip: boolean;
  z: number;
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
  { id: "frame", name: "结实车架", icon: "▰", category: "body", tags: ["body"], w: 180, h: 58 },
  { id: "longframe", name: "长长底盘", icon: "▬", category: "body", tags: ["body", "carry"], w: 240, h: 52 },
  { id: "orangeframe", name: "灵活双轴车架", icon: "▰", category: "body", tags: ["body"], w: 210, h: 72 },
  { id: "heavyframe", name: "重型三轴车架", icon: "▰", category: "body", tags: ["body", "carry", "rough"], w: 245, h: 78 },
  { id: "tank", name: "圆圆水箱", icon: "◉", category: "body", tags: ["body", "water"], w: 150, h: 82 },
  { id: "bucketbody", name: "翻斗车厢", icon: "▱", category: "body", tags: ["body", "carry"], w: 165, h: 86 },
  { id: "cargo", name: "防滑货台", icon: "▰", category: "body", tags: ["body", "carry"], w: 178, h: 70 },
  { id: "wheel", name: "大轮胎", icon: "●", category: "move", tags: ["move"], w: 78, h: 78 },
  { id: "smallwheel", name: "小轮胎", icon: "●", category: "move", tags: ["move"], w: 58, h: 58 },
  { id: "track", name: "履带", icon: "⬭", category: "move", tags: ["move", "rough"], w: 180, h: 66 },
  { id: "snowtrack", name: "雪地履带", icon: "❄", category: "move", tags: ["move", "snow"], w: 170, h: 62 },
  { id: "cab", name: "驾驶室", icon: "▣", category: "cab", tags: ["cab"], w: 116, h: 112 },
  { id: "bubblecab", name: "泡泡驾驶舱", icon: "◒", category: "cab", tags: ["cab"], w: 126, h: 104 },
  { id: "lampcab", name: "探险驾驶室", icon: "▥", category: "cab", tags: ["cab", "light"], w: 122, h: 116 },
  { id: "engine", name: "轰隆动力机", icon: "⚙", category: "cab", tags: ["power"], w: 125, h: 105 },
  { id: "battery", name: "闪电电池箱", icon: "⚡", category: "cab", tags: ["power"], w: 122, h: 102 },
  { id: "suspension", name: "弹簧减震器", icon: "〽", category: "cab", tags: ["rough"], w: 118, h: 92 },
  { id: "shovel", name: "挖掘斗", icon: "⤵", category: "tool", tags: ["dig", "clear"], w: 130, h: 86 },
  { id: "blade", name: "推土铲", icon: "◢", category: "tool", tags: ["push", "clear", "snow"], w: 145, h: 76 },
  { id: "crane", name: "起重吊臂", icon: "⌝", category: "tool", tags: ["lift"], w: 150, h: 180 },
  { id: "fork", name: "叉车臂", icon: "乚", category: "tool", tags: ["lift", "carry"], w: 120, h: 108 },
  { id: "drill", name: "钻头", icon: "◆", category: "tool", tags: ["drill", "dig"], w: 125, h: 72 },
  { id: "roller", name: "压路滚筒", icon: "⬤", category: "tool", tags: ["roll"], w: 110, h: 110 },
  { id: "plow", name: "农田犁", icon: "≋", category: "tool", tags: ["farm", "dig"], w: 142, h: 76 },
  { id: "hose", name: "喷水炮", icon: "➹", category: "tool", tags: ["water", "fire"], w: 140, h: 76 },
  { id: "tow", name: "救援拖钩", icon: "⛓", category: "tool", tags: ["tow", "rescue"], w: 125, h: 64 },
  { id: "brush", name: "清扫刷", icon: "✺", category: "tool", tags: ["clean"], w: 112, h: 112 },
  { id: "snowblade", name: "弧形扫雪铲", icon: "❄", category: "tool", tags: ["snow", "push"], w: 148, h: 91 },
  { id: "grabber", name: "液压抓木爪", icon: "♆", category: "tool", tags: ["lift", "clear"], w: 128, h: 128 },
  { id: "mixer", name: "水泥搅拌筒", icon: "◒", category: "tool", tags: ["mix"], w: 148, h: 118 },
  { id: "hammer", name: "破碎锤", icon: "⇣", category: "tool", tags: ["drill", "clear"], w: 104, h: 142 },
  { id: "liftplatform", name: "高空作业篮", icon: "♜", category: "tool", tags: ["lift", "rescue"], w: 148, h: 158 },
  { id: "lamp", name: "亮亮探照灯", icon: "🔦", category: "help", tags: ["light", "rescue"], w: 86, h: 70 },
  { id: "siren", name: "安全警示灯", icon: "🚨", category: "help", tags: ["rescue", "fire"], w: 74, h: 62 },
  { id: "bridge", name: "折叠小桥", icon: "〰", category: "help", tags: ["bridge", "carry"], w: 176, h: 62 },
  { id: "balloon", name: "动力气球", icon: "🎈", category: "help", tags: ["lift"], w: 88, h: 118 },
  { id: "flag", name: "小旗子", icon: "🚩", category: "decor", tags: [], w: 65, h: 82 },
  { id: "star", name: "大星星", icon: "★", category: "decor", tags: [], w: 72, h: 72 },
  { id: "eyes", name: "笑脸眼睛", icon: "◕‿◕", category: "decor", tags: [], w: 108, h: 54 },
  { id: "pipe", name: "彩虹排气管", icon: "♨", category: "decor", tags: [], w: 70, h: 92 },
];

const SPRITES: Record<string, [0 | 1, number]> = {
  frame:[0,0], orangeframe:[0,1], heavyframe:[0,2], bubblecab:[0,3],
  cab:[0,4], lampcab:[0,5], wheel:[0,6], smallwheel:[0,7],
  track:[0,8], snowtrack:[0,9], tank:[0,10], bucketbody:[0,11],
  cargo:[0,12], engine:[0,13], battery:[0,14], suspension:[0,15],
  shovel:[1,0], blade:[1,1], crane:[1,2], fork:[1,3],
  drill:[1,4], roller:[1,5], plow:[1,6], hose:[1,7],
  tow:[1,8], brush:[1,9], snowblade:[1,10], grabber:[1,11],
  mixer:[1,12], hammer:[1,13], bridge:[1,14], liftplatform:[1,15],
  longframe:[0,1],
};

function spriteStyle(id: string): React.CSSProperties | undefined {
  const sprite = SPRITES[id];
  if (!sprite) return undefined;
  const index = sprite[1];
  const col = index % 4;
  const row = Math.floor(index / 4);
  return {
    backgroundImage: `url(/assets/${sprite[0] === 0 ? "vehicle-base-sheet.png" : "vehicle-tools-sheet.png"})`,
    backgroundPosition: `${col * 33.333}% ${row * 33.333}%`,
  };
}

const EVENT_SEEDS = [
  ["建筑工地", "地基里的硬土", "小河狸", "🦫", "新图书馆要开工啦，可是地面硬邦邦的。帮小河狸挖出整齐的地基吧！", "dig", "装上会挖土的工具"],
  ["建筑工地", "高高的钢梁", "斑马工长", "🦓", "活动中心的钢梁太高了，大家踮起脚也够不到。需要一位大力士！", "lift", "装上能举高高的工具"],
  ["建筑工地", "沙石搬家", "熊猫师傅", "🐼", "一堆沙石挡住了工地小路，把它们装起来运走吧。", "carry", "装上可以装东西的车厢"],
  ["建筑工地", "隧道向前进", "鼹鼠工程师", "🐹", "小山下面要开一条圆圆的隧道，前面有一层软岩石。", "drill", "装上会转动的钻头"],
  ["建筑工地", "水泥路变平", "河马队长", "🦛", "刚铺好的路面像波浪一样，校车开过去会摇摇晃晃。", "roll", "装上圆圆的大滚筒"],
  ["建筑工地", "砖块让一让", "狐狸建筑师", "🦊", "旧砖块排成了一堵矮墙，新花园没有入口啦。", "push", "装上宽宽的推土铲"],
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

const MISSIONS: Mission[] = EVENT_SEEDS.map((e, i) => ({
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
}));

const CATEGORY_LABELS: Record<Category, [string, string]> = {
  body: ["车身", "🟨"],
  move: ["轮子", "🛞"],
  cab: ["驾驶室", "🪟"],
  tool: ["工具", "🛠️"],
  help: ["辅助", "💡"],
  decor: ["装饰", "⭐"],
};

const DEFAULT_PAINT: Paint = {
  primary: "#ffc52f",
  secondary: "#ff7b3e",
  wheels: "#314154",
  pattern: "none",
  sticker: "",
  finish: "clean",
};
const DEFAULT_SAVE: SaveData = {
  stars: 0,
  completed: [],
  recent: [],
  unlocked: 1,
  garage: [],
  tutorialSeen: false,
};

function safeLoad(): SaveData {
  if (typeof window === "undefined") return DEFAULT_SAVE;
  try {
    const raw = localStorage.getItem("buildyard-save-v1");
    if (!raw) return DEFAULT_SAVE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SAVE, ...parsed, garage: Array.isArray(parsed.garage) ? parsed.garage : [] };
  } catch {
    return DEFAULT_SAVE;
  }
}

function speak(text: string, enabled = true) {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const voices = window.speechSynthesis.getVoices();
  const chinese = voices.filter((v) => /zh|Chinese|Xiaoxiao|Yunxi|晓晓|云希/i.test(`${v.lang} ${v.name}`));
  const preferred = chinese.find((v) => /Xiaoxiao|晓晓|natural|neural|premium/i.test(v.name)) || chinese[0];
  const phrases = text.match(/[^，。！？…]+[，。！？…]?/g) || [text];
  phrases.forEach((phrase, index) => {
    const line = new SpeechSynthesisUtterance(phrase.trim());
    line.lang = "zh-CN";
    if (preferred) line.voice = preferred;
    const excited = /太棒|快|出发|啦|！/.test(phrase);
    const gentle = /轻轻|温柔|别担心|想喝|等候/.test(phrase);
    line.rate = excited ? .95 : gentle ? .76 : .84;
    line.pitch = excited ? 1.28 : gentle ? 1.08 : 1.18 + (index % 2) * .05;
    line.volume = 1;
    window.speechSynthesis.speak(line);
  });
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

export default function Home() {
  const [screen, setScreen] = useState<"home" | "mission" | "build" | "garage">("home");
  const [save, setSave] = useState<SaveData>(DEFAULT_SAVE);
  const [mission, setMission] = useState<Mission | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("body");
  const [paint, setPaint] = useState<Paint>(DEFAULT_PAINT);
  const [snap, setSnap] = useState(true);
  const [mode, setMode] = useState<"mission" | "free">("mission");
  const [history, setHistory] = useState<Part[][]>([]);
  const [future, setFuture] = useState<Part[][]>([]);
  const [result, setResult] = useState<null | { ok: boolean; missing: string[]; reason?: string }>(null);
  const [showPaint, setShowPaint] = useState(false);
  const [showParent, setShowParent] = useState(false);
  const [voice, setVoice] = useState(true);
  const [toast, setToast] = useState("");
  const [tutorial, setTutorial] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ uid: string; dx: number; dy: number } | null>(null);
  const parentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setSave(safeLoad()), []);
  useEffect(() => {
    try {
      localStorage.setItem("buildyard-save-v1", JSON.stringify(save));
    } catch { /* local play still works */ }
  }, [save]);

  const unlockedThemes = THEMES.slice(0, save.unlocked);
  const selectedPart = parts.find((p) => p.uid === selected);

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-24), parts.map((p) => ({ ...p }))]);
    setFuture([]);
  }, [parts]);

  const pickMission = () => {
    const pool = MISSIONS.filter((m) => unlockedThemes.some((t) => t.name === m.theme));
    const fresh = pool.filter((m) => !save.recent.includes(m.id) && !save.completed.includes(m.id));
    const candidates = fresh.length ? fresh : pool.filter((m) => !save.recent.includes(m.id));
    const chosen = (candidates.length ? candidates : pool)[Math.floor(Math.random() * (candidates.length || pool.length))];
    setMission(chosen);
    setSave((s) => ({ ...s, recent: [...s.recent.slice(-4), chosen.id] }));
    setScreen("mission");
    setTimeout(() => speak(`${chosen.character}说：${chosen.story}`, voice), 250);
  };

  const startBuild = (kind: "mission" | "free") => {
    setMode(kind);
    setParts([]);
    setSelected(null);
    setResult(null);
    setShowPaint(false);
    setScreen("build");
    if (!save.tutorialSeen) setTutorial(1);
  };

  const addPart = (def: PartDef) => {
    pushHistory();
    const item = newPart(def, parts.length);
    setParts((p) => [...p, item]);
    setSelected(item.uid);
    if (tutorial === 1) setTutorial(2);
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
    dragging.current = { uid: part.uid, dx: e.clientX - box.left - part.x, dy: e.clientY - box.top - part.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !canvasRef.current) return;
    const box = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - box.left - dragging.current.dx;
    let y = e.clientY - box.top - dragging.current.dy;
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
      setResult({ ok: true, missing: [] });
      return;
    }
    const tags = new Set(parts.flatMap((p) => p.tags));
    const missing = (mission?.needs || []).filter((n) => !tags.has(n));
    if (!tags.has("body")) return setResult({ ok: false, missing, reason: "还需要一个结实的车身，让零件们有地方坐好。" });
    if (!tags.has("move")) return setResult({ ok: false, missing, reason: "车车还没有会走路的轮子或履带呢！" });
    if (missing.length) return setResult({ ok: false, missing, reason: mission?.hint });
    setResult({ ok: true, missing: [] });
    const wasNew = mission && !save.completed.includes(mission.id);
    if (mission) {
      setSave((s) => {
        const completed = s.completed.includes(mission.id) ? s.completed : [...s.completed, mission.id];
        const nextUnlock = Math.min(THEMES.length, Math.max(s.unlocked, 1 + Math.floor(completed.length / 3)));
        return { ...s, completed, unlocked: nextUnlock, stars: s.stars + (wasNew ? 3 : 1) };
      });
    }
    setTimeout(() => speak("太棒啦！你造的工程车完成任务啦！", voice), 400);
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

  const buildPreview = (carParts: Part[], carPaint: Paint, small = false) => {
    if (!carParts.length) return <div className="empty-car">🚧</div>;
    const minX = Math.min(...carParts.map((p) => p.x));
    const minY = Math.min(...carParts.map((p) => p.y));
    const scale = small ? .27 : 1;
    return carParts.slice(0, 16).map((p) => (
      <div key={p.uid} className={`part part-${p.category} ${SPRITES[p.id] ? "with-art" : ""}`} style={{
        left: (p.x - minX) * scale + (small ? 12 : 0),
        top: (p.y - minY) * scale + (small ? 15 : 0),
        width: p.w * p.scale * scale,
        height: p.h * p.scale * scale,
        transform: `rotate(${p.rotate}deg) scaleX(${p.flip ? -1 : 1})`,
        zIndex: p.z,
        "--part-color": p.category === "move" ? carPaint.wheels : carPaint.primary,
        "--part-accent": carPaint.secondary,
      } as React.CSSProperties}>{SPRITES[p.id] ? <span className="part-art" style={spriteStyle(p.id)}/> : p.icon}</div>
    ));
  };

  if (screen === "home") return (
    <main className="home-shell">
      <div className="sky-decor cloud c1">☁</div><div className="sky-decor cloud c2">☁</div>
      <div className="sun">☀</div>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">🔩</span><div><b>工程车创造营</b><small>BUILD & GO!</small></div></div>
        <div className="top-actions"><span className="star-count">⭐ {save.stars}</span><button className="round-btn" onClick={() => setVoice(!voice)} aria-label="声音">{voice ? "🔊" : "🔇"}</button></div>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">今天也有新任务！</span>
          <h1>小小工程师，<br/><em>开工啦！</em></h1>
          <p>挑零件、拼车车、换颜色，<br/>开着独一无二的工程车去帮忙。</p>
          <button className="primary giant" onClick={pickMission}><span>🎲</span><b>开始随机任务</b><i>出发！</i></button>
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
      {showParent && <div className="modal-shade"><div className="parent-panel"><button className="close" onClick={() => setShowParent(false)}>×</button><h2>家长设置</h2><p>游戏只在这台设备保存数据，不收集孩子的信息。</p><label className="setting"><span>故事语音</span><input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)}/></label><div className="parent-stats"><span><b>{save.completed.length}</b>完成任务</span><span><b>{save.garage.length}</b>收藏作品</span><span><b>{save.unlocked}</b>解锁主题</span></div><button className="danger" onClick={resetProgress}>重置全部进度</button></div></div>}
    </main>
  );

  if (screen === "mission" && mission) {
    const theme = THEMES.find((t) => t.name === mission.theme)!;
    return <main className="story-screen" style={{ "--theme": theme.color } as React.CSSProperties}>
      <header className="simple-header"><button onClick={() => setScreen("home")}>‹ 回家</button><span>随机任务</span><span className="star-count">⭐ {save.stars}</span></header>
      <section className="story-card">
        <div className="story-scene"><span className="scene-icon">{theme.icon}</span><div className="character">{mission.icon}</div><div className="help-bubble">帮帮忙！</div></div>
        <div className="story-copy"><span className="theme-pill">{theme.icon} {mission.theme}</span><h1>{mission.title}</h1><p>{mission.story}</p><div className="speaker"><span>{mission.icon}</span><div><b>{mission.character}</b><small>正在请求你的帮助</small></div><button onClick={() => speak(`${mission.character}说：${mission.story}`, voice)}>🔊 再听一次</button></div>
          <div className="mission-hint"><span>💡</span><div><small>小提示</small><b>{mission.hint}</b></div></div>
          <button className="primary story-start" onClick={() => startBuild("mission")}>去仓库造车 <span>→</span></button>
          <button className="text-btn" onClick={pickMission}>🎲 换一个故事</button>
        </div>
      </section>
    </main>;
  }

  if (screen === "garage") return <main className="garage-screen">
    <header className="simple-header"><button onClick={() => setScreen("home")}>‹ 回家</button><span>我的工程车库</span><span className="star-count">⭐ {save.stars}</span></header>
    <div className="garage-title"><div><span>🏠</span><h1>我的车车收藏</h1><p>每一辆都是独一无二的作品！</p></div><button className="primary" onClick={() => { setMission(null); startBuild("free"); }}>＋ 再造一辆</button></div>
    <section className="garage-grid">
      {save.garage.length ? save.garage.map((car) => <article key={car.id} className="car-card" onClick={() => { setParts(car.parts); setPaint(car.paint); setMission(null); setMode("free"); setScreen("build"); }}>
        <div className="car-thumb">{buildPreview(car.parts, car.paint, true)}</div><h3>{car.name}</h3><p>{car.parts.length} 个零件 · {car.date}</p>
      </article>) : <div className="empty-garage"><span>🚜</span><h2>车库还空空的</h2><p>去创造第一辆工程车吧！</p></div>}
    </section>
  </main>;

  return <main className="build-screen">
    <header className="build-header">
      <button className="back-btn" onClick={() => setScreen("home")}>‹</button>
      <div className="build-title"><small>{mode === "mission" ? `${mission?.icon} ${mission?.title}` : "🌈 想怎么拼都可以"}</small><b>{mode === "mission" ? "任务工程车" : "自由创造工坊"}</b></div>
      <div className="build-actions"><button onClick={undo} disabled={!history.length}>↶<small>撤销</small></button><button onClick={redo} disabled={!future.length}>↷<small>重做</small></button><button onClick={() => setSnap(!snap)} className={snap ? "active" : ""}>🧲<small>吸附</small></button><button onClick={() => setShowPaint(true)}>🎨<small>涂装</small></button></div>
      <button className="go-btn" onClick={evaluate}>出发！<span>➜</span></button>
    </header>
    <div className="work-area">
      <aside className="warehouse">
        <div className="warehouse-head"><span>🧰</span><div><b>零件仓库</b><small>点一下放进工地</small></div></div>
        <div className="category-tabs">{(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}><span>{CATEGORY_LABELS[c][1]}</span>{CATEGORY_LABELS[c][0]}</button>)}</div>
        <div className="parts-grid">{PARTS.filter((p) => p.category === category).map((p) => <button key={p.id} className="part-card" onClick={() => addPart(p)}><span className={`mini-part ${SPRITES[p.id] ? "has-art" : `part-${p.category}`}`}>{SPRITES[p.id] ? <span className="part-art" style={spriteStyle(p.id)}/> : p.icon}</span><b>{p.name}</b><i>＋</i></button>)}</div>
      </aside>
      <section className="canvas-wrap">
        <div className="canvas-info"><span>拖动零件 · 滚轮缩放</span><span>{parts.length} 个零件</span></div>
        <div className={`build-canvas pattern-${paint.pattern} finish-${paint.finish}`} ref={canvasRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={wheel}>
          <div className="horizon"><span>☁</span><span>☁</span></div><div className="ground-line"/>
          {!parts.length && <div className="canvas-empty"><span>👇</span><b>从左边选一个车身吧</b><small>零件会出现在这里</small></div>}
          {parts.map((p) => <div key={p.uid} onPointerDown={(e) => onPointerDown(e, p)} className={`part part-${p.category} ${SPRITES[p.id] ? "with-art" : ""} ${selected === p.uid ? "selected" : ""}`} style={{
            left: p.x, top: p.y, width: p.w * p.scale, height: p.h * p.scale,
            transform: `rotate(${p.rotate}deg) scaleX(${p.flip ? -1 : 1})`, zIndex: p.z,
            "--part-color": p.category === "move" ? paint.wheels : paint.primary,
            "--part-accent": paint.secondary,
          } as React.CSSProperties}><span className={SPRITES[p.id] ? "part-art" : ""} style={spriteStyle(p.id)}>{SPRITES[p.id] ? "" : p.icon}</span>{paint.sticker && p.category === "body" && <i className="part-sticker">{paint.sticker}</i>}</div>)}
          {selectedPart && <div className="selection-tools">
            <button onClick={() => updateSelected({ rotate: selectedPart.rotate - 15 })}>↶</button>
            <button onClick={() => updateSelected({ rotate: selectedPart.rotate + 15 })}>↷</button>
            <button onClick={() => updateSelected({ scale: Math.max(.55, selectedPart.scale - .1) })}>−</button>
            <button onClick={() => updateSelected({ scale: Math.min(1.55, selectedPart.scale + .1) })}>＋</button>
            <button onClick={() => updateSelected({ flip: !selectedPart.flip })}>⇆</button>
            <button onClick={() => updateSelected({ z: Math.max(...parts.map((p) => p.z)) + 1 })}>置前</button>
            <button className="trash" onClick={deleteSelected}>🗑</button>
          </div>}
        </div>
      </section>
    </div>

    {showPaint && <div className="paint-drawer"><div className="drawer-head"><div><span>🎨</span><b>神奇涂装屋</b><small>给工程车换身新衣服</small></div><button onClick={() => setShowPaint(false)}>完成 ✓</button></div>
      <div className="paint-section"><b>车身颜色</b><div className="swatches">{["#ffc52f","#ff704b","#59c986","#45aaf2","#9b78e8","#ef71ae","#f5f1dd"].map((c) => <button key={c} className={paint.primary === c ? "chosen" : ""} style={{ background: c }} onClick={() => setPaint({ ...paint, primary: c })}/>)}</div></div>
      <div className="paint-section"><b>搭配颜色</b><div className="swatches">{["#ff7b3e","#2e98d1","#754fbb","#68b33e","#f4e04d","#ffffff"].map((c) => <button key={c} className={paint.secondary === c ? "chosen" : ""} style={{ background: c }} onClick={() => setPaint({ ...paint, secondary: c })}/>)}</div></div>
      <div className="paint-section"><b>花纹</b><div className="option-row">{[["none","纯色"],["stripe","闪电"],["dots","圆点"]].map(([v,n]) => <button key={v} className={paint.pattern === v ? "chosen" : ""} onClick={() => setPaint({ ...paint, pattern: v })}>{v === "stripe" ? "⚡" : v === "dots" ? "●●" : "▰"}<small>{n}</small></button>)}</div></div>
      <div className="paint-section"><b>贴纸</b><div className="sticker-row">{["","⭐","🌈","🦕","🚀","🐾"].map((s) => <button key={s || "no"} className={paint.sticker === s ? "chosen" : ""} onClick={() => setPaint({ ...paint, sticker: s })}>{s || "无"}</button>)}</div></div>
      <div className="paint-section"><b>特别效果</b><div className="option-row"><button className={paint.finish === "clean" ? "chosen" : ""} onClick={() => setPaint({ ...paint, finish: "clean" })}>✨<small>亮晶晶</small></button><button className={paint.finish === "mud" ? "chosen" : ""} onClick={() => setPaint({ ...paint, finish: "mud" })}>🟤<small>泥点勇士</small></button></div></div>
    </div>}

    {result && <div className="modal-shade result-shade"><div className={`result-card ${result.ok ? "success" : "oops"}`}>
      <div className="confetti">{result.ok ? "✨ ⭐ 🎉 ⭐ ✨" : "💨　🍃　💭"}</div>
      <div className="result-animation"><div className="result-vehicle">{parts.length ? "🚜" : "🛒"}</div><div className="result-character">{result.ok ? mission?.icon || "🤩" : "🐣"}</div></div>
      <span className="result-label">{result.ok ? "任务完成！" : "差一点点就可以啦"}</span>
      <h2>{result.ok ? (mode === "free" ? "这辆车太有创意啦！" : `${mission?.character}开心得跳起来！`) : "车车噗噗两声，停下来想了想…"}</h2>
      <p>{result.ok ? (mode === "free" ? "它是全世界独一无二的工程车。" : `你用自己的方法解决了“${mission?.title}”！`) : result.reason}</p>
      {result.ok && mode === "mission" && <div className="reward">获得贴纸 <b>{mission?.reward}</b> ＋ ⭐⭐⭐</div>}
      <div className="result-buttons">{!result.ok ? <button className="primary" onClick={() => setResult(null)}>回去加零件</button> : <><button className="secondary" onClick={saveCar}>♥ 收藏这辆车</button><button className="primary" onClick={() => { saveCar(); setResult(null); mode === "mission" ? pickMission() : setScreen("home"); }}>{mode === "mission" ? "下一个故事" : "回到首页"}</button></>}</div>
    </div></div>}

    {tutorial > 0 && <div className={`tutorial tip-${tutorial}`}><button onClick={() => { setTutorial(0); setSave((s) => ({ ...s, tutorialSeen: true })); }}>跳过</button><span>{tutorial === 1 ? "👈" : tutorial === 2 ? "☝️" : "🎨"}</span><b>{tutorial === 1 ? "先选一个喜欢的车身" : tutorial === 2 ? "拖动零件，摆到你喜欢的位置" : "继续加轮子和工具，然后换个漂亮颜色！"}</b>{tutorial === 3 && <button className="got-it" onClick={() => { setTutorial(0); setSave((s) => ({ ...s, tutorialSeen: true })); }}>知道啦！</button>}</div>}
    {toast && <div className="toast">{toast}</div>}
  </main>;
}

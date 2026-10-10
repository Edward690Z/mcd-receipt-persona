/** 16 种人格：四个维度各取一个字母。名称用开发者熟悉的概念，便于在程序员节传播。 */
export const AXES = [
  { id: 'T', a: { code: 'D', name: '日间派' }, b: { code: 'N', name: '夜间派' } },
  { id: 'S', a: { code: 'H', name: '外送派' }, b: { code: 'S', name: '到店派' } },
  { id: 'V', a: { code: 'L', name: '专一派' }, b: { code: 'X', name: '尝鲜派' } },
  { id: 'P', a: { code: 'B', name: '精打细算派' }, b: { code: 'F', name: '随心派' } },
];

export const PERSONAS = {
  DHLB: ['定时任务型', 'cron job', 'cron job：每天准点开工，口味固定，优惠券一张不落。'],
  DHLF: ['单例模式型', 'Singleton', 'Singleton：白天宅家点外送，永远是那一份熟悉的味道。'],
  DHXB: ['懒加载探索型', 'Lazy Load', 'Lazy Load：宅着也能把菜单逛一遍，顺手把券用得明明白白。'],
  DHXF: ['热更新型', 'Hot Reload', 'Hot Reload：白天宅家持续尝新，菜单一更新你就跟进。'],
  DSLB: ['缓存命中型', 'Cache Hit', 'Cache Hit：白天到店，认准老口味，用券稳准狠。'],
  DSLF: ['长期支持版', 'LTS', 'LTS：白天到店，认准老朋友，稳定压倒一切。'],
  DSXB: ['多线程探索型', 'Multi-thread', 'Multi-thread：白天到店打卡各种新品，还会先看看有什么优惠。'],
  DSXF: ['Beta 尝鲜型', 'Beta', 'Beta：到店就想试新品，人生苦短，先上线再说。'],
  NHLB: ['夜间批处理型', 'Batch Job', 'Batch Job：夜里准时下单，口味固定，精打细算。'],
  NHLF: ['守护进程型', 'Daemon', 'Daemon：夜深人静外送准时到，一份熟悉的味道常驻后台。'],
  NHXB: ['凌晨调试型', 'Debug Mode', 'Debug Mode：夜里一边排查问题一边点单，口味常换，券也没浪费。'],
  NHXF: ['灰度发布型', 'Canary', 'Canary：夜里在外送里小流量尝新，好吃再全量。'],
  NSLB: ['夜班值守型', 'On-call', 'On-call：夜里到店取餐，认准老口味，精打细算。'],
  NSLF: ['深夜守门人', 'Watchdog', 'Watchdog：夜里到店，熟悉的那一口就是最好的补给。'],
  NSXB: ['夜行探索者', 'Night Crawler', 'Night Crawler：夜里到店打卡新品，同时不忘用券。'],
  NSXF: ['午夜新品猎人', 'Feature Hunter', 'Feature Hunter：夜里到店，盯着新品下手，哪款没试过就点哪款。'],
};

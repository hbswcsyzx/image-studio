import type { ImagePreset, StylePreset, UserPreferences } from './types'

export const defaultStylePresets: StylePreset[] = [
  {
    id: 'cinematic',
    name: '电影感',
    prompt: '电影级视觉语言，真实可信的材质与空间关系，克制而明确的主光、辅光和轮廓光，色彩统一且保留自然层次。构图强调主体动势、前后景深度与叙事焦点，细节丰富但不喧宾夺主，避免塑料质感、过度锐化、杂乱背景、无意义光效和廉价滤镜感。',
    builtin: true,
  },
  {
    id: 'illustration',
    name: '商业插画',
    prompt: '成熟的商业插画视觉，轮廓清晰，形体概括准确，材质通过有控制的笔触和色块表达。建立明确的主体、陪体与背景层级，配色具有品牌感和可读性，光影服务于信息传达，关键细节精致，次要区域适度简化，避免元素堆砌、边缘脏乱、颜色浑浊和视觉重心分散。',
    builtin: true,
  },
  {
    id: 'anime',
    name: '日系动画',
    prompt: '高完成度日系动画视觉，人物比例、五官、发型和服装结构保持稳定，线条干净流畅，赛璐璐光影层次明确并保留少量柔和过渡。色彩清透，表情与肢体动作准确传达情绪，背景细节服从人物主体，避免五官漂移、手部畸形、装饰粘连、无意义高光和过度幼态化。',
    builtin: true,
  },
  {
    id: 'product',
    name: '产品摄影',
    prompt: '高端产品摄影语言，产品外形、比例、结构和品牌细节准确，金属、玻璃、塑料、织物等材质反射符合物理规律。布光突出轮廓、表面工艺与核心卖点，背景简洁但具有空间层次，画面干净、克制、可用于商业展示，避免透视变形、虚假反光、悬浮阴影和无关装饰。',
    builtin: true,
  },
  {
    id: 'card',
    name: '卡牌插图',
    prompt: '高完成度卡牌插图，第一眼即可识别核心角色或事件，主体轮廓鲜明，动作方向和视觉动线集中。通过前景、中景与背景建立紧凑层次，关键装备、表情和叙事符号清楚，次要内容有节制地概括，色彩与光效用于强化稀有感和戏剧张力，避免信息平均分布、背景抢戏和细节糊成一团。',
    builtin: true,
  },
]

export const defaultImagePresets: ImagePreset[] = [
  { id: 'quick-square', name: '快速方图', size: '1024x1024', quality: 'auto', count: 1, background: 'auto', output_format: 'png', output_compression: 100, builtin: true },
  { id: 'landscape-2k', name: '横向 2K', size: '2048x1152', quality: 'high', count: 1, background: 'auto', output_format: 'png', output_compression: 100, builtin: true },
  { id: 'portrait-hd', name: '纵向高清', size: '1024x1536', quality: 'high', count: 1, background: 'auto', output_format: 'png', output_compression: 100, builtin: true },
]

export function resolveStylePresets(preferences: UserPreferences): StylePreset[] {
  return preferences.style_presets === undefined ? defaultStylePresets : preferences.style_presets
}

export function resolveImagePresets(preferences: UserPreferences): ImagePreset[] {
  return preferences.image_presets === undefined ? defaultImagePresets : preferences.image_presets
}

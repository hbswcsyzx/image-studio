import { ArrowRight, Images, SlidersHorizontal, Timeline, X } from 'lucide-react'

type Props = { onConfigure: () => void; onLater: () => void }

export default function OnboardingGuide({ onConfigure, onLater }: Props) {
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <section className="onboarding-panel">
      <button className="icon-button onboarding-close" aria-label="稍后设置" onClick={onLater}><X /></button>
      <span className="eyebrow">首次使用</span>
      <h2 id="welcome-title">欢迎来到 Studio Basil</h2>
      <p className="onboarding-lead">这里专注一件事：把提示词和参考图变成可以反复挑选、润色和保存的图片。</p>
      <div className="onboarding-map">
        <div><Timeline /><strong>历史刻度</strong><span>每轮生成都会留在左侧，随时回到之前的版本。</span></div>
        <div><Images /><strong>创作区</strong><span>当前结果始终占据主空间，下载与收藏紧随图片。</span></div>
        <div><SlidersHorizontal /><strong>操控面板</strong><span>底部只保留提示词、参考图和图片参数。</span></div>
      </div>
      <div className="onboarding-actions">
        <button className="text-button" onClick={onLater}>先看看工作台</button>
        <button className="primary-button" onClick={onConfigure}>配置常用模型 <ArrowRight /></button>
      </div>
    </section>
  </div>
}

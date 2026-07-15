import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Image, LoaderCircle, Palette, Save, Sparkles, X } from 'lucide-react'
import { api } from './api'
import { resolveImagePresets, resolveStylePresets } from './presetDefaults'
import type { DerivedEvidence, DerivedPresetResult, ImagePreset, StylePreset, User } from './types'

type Props = {
  open: boolean
  result: DerivedPresetResult | null
  user: User
  onClose: () => void
  onUser: (user: User) => void
}

function Evidence({ value }: { value: DerivedEvidence }) {
  return <div className="derivation-evidence">
    {value.accepted.length > 0 && <div><strong><Check />确认偏好</strong><ul>{value.accepted.map(item => <li key={item}>{item}</li>)}</ul></div>}
    {value.changes.length > 0 && <div><strong><Sparkles />修改要求</strong><ul>{value.changes.map(item => <li key={item}>{item}</li>)}</ul></div>}
    {value.uncertain.length > 0 && <div><strong><AlertTriangle />仍不确定</strong><ul>{value.uncertain.map(item => <li key={item}>{item}</li>)}</ul></div>}
  </div>
}

export default function PresetReviewDialog({ open, result, user, onClose, onUser }: Props) {
  const [style, setStyle] = useState(result?.style_draft ?? null)
  const [image, setImage] = useState(result?.image_draft ?? null)
  const [saveStyle, setSaveStyle] = useState(true)
  const [saveImage, setSaveImage] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setStyle(result?.style_draft ? { ...result.style_draft } : null)
    setImage(result?.image_draft ? { ...result.image_draft } : null)
    setSaveStyle(true); setSaveImage(true); setError('')
  }, [result])

  if (!open || !result || !style || !image) return null

  async function persist() {
    const currentStyle = style
    const currentImage = image
    if (!currentStyle || !currentImage) return
    if (!saveStyle && !saveImage) { setError('请至少选择一种预设'); return }
    const payload: { style_presets?: StylePreset[]; image_presets?: ImagePreset[] } = {}
    const suffix = Date.now().toString(36)
    if (saveStyle) {
      if (!currentStyle.name.trim() || currentStyle.prompt.trim().length < 20) { setError('风格名称不能为空，提示词至少需要 20 个字符'); return }
      payload.style_presets = [...resolveStylePresets(user.preferences), {
        id: `derived-style-${suffix}`, name: currentStyle.name.trim(), prompt: currentStyle.prompt.trim(), builtin: false,
      }]
    }
    if (saveImage) {
      if (!currentImage.name.trim()) { setError('图片设置预设名称不能为空'); return }
      payload.image_presets = [...resolveImagePresets(user.preferences), {
        id: `derived-image-${suffix}`, name: currentImage.name.trim(), size: currentImage.size,
        quality: currentImage.quality, count: currentImage.count, background: currentImage.background,
        output_format: currentImage.output_format, output_compression: currentImage.output_compression, builtin: false,
      }]
    }
    setBusy(true); setError('')
    try {
      onUser(await api<User>('/api/auth/preferences', { method: 'PATCH', body: JSON.stringify(payload) }))
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : '保存预设失败') }
    finally { setBusy(false) }
  }

  const lowConfidence = style.confidence < 0.6 || image.confidence < 0.6
  return <div className="modal-layer">
    <button className="modal-scrim" aria-label="关闭归纳预设" onClick={onClose} />
    <section className="preset-review-dialog" role="dialog" aria-modal="true" aria-labelledby="preset-review-title">
      <header><div><span className="eyebrow">仅分析当前会话</span><h2 id="preset-review-title">归纳预设</h2></div><button className="icon-button" aria-label="关闭" onClick={onClose}><X /></button></header>
      <div className="derivation-summary"><p>{result.summary}</p><div className="derivation-stats"><span>{result.statistics.successful_runs} 次成功生成</span><span>{result.statistics.refinement_steps} 次连续修改</span><span>{result.statistics.representative_images} 张代表图</span></div></div>
      {!result.used_visual_analysis && result.fallback_reason && <p className="derivation-notice"><AlertTriangle />{result.fallback_reason}</p>}
      {lowConfidence && <p className="derivation-notice"><AlertTriangle />证据较少，请重点检查</p>}

      <div className="preset-review-content">
        <section className="preset-review-section">
          <label className="preset-save-toggle"><input type="checkbox" checked={saveStyle} onChange={event => setSaveStyle(event.target.checked)} /><Palette /><span><strong>保存风格预设</strong><small>置信度 {Math.round(style.confidence * 100)}%</small></span></label>
          <label>名称<input aria-label="风格预设名称" value={style.name} onChange={event => setStyle({ ...style, name: event.target.value })} /></label>
          <label>风格约束提示词<textarea aria-label="风格约束提示词" rows={6} value={style.prompt} onChange={event => setStyle({ ...style, prompt: event.target.value })} /></label>
          <Evidence value={style} />
        </section>

        <section className="preset-review-section">
          <label className="preset-save-toggle"><input type="checkbox" aria-label="保存图片设置预设" checked={saveImage} onChange={event => setSaveImage(event.target.checked)} /><Image /><span><strong>保存图片设置预设</strong><small>置信度 {Math.round(image.confidence * 100)}%</small></span></label>
          <label>名称<input aria-label="图片设置预设名称" value={image.name} onChange={event => setImage({ ...image, name: event.target.value })} /></label>
          <div className="derived-image-fields">
            <label>尺寸<input value={image.size} onChange={event => setImage({ ...image, size: event.target.value })} /></label>
            <label>质量<select value={image.quality} onChange={event => setImage({ ...image, quality: event.target.value })}><option value="auto">自动</option><option value="medium">标准</option><option value="high">高</option></select></label>
            <label>数量<input type="number" min="1" max="4" value={image.count} onChange={event => setImage({ ...image, count: Number(event.target.value) })} /></label>
            <label>背景<select value={image.background} onChange={event => setImage({ ...image, background: event.target.value })}><option value="auto">自动</option><option value="opaque">不透明</option><option value="transparent">透明</option></select></label>
            <label>格式<select value={image.output_format} onChange={event => setImage({ ...image, output_format: event.target.value })}><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option></select></label>
            <label>压缩<input type="number" min="0" max="100" value={image.output_compression} onChange={event => setImage({ ...image, output_compression: Number(event.target.value) })} /></label>
          </div>
          <Evidence value={image} />
        </section>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <footer><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" aria-label="保存所选预设" disabled={busy || (!saveStyle && !saveImage)} onClick={persist}>{busy ? <LoaderCircle className="spin" /> : <Save />}保存所选预设</button></footer>
    </section>
  </div>
}

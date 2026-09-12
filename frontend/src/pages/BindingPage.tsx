import { useEffect, useState } from 'react';
import { ArrowRight, Check, Link2, ShieldCheck, UserRound } from 'lucide-react';
import { AppShell, Notice, PageHeading } from '../components/Layout';
import { getRuntime } from '../services/runtime';

export default function BindingPage() {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ token: string; therapistName: string } | null>(null);
  const [binding, setBinding] = useState<{ therapistName: string; boundAt: string } | null>(null);
  const [unlink, setUnlink] = useState(false);
  const service = getRuntime().binding;
  useEffect(() => { let active = true; if (service) { setBusy(true); service.getBinding().then(value => { if (active) setBinding(value); }).catch(() => { if (active) setError('绑定信息没有读取完成，请刷新重试。'); }).finally(() => { if (active) setBusy(false); }); } return () => { active = false; }; }, [service]);
  async function lookup() {
    setError('');
    if (!nickname.trim() || !code.trim()) { setError('请填写昵称和治疗师提供的邀请码。'); return; }
    if (!service) { setError('绑定服务暂未开放，你仍可以训练并保留本机记录。'); return; }
    setBusy(true);
    try { setPreview(await service.previewInvite(code.trim())); }
    catch { setError('暂时没有查到这个邀请码，请确认后再试。'); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!preview || !service) return;
    setBusy(true); setError('');
    try { await service.confirmBinding({ token: preview.token, displayName: nickname.trim(), consentVersion: 'training-summary-v1' }); const value = await service.getBinding(); if (!value) throw new Error(); setBinding(value); setPreview(null); }
    catch { setError('绑定尚未完成，请检查网络后重试。'); }
    finally { setBusy(false); }
  }
  async function unbind() {
    if (!service) return;
    setBusy(true); setError('');
    try { await service.unbind(); setBinding(null); setUnlink(false); }
    catch { setError('暂时无法解除绑定，请稍后重试。'); }
    finally { setBusy(false); }
  }
  return <AppShell compact><div className="binding-page"><PageHeading title="让每一小步，都有人看见" eyebrow="A LITTLE CONNECTION" description="邀请你的治疗师，一起关注你的训练足迹。" /><section className="binding-card"><div className="binding-illustration"><span><UserRound size={27} /></span><i /><Link2 size={22} /><i /><span><ShieldCheck size={27} /></span></div>
    {binding ? <><span className="checkin-badge"><Check size={15} />已绑定</span><h2>{binding.therapistName}</h2><p>绑定于 {new Date(binding.boundAt).toLocaleDateString('zh-CN')}</p><div className="sharing-scope"><ShieldCheck size={20} /><p>已分享当前浏览器身份下已有和未来的训练汇总，包括未完成记录。</p></div>{unlink ? <div className="unlink-confirm"><h3>解除与这位治疗师的绑定？</h3><p>解除后停止分享新的训练记录，本机记录仍然保留。已分享记录的保留由服务端规则决定。</p><button disabled={busy} className="primary-button" onClick={unbind}>确认解除绑定</button><button className="text-button" onClick={() => setUnlink(false)}>继续保持绑定</button></div> : <button className="text-button" onClick={() => setUnlink(true)}>解除绑定</button>}</> : preview ? <><p className="eyebrow">确认这位熟悉的陪伴者</p><h2>{preview.therapistName}</h2><p>将以「{nickname}」分享你的训练汇总</p><div className="sharing-scope"><ShieldCheck size={20} /><div><strong>确认后，将分享以下内容</strong><p>当前浏览器身份下已有及未来的训练汇总，包含日期、主题、动作完成、节奏表现、有效时长，以及未完成记录。</p><p>不会分享摄像头画面。你可以随时解除绑定。</p></div></div><button disabled={busy} className="primary-button wide" onClick={confirm}>{busy ? '正在确认…' : '确认绑定并分享'}<ArrowRight size={17} /></button><button className="text-button" onClick={() => setPreview(null)}>返回修改</button></> : <form onSubmit={e => { e.preventDefault(); void lookup(); }}><h2>连接一份温柔的陪伴</h2><p>输入治疗师提供的邀请码，先确认，再分享。</p><label htmlFor="nickname">怎么称呼你</label><input id="nickname" autoComplete="nickname" maxLength={24} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="写下你的昵称" /><label htmlFor="invite">治疗师邀请码</label><input id="invite" className="invite-input" autoComplete="off" autoCapitalize="characters" maxLength={32} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="输入邀请码" /><button className="primary-button wide" disabled={busy} type="submit">{busy ? '正在查询…' : '查找治疗师'}<ArrowRight size={18} /></button><p className="micro-note"><ShieldCheck size={14} /> 确认绑定前，不会分享任何训练记录</p></form>}{error && <Notice>{error}</Notice>}</section><p className="binding-bottom-note">暂时没有邀请码？没关系，你的训练仍会保存在本机。</p></div></AppShell>;
}

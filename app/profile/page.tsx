"use client";

import { useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { useProfile } from "@/hooks/useProfile";
import type { UserProfile, UndergraduateRegion, ProgramCountry, CareerGoal, JobLocation } from "@/lib/types";

const TIER_LABELS: Record<string, string> = {
  "China Tier 1": "清北复交浙等 T1",
  "China Tier 2": "强985",
  "China Tier 3": "211 / 财经强校",
  "China Tier 4": "普通一本",
  "G5": "英国G5",
  "UK Top Tier": "罗素集团顶尖",
  "Non-target": "双非",
};

export default function ProfilePage() {
  const { profile, loaded, save, clear, completion } = useProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UserProfile | null>(null);

  function startEdit() {
    setForm(profile ? { ...profile } : {
      undergraduate_region: "", undergraduate_school: "", undergraduate_tier: "",
      undergrad_prestige_score: 5, major: "", gpa: "", language_score: "",
      gmat_gre: "", internships: "", work_experience: "",
      preferred_categories: [], target_countries: [], budget_gbp: null,
      target_job_location: "", career_goal: "",
    });
    setEditing(true);
  }

  function handleSave() {
    if (form) {
      save(form);
      setEditing(false);
    }
  }

  function set<K extends keyof UserProfile>(k: K, v: UserProfile[K]) {
    setForm((prev) => prev ? { ...prev, [k]: v } : prev);
  }

  if (!loaded) return <div className="min-h-screen"><NavBar /><main className="max-w-4xl mx-auto px-4 py-6"><p className="text-gray-400">加载中...</p></main></div>;

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-2xl shadow-lg text-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">我的申请档案</h2>
              <p className="text-blue-200 text-xs mt-1">保存背景信息，下次不用重新填写</p>
            </div>
            <div className="text-right">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke="white" strokeWidth="3"
                    strokeDasharray={`${completion} ${100 - completion}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{completion}%</span>
              </div>
              <p className="text-[10px] text-blue-200 mt-1">完整度</p>
            </div>
          </div>
        </div>

        {!editing ? (
          <>
            {/* Display mode */}
            {profile ? (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-800">基本信息</h3>
                  <div className="flex gap-2">
                    <button onClick={startEdit} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                      编辑
                    </button>
                    <button onClick={clear} className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-500">
                      清除
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <InfoCell label="本科院校" value={profile.undergraduate_school || "—"} />
                  <InfoCell label="院校层级" value={TIER_LABELS[profile.undergraduate_tier] || profile.undergraduate_tier || "—"} />
                  <InfoCell label="本科专业" value={profile.major || "—"} />
                  <InfoCell label="GPA" value={profile.gpa || "—"} />
                  <InfoCell label="语言成绩" value={profile.language_score || "—"} />
                  <InfoCell label="GMAT/GRE" value={profile.gmat_gre || "—"} />
                  <InfoCell label="实习经历" value={profile.internships || "—"} />
                  <InfoCell label="工作经验" value={profile.work_experience || "—"} />
                  <InfoCell label="职业目标" value={profile.career_goal || "—"} />
                  <InfoCell label="目标就业地" value={profile.target_job_location || "—"} />
                </div>
                {profile.target_countries.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] text-gray-500 mb-1">目标国家</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.target_countries.map((c) => (
                        <span key={c} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.preferred_categories.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] text-gray-500 mb-1">偏好方向</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.preferred_categories.map((c) => (
                        <span key={c} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 text-center py-16">
                <p className="text-lg text-gray-500 mb-2">还没有保存档案</p>
                <p className="text-sm text-gray-400 mb-4">创建档案后，推荐页和报告页可自动预填信息</p>
                <button onClick={startEdit} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  创建档案
                </button>
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <QuickLink href="/" label="去智能推荐" desc="AI 匹配选校" icon="🎓" />
              <QuickLink href="/report" label="申请规划报告" desc="生成个性化报告" icon="📋" />
              <QuickLink href="/tracker" label="申请进度" desc="管理申请状态" icon="📊" />
            </div>
          </>
        ) : form ? (
          /* Edit mode */
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            <h3 className="text-base font-bold text-gray-800 mb-4">编辑档案</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="本科院校地区">
                  <select className={inputCls} value={form.undergraduate_region}
                    onChange={(e) => set("undergraduate_region", e.target.value as UndergraduateRegion)}>
                    <option value="">请选择</option>
                    <option value="China">中国大陆</option><option value="UK">英国</option>
                    <option value="US">美国</option><option value="Hong Kong">香港</option>
                    <option value="Singapore">新加坡</option><option value="Australia">澳大利亚</option>
                    <option value="Canada">加拿大</option><option value="Europe">欧洲</option>
                    <option value="Other">其他</option>
                  </select>
                </Field>
                <Field label="本科院校名称">
                  <input className={inputCls} value={form.undergraduate_school}
                    onChange={(e) => set("undergraduate_school", e.target.value)} placeholder="e.g. 北京大学" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="本科专业">
                  <input className={inputCls} value={form.major}
                    onChange={(e) => set("major", e.target.value)} placeholder="e.g. Finance" />
                </Field>
                <Field label="GPA / 绩点">
                  <input className={inputCls} value={form.gpa}
                    onChange={(e) => set("gpa", e.target.value)} placeholder="e.g. 3.7/4.0 · 85%" />
                </Field>
                <Field label="语言成绩">
                  <input className={inputCls} value={form.language_score}
                    onChange={(e) => set("language_score", e.target.value)} placeholder="e.g. IELTS 7.0" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="GMAT/GRE">
                  <input className={inputCls} value={form.gmat_gre}
                    onChange={(e) => set("gmat_gre", e.target.value)} placeholder="e.g. GMAT 720" />
                </Field>
                <Field label="实习经历">
                  <input className={inputCls} value={form.internships}
                    onChange={(e) => set("internships", e.target.value)} placeholder="e.g. 2 finance internships" />
                </Field>
                <Field label="工作经验">
                  <input className={inputCls} value={form.work_experience}
                    onChange={(e) => set("work_experience", e.target.value)} placeholder="e.g. 1 year" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="职业目标">
                  <select className={inputCls} value={form.career_goal}
                    onChange={(e) => set("career_goal", e.target.value as CareerGoal | "")}>
                    <option value="">未定</option>
                    <option value="Investment Banking">投行</option><option value="Corporate Finance">公司金融/资管</option>
                    <option value="Consulting">管理咨询</option><option value="Data/AI">数据/AI</option>
                    <option value="Marketing">市场营销</option><option value="Management">综合管理</option>
                    <option value="Product">产品/科技</option><option value="Entrepreneurship">创业</option>
                  </select>
                </Field>
                <Field label="目标就业地">
                  <select className={inputCls} value={form.target_job_location}
                    onChange={(e) => set("target_job_location", e.target.value as JobLocation | "")}>
                    <option value="">未定</option>
                    <option value="UK">留英</option><option value="China">回国</option>
                    <option value="US">美国</option><option value="Hong Kong">香港/新加坡</option>
                    <option value="Europe">欧洲</option><option value="Not sure">暂不确定</option>
                  </select>
                </Field>
              </div>

              {/* Target countries */}
              <Field label="目标留学国家（可多选）">
                <div className="flex flex-wrap gap-2">
                  {(["UK", "US", "Hong Kong", "Singapore", "Australia", "France"] as ProgramCountry[]).map((c) => {
                    const active = form.target_countries.includes(c);
                    return (
                      <button key={c} type="button"
                        onClick={() => set("target_countries", active ? form.target_countries.filter((x) => x !== c) : [...form.target_countries, c])}
                        className={`px-3 py-1.5 rounded-full text-sm border ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  保存档案
                </button>
                <button onClick={() => setEditing(false)} className="px-6 py-2.5 text-sm text-gray-500 hover:text-gray-700">
                  取消
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <footer className="text-center text-gray-400 text-xs py-8 mt-8 border-t">
        数据来源：各国大学官方网站、QS/FT 排名等公开数据 · 仅供参考
      </footer>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function QuickLink({ href, label, desc, icon }: { href: string; label: string; desc: string; icon: string }) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <span className="text-2xl">{icon}</span>
      <p className="text-sm font-semibold text-gray-800 mt-2">{label}</p>
      <p className="text-xs text-gray-500">{desc}</p>
    </Link>
  );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

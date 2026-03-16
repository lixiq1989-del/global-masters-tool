"use client";

import { useState, useMemo, useEffect } from "react";
import programsData from "@/data/programs.json";
import employmentData from "@/data/employment.json";
import type { RawProgram, RawEmployment } from "@/lib/types";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuthContext } from "@/components/AuthProvider";

/* eslint-disable @typescript-eslint/no-explicit-any */
const programs = programsData as any as RawProgram[];
const employment = employmentData as any as RawEmployment[];

const COUNTRY_FLAG: Record<string, string> = {
  UK: "🇬🇧", US: "🇺🇸", "Hong Kong": "🇭🇰", Singapore: "🇸🇬", Australia: "🇦🇺", France: "🇫🇷",
};

const CURRENCY_SYMBOL: Record<string, string> = {
  GBP: "£", USD: "$", HKD: "HK$", SGD: "S$", AUD: "A$", EUR: "€",
};

const PAGE_SIZE = 20;

// Chinese alias map for search
const SCHOOL_CN: Record<string, string> = {
  "Imperial College London": "帝国理工",
  "University of Oxford": "牛津大学",
  "University of Cambridge": "剑桥大学",
  "London School of Economics and Political Science": "伦敦政经 LSE",
  "London Business School": "伦敦商学院 LBS",
  "University College London": "伦敦大学学院 UCL",
  "University of Warwick": "华威大学",
  "University of Edinburgh": "爱丁堡大学",
  "University of Manchester": "曼彻斯特大学 曼大",
  "King's College London": "伦敦国王学院 KCL",
  "University of Bristol": "布里斯托大学",
  "University of Bath": "巴斯大学",
  "Durham University": "杜伦大学",
  "University of Leeds": "利兹大学",
  "University of Glasgow": "格拉斯哥大学",
  "University of Birmingham": "伯明翰大学",
  "University of Exeter": "埃克塞特大学",
  "University of Nottingham": "诺丁汉大学",
  "University of Sheffield": "谢菲尔德大学",
  "University of Southampton": "南安普顿大学 南安",
  "Lancaster University": "兰卡斯特大学",
  "University of St Andrews": "圣安德鲁斯大学",
  "University of York": "约克大学",
  "Queen Mary University of London": "伦敦玛丽女王大学 QMUL",
  "University of Liverpool": "利物浦大学",
  "University of Surrey": "萨里大学",
  "Bayes Business School": "贝叶斯商学院 卡斯商学院 CASS",
  "Cranfield University": "克兰菲尔德大学",
  "University of Strathclyde": "斯特拉斯克莱德大学",
  "University of Reading": "雷丁大学",
  "Loughborough University": "拉夫堡大学",
  "University of Sussex": "萨塞克斯大学",
  "Aston University": "阿斯顿大学",
  // US
  "Columbia University": "哥伦比亚大学 哥大",
  "MIT": "麻省理工 MIT",
  "Harvard University": "哈佛大学",
  "Stanford University": "斯坦福大学",
  "University of Chicago": "芝加哥大学",
  "University of Pennsylvania": "宾夕法尼亚大学 宾大 沃顿",
  "New York University": "纽约大学 NYU",
  "Duke University": "杜克大学",
  "Northwestern University": "西北大学",
  "Cornell University": "康奈尔大学",
  "Yale University": "耶鲁大学",
  "UC Berkeley": "加州伯克利 UCB",
  "UCLA": "加州洛杉矶 UCLA",
  "University of Michigan": "密歇根大学",
  "Georgetown University": "乔治城大学",
  "Johns Hopkins University": "约翰霍普金斯 JHU",
  "University of Virginia": "弗吉尼亚大学",
  "University of Southern California": "南加州大学 USC",
  "Boston University": "波士顿大学 BU",
  "Vanderbilt University": "范德堡大学",
  "Washington University in St. Louis": "圣路易斯华盛顿大学 WUSTL",
  "Emory University": "埃默里大学",
  "University of Rochester": "罗切斯特大学",
  "Brandeis University": "布兰代斯大学",
  // HK
  "University of Hong Kong": "香港大学 港大 HKU",
  "Chinese University of Hong Kong": "香港中文大学 港中文 CUHK",
  "Hong Kong University of Science and Technology": "香港科技大学 港科大 HKUST",
  "City University of Hong Kong": "香港城市大学 城大 CityU",
  "Hong Kong Polytechnic University": "香港理工大学 港理工 PolyU",
  "Hong Kong Baptist University": "香港浸会大学 浸会 HKBU",
  "Lingnan University": "岭南大学",
  // SG
  "National University of Singapore": "新加坡国立大学 NUS",
  "Nanyang Technological University": "南洋理工大学 NTU",
  "Singapore Management University": "新加坡管理大学 SMU",
  // AU
  "University of Melbourne": "墨尔本大学",
  "University of Sydney": "悉尼大学",
  "UNSW Sydney": "新南威尔士大学 UNSW",
  "ANU": "澳大利亚国立大学 澳国立",
  "Monash University": "莫纳什大学 蒙纳士",
  "University of Queensland": "昆士兰大学 UQ",
  "University of Adelaide": "阿德莱德大学",
  "University of Western Australia": "西澳大学 UWA",
  "Macquarie University": "麦考瑞大学",
  "UTS": "悉尼科技大学",
  "RMIT University": "皇家墨尔本理工 RMIT",
  "Deakin University": "迪肯大学",
  "QUT": "昆士兰科技大学",
  // FR
  "HEC Paris": "巴黎高商 HEC",
  "ESSEC Business School": "ESSEC高商",
  "ESCP Business School": "ESCP高商",
  "EDHEC Business School": "EDHEC高商",
  "SKEMA Business School": "SKEMA高商",
  "EMLYON Business School": "里昂高商 EMLYON",
  "IESEG School of Management": "IESEG高商",
  "Grenoble Ecole de Management": "格勒高商 GEM",
  "NEOMA Business School": "诺欧高商 NEOMA",
  "Toulouse Business School": "图卢兹高商 TBS",
  "Audencia Business School": "南特高商 Audencia",
  "Kedge Business School": "KEDGE高商",
  "Montpellier Business School": "蒙彼利埃高商 MBS",
  "ICN Business School": "ICN高商",
  "Institut Mines-Télécom Business School": "IMT高商",
  "Rennes School of Business": "雷恩高商",
};

// Build school CN lookup for search
const schoolCnMap = new Map<string, string>();
for (const [en, cn] of Object.entries(SCHOOL_CN)) {
  schoolCnMap.set(en, cn.toLowerCase());
}

// Build lookup maps
const empMap = new Map<string, RawEmployment>();
for (const e of employment) {
  empMap.set(e.program_key ?? `${e.school_name}__${e.program_name}`, e);
}

// Extract unique values for filters
const allCountries = Array.from(new Set(programs.map((p) => (p as any).country as string).filter(Boolean))).sort();
const allCategories = Array.from(new Set(programs.map((p) => p.program_category).filter(Boolean))).sort();

function getSchoolsByCountry(country: string): string[] {
  const filtered = country === "all" ? programs : programs.filter((p) => (p as any).country === country);
  return Array.from(new Set(filtered.map((p) => p.school_name))).sort();
}

function getCitiesByCountry(country: string): string[] {
  const filtered = country === "all" ? programs : programs.filter((p) => (p as any).country === country);
  return Array.from(new Set(filtered.map((p) => p.location).filter(Boolean))).sort();
}

export default function ExplorePage() {
  const { favorites, toggle: toggleFav, loaded: favsLoaded } = useFavorites();
  const { requireAuth } = useAuthContext();

  function guardedToggleFav(id: number) {
    if (!requireAuth(() => toggleFav(id))) return;
    toggleFav(id);
  }

  const [filterCountry, setFilterCountry] = useState("all");
  const [filterSchool, setFilterSchool] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterGMAT, setFilterGMAT] = useState(false);
  const [filterNoWE, setFilterNoWE] = useState(false);
  const [sortBy, setSortBy] = useState("brand");
  const [searchText, setSearchText] = useState("");
  const [showCount, setShowCount] = useState(PAGE_SIZE);

  const schools = useMemo(() => getSchoolsByCountry(filterCountry), [filterCountry]);
  const cities = useMemo(() => getCitiesByCountry(filterCountry), [filterCountry]);

  // Read school param from URL on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const school = params.get("school");
    if (school) setFilterSchool(school);
  }, []);

  const filtered = useMemo(() => {
    let arr = programs;
    const hasSearch = searchText.trim().length > 0;

    // When searching, skip country/school/city filters so search is global
    if (!hasSearch) {
      if (filterCountry !== "all") arr = arr.filter((p) => (p as any).country === filterCountry);
      if (filterSchool !== "all") arr = arr.filter((p) => p.school_name === filterSchool);
      if (filterCity !== "all") arr = arr.filter((p) => p.location === filterCity);
    }
    if (filterCategory !== "all") arr = arr.filter((p) => p.program_category === filterCategory);
    if (filterGMAT) arr = arr.filter((p) => !p.gmat_required);
    if (filterNoWE) arr = arr.filter((p) => !p.work_experience_required);
    if (hasSearch) {
      const q = searchText.toLowerCase().trim();
      arr = arr.filter((p) =>
        p.school_name.toLowerCase().includes(q) ||
        p.program_name.toLowerCase().includes(q) ||
        p.program_category.toLowerCase().includes(q) ||
        (p.location || "").toLowerCase().includes(q) ||
        (schoolCnMap.get(p.school_name) || "").includes(q)
      );
    }

    return [...arr].sort((a, b) => {
      switch (sortBy) {
        case "brand": return b.brand_score - a.brand_score;
        case "difficulty": return b.admission_difficulty_score - a.admission_difficulty_score;
        case "cost_asc": return (a.tuition_fee ?? 99999) - (b.tuition_fee ?? 99999);
        case "cost_desc": return (b.tuition_fee ?? 0) - (a.tuition_fee ?? 0);
        case "salary": {
          const sa = empMap.get(a.program_key)?.average_salary ?? 0;
          const sb = empMap.get(b.program_key)?.average_salary ?? 0;
          return sb - sa;
        }
        case "school": return a.school_name.localeCompare(b.school_name);
        default: return b.brand_score - a.brand_score;
      }
    });
  }, [filterCountry, filterSchool, filterCategory, filterCity, filterGMAT, filterNoWE, sortBy, searchText]);

  const display = filtered.slice(0, showCount);
  const hasMore = filtered.length > showCount;

  // Stats
  const schoolCount = new Set(filtered.map((p) => p.school_name)).size;

  function resetFilters() {
    setFilterCountry("all");
    setFilterSchool("all");
    setFilterCategory("all");
    setFilterCity("all");
    setFilterGMAT(false);
    setFilterNoWE(false);
    setSearchText("");
    setShowCount(PAGE_SIZE);
  }

  function handleFilterChange() {
    setShowCount(PAGE_SIZE);
  }

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Search + Filters */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
          {/* Search bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="搜索学校、项目名称、方向..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); handleFilterChange(); }}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className={filterSelect}
              value={filterCountry}
              onChange={(e) => { setFilterCountry(e.target.value); setFilterSchool("all"); setFilterCity("all"); handleFilterChange(); }}
            >
              <option value="all">全部国家/地区</option>
              {allCountries.map((c) => (
                <option key={c} value={c}>{COUNTRY_FLAG[c] || ""} {c}</option>
              ))}
            </select>

            <select
              className={filterSelect}
              value={filterSchool}
              onChange={(e) => { setFilterSchool(e.target.value); handleFilterChange(); }}
            >
              <option value="all">全部学校 ({schools.length})</option>
              {schools.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              className={filterSelect}
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); handleFilterChange(); }}
            >
              <option value="all">全部专业方向</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              className={filterSelect}
              value={filterCity}
              onChange={(e) => { setFilterCity(e.target.value); handleFilterChange(); }}
            >
              <option value="all">全部城市</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none whitespace-nowrap">
              <input type="checkbox" checked={filterGMAT}
                onChange={(e) => { setFilterGMAT(e.target.checked); handleFilterChange(); }} className="rounded" />
              免GMAT
            </label>

            <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none whitespace-nowrap">
              <input type="checkbox" checked={filterNoWE}
                onChange={(e) => { setFilterNoWE(e.target.checked); handleFilterChange(); }} className="rounded" />
              无需工作经验
            </label>

            <div className="flex-1" />

            <select
              className={filterSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="brand">品牌分↓</option>
              <option value="difficulty">难度↓</option>
              <option value="cost_asc">学费↑</option>
              <option value="cost_desc">学费↓</option>
              <option value="salary">薪资↓</option>
              <option value="school">学校名A-Z</option>
            </select>

            <button
              onClick={resetFilters}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              重置
            </button>
          </div>

          {/* Stats bar */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span>共 <strong className="text-gray-700">{filtered.length}</strong> 个项目</span>
            <span>来自 <strong className="text-gray-700">{schoolCount}</strong> 所学校</span>
            {filterSchool !== "all" && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {filterSchool}
              </span>
            )}
          </div>
        </div>

        {/* Program List */}
        <div className="space-y-3">
          {display.map((p) => {
            const emp = empMap.get(p.program_key) ?? null;
            return (
              <ExploreCard key={p.id} program={p} employment={emp}
                isFavorited={favsLoaded && favorites.has(p.id)}
                onToggleFavorite={() => guardedToggleFav(p.id)}
                onViewSchool={(school) => {
                setFilterSchool(school);
                setShowCount(PAGE_SIZE);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }} />
            );
          })}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="text-center py-4">
            <button
              onClick={() => setShowCount((n) => n + PAGE_SIZE)}
              className="px-8 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
            >
              加载更多 · 还有 {filtered.length - showCount} 个
            </button>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">没有找到匹配的项目</p>
            <p className="text-sm">试试放宽筛选条件</p>
          </div>
        )}
      </main>

      <footer className="text-center text-gray-400 text-xs py-8 mt-8 border-t">
        数据来源：各国大学官方网站、QS/FT 排名等公开数据 · 仅供参考
      </footer>
    </div>
  );
}

// ── Explore Card ─────────────────────────────────────────────────

function ExploreCard({
  program: p,
  employment: e,
  isFavorited = false,
  onToggleFavorite,
  onViewSchool,
}: {
  program: RawProgram;
  employment: RawEmployment | null;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  onViewSchool: (school: string) => void;
}) {
  const country = (p as any).country as string;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-4 sm:flex sm:items-start sm:gap-4">
        {/* Left: main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{COUNTRY_FLAG[country] || ""}</span>
            <Link
              href={`/school/${encodeURIComponent(p.school_name)}`}
              className="text-xs text-gray-500 hover:text-blue-600 hover:underline font-medium truncate"
              title={`查看${p.school_name}学校详情`}
            >
              {p.school_name}
            </Link>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{p.school_tier}</span>
            <button
              onClick={() => onViewSchool(p.school_name)}
              className="text-[10px] text-blue-400 hover:text-blue-600 whitespace-nowrap"
              title={`筛选${p.school_name}全部项目`}
            >
              筛选该校
            </button>
          </div>

          <Link
            href={`/program/${p.id}`}
            className="text-[15px] font-semibold text-blue-700 hover:underline leading-tight block mb-2"
          >
            {p.program_name}
          </Link>

          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-medium">{p.program_category}</span>
            {p.location && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">📍 {p.location}</span>}
            {p.duration && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">⏱ {p.duration}</span>}
            {p.degree_type && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">{p.degree_type}</span>}
          </div>

          {/* Requirements row */}
          <div className="flex flex-wrap gap-2 text-[10px]">
            {p.ielts_requirement && (
              <span className="text-gray-500">IELTS {p.ielts_requirement}</span>
            )}
            {p.gmat_required && (
              <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">需要GMAT</span>
            )}
            {p.gre_required && (
              <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">需要GRE</span>
            )}
            {p.work_experience_required && (
              <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded">需要工作经验</span>
            )}
            {!p.gmat_required && !p.gre_required && (
              <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded">免GMAT/GRE</span>
            )}
            {!p.work_experience_required && (
              <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded">接受应届生</span>
            )}
          </div>
        </div>

        {/* Right: scores + cost + fav */}
        <div className="mt-3 sm:mt-0 sm:w-48 flex sm:flex-col gap-3 sm:gap-2 sm:items-end shrink-0">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              title={isFavorited ? "取消收藏" : "收藏此项目"}
              className={`text-lg transition-transform hover:scale-110 self-end ${isFavorited ? "text-yellow-400" : "text-gray-300 hover:text-yellow-300"}`}
            >
              {isFavorited ? "★" : "☆"}
            </button>
          )}
          <div className="flex gap-2">
            <ScorePill label="品牌" value={p.brand_score} />
            <ScorePill label="难度" value={p.admission_difficulty_score} />
            <ScorePill label="地理" value={p.location_score} />
          </div>

          <div className="text-right text-xs text-gray-600">
            {p.tuition_fee ? (
              <span className="font-semibold">
                {CURRENCY_SYMBOL[p.tuition_currency] || ""}{p.tuition_fee.toLocaleString()}<span className="text-gray-400 font-normal">/yr</span>
              </span>
            ) : (
              <span className="text-gray-400">学费待查</span>
            )}
          </div>

          {e?.average_salary && (
            <div className="text-right text-[11px] text-gray-500">
              均薪 £{e.average_salary.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? "text-blue-700 bg-blue-50" : value >= 6 ? "text-gray-700 bg-gray-100" : "text-gray-500 bg-gray-50";
  return (
    <div className={`text-center px-2 py-1 rounded-lg ${color}`}>
      <div className="text-[9px] text-gray-400">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

const filterSelect = "text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:border-blue-400 bg-white max-w-[180px]";

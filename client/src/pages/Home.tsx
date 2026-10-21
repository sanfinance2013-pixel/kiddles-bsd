import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  Bell,
  BookOpen,
  CalendarCheck,
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileBarChart,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Receipt,
  Search,
  ScanLine,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  UserRound,
  ReceiptText,
  Users,
  WalletCards,
  X,
} from "lucide-react";

const logoUrl = "/kiddles-logo.jpeg";

type PageKey =
  | "dashboard"
  | "tasks"
  | "crm"
  | "schedule"
  | "attendance"
  | "students"
  | "billing"
  | "finance"
  | "portal"
  | "settings";
type ModalKey = "lead" | "student" | "invoice" | "expense" | "class" | null;
type Tone = "pink" | "lime" | "blue" | "orange" | "ink";

type NavItem = {
  key: PageKey;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "Utama",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { key: "tasks", label: "Tugas Hari Ini", icon: ClipboardList, badge: "7" },
    ],
  },
  {
    title: "Operasional",
    items: [
      { key: "crm", label: "Pendaftaran & CRM", icon: UserPlus, badge: "12" },
      { key: "schedule", label: "Jadwal & Kelas", icon: CalendarDays },
      { key: "attendance", label: "Absensi", icon: ClipboardCheck, badge: "3" },
      { key: "students", label: "Murid", icon: GraduationCap },
    ],
  },
  {
    title: "Keuangan",
    items: [
      { key: "billing", label: "Invoice & Pembayaran", icon: Receipt, badge: "8" },
      { key: "finance", label: "Keuangan & Laporan", icon: CircleDollarSign },
    ],
  },
  {
    title: "Lainnya",
    items: [
      { key: "portal", label: "Portal Murid", icon: BookOpenCheck },
      { key: "settings", label: "Pengaturan", icon: Settings2 },
    ],
  },
];

const leads = [
  { name: "Kezia Anindya", guardian: "Diana Pratiwi", program: "Kinder", date: "16 Okt", source: "Instagram", tone: "pink" as Tone },
  { name: "Rafael Wijaya", guardian: "Maya Wijaya", program: "Primary", date: "17 Okt", source: "Referral", tone: "blue" as Tone },
  { name: "Nathaniel Lim", guardian: "Andre Lim", program: "Teens", date: "18 Okt", source: "Website", tone: "orange" as Tone },
  { name: "Alya Zahra", guardian: "Rina Sari", program: "Conversation", date: "19 Okt", source: "Walk-in", tone: "lime" as Tone },
  { name: "Jonathan Kurniawan", guardian: "Sinta Kurniawan", program: "Primary", date: "20 Okt", source: "Google", tone: "blue" as Tone },
  { name: "Michelle Tan", guardian: "Robert Tan", program: "Dewasa/HSK", date: "21 Okt", source: "WhatsApp", tone: "pink" as Tone },
];

const students = [
  { name: "Nadine Putri", initials: "NP", program: "Kinder", guardian: "Ria Putri", sessions: 4, status: "Aktif", tone: "pink" as Tone, last: "15 Okt 2026" },
  { name: "William Hartono", initials: "WH", program: "Primary", guardian: "Sari Hartono", sessions: 8, status: "Aktif", tone: "blue" as Tone, last: "14 Okt 2026" },
  { name: "Gabriel Santoso", initials: "GS", program: "Teens", guardian: "Diana Santoso", sessions: 2, status: "Hampir habis", tone: "orange" as Tone, last: "13 Okt 2026" },
  { name: "Mikaela Lestari", initials: "ML", program: "Primary", guardian: "Riko Lestari", sessions: 11, status: "Aktif", tone: "lime" as Tone, last: "15 Okt 2026" },
  { name: "Felicia Huang", initials: "FH", program: "Conversation", guardian: "Felicia Huang", sessions: 6, status: "Aktif", tone: "pink" as Tone, last: "12 Okt 2026" },
  { name: "Darren Wijaya", initials: "DW", program: "Dewasa/HSK", guardian: "Darren Wijaya", sessions: 1, status: "Hampir habis", tone: "orange" as Tone, last: "10 Okt 2026" },
  { name: "Clarissa Tanu", initials: "CT", program: "Kinder", guardian: "Maya Tanu", sessions: 7, status: "Cuti", tone: "blue" as Tone, last: "01 Okt 2026" },
];

const classes = [
  { time: "08:30", duration: "60 mnt", name: "Kinder A — K1", program: "Kinder", teacher: "Bu Agnes", room: "Ruang 02", seats: "5/8", color: "pink" as Tone },
  { time: "10:00", duration: "90 mnt", name: "Primary B — P2", program: "Primary", teacher: "Kak Daniel", room: "Ruang 03", seats: "7/8", color: "blue" as Tone },
  { time: "13:30", duration: "60 mnt", name: "Teens Starter", program: "Teens", teacher: "Kak Vania", room: "Online", seats: "4/6", color: "orange" as Tone },
  { time: "16:00", duration: "60 mnt", name: "Conversation Club", program: "Conversation", teacher: "Bu Agnes", room: "Ruang 01", seats: "6/8", color: "lime" as Tone },
  { time: "16:00", duration: "60 mnt", name: "Kelas pengganti — Kinder", program: "Kinder", teacher: "Bu Agnes", room: "Ruang 02", seats: "3/6", color: "pink" as Tone },
  { time: "18:30", duration: "90 mnt", name: "HSK 3 Preparation", program: "Dewasa/HSK", teacher: "Kak Daniel", room: "Online", seats: "5/6", color: "blue" as Tone },
];

const invoices = [
  { id: "INV-KL-2610148", student: "Nadine Putri", package: "Kinder Term 4", amount: 1850000, due: "18 Okt 2026", status: "Jatuh tempo", tone: "orange" as Tone },
  { id: "INV-KL-2610149", student: "William Hartono", package: "Primary Term 4", amount: 2200000, due: "20 Okt 2026", status: "Belum bayar", tone: "blue" as Tone },
  { id: "INV-KL-2610138", student: "Mikaela Lestari", package: "Primary Term 4", amount: 2200000, due: "12 Okt 2026", status: "Lunas", tone: "lime" as Tone },
  { id: "INV-KL-2610135", student: "Gabriel Santoso", package: "Teens Monthly", amount: 1200000, due: "10 Okt 2026", status: "Sebagian", tone: "pink" as Tone },
  { id: "INV-KL-2610128", student: "Felicia Huang", package: "Conversation 8x", amount: 1600000, due: "05 Okt 2026", status: "Lunas", tone: "lime" as Tone },
];

const expenseItems = [
  { label: "Honor guru — September", category: "Honor guru", amount: 7850000, date: "30 Sep 2026", tone: "pink" as Tone },
  { label: "Sewa ruko Oktober", category: "Sewa", amount: 4200000, date: "01 Okt 2026", tone: "orange" as Tone },
  { label: "Internet & listrik", category: "Listrik/internet", amount: 1280000, date: "03 Okt 2026", tone: "blue" as Tone },
  { label: "Flyer trial class", category: "Marketing", amount: 650000, date: "07 Okt 2026", tone: "lime" as Tone },
];

const todayTasks = [
  { id: "task-1", role: "Admin", priority: "Terlambat", title: "Follow-up Kezia Anindya", detail: "Lead baru masuk 26 jam lalu · SLA 24 jam", target: "crm", tone: "pink" as Tone },
  { id: "task-2", role: "Admin", priority: "Hari ini", title: "Konfirmasi 3 trial minggu ini", detail: "Trial pertama pukul 10:00 · kirim pengingat orang tua", target: "crm", tone: "orange" as Tone },
  { id: "task-3", role: "Admin", priority: "Prioritas", title: "Tawarkan perpanjangan ke Gabriel", detail: "Sisa 2 sesi · status paket hampir habis", target: "students", tone: "lime" as Tone },
  { id: "task-4", role: "Admin", priority: "Jatuh tempo", title: "Tindak lanjuti invoice INV-KL-2610148", detail: "Nadine Putri · Rp 1.850.000 · jatuh tempo hari ini", target: "billing", tone: "blue" as Tone },
  { id: "task-5", role: "Guru", priority: "Hari ini", title: "Isi absensi Primary B — P2", detail: "7 murid terjadwal · Kak Daniel · pukul 10:00", target: "attendance", tone: "blue" as Tone },
  { id: "task-6", role: "Guru", priority: "Belum diisi", title: "Catat materi kelas Kinder A", detail: "Pertemuan selesai 2 jam lalu · catatan materi wajib", target: "attendance", tone: "pink" as Tone },
  { id: "task-7", role: "Owner", priority: "Ringkasan", title: "Periksa bentrok jadwal Bu Agnes", detail: "Ruang 01 dan Ruang 02 · Jumat 16:00", target: "schedule", tone: "orange" as Tone },
];

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const shortMoney = (value: number) => {
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1).replace(".", ",")} jt`;
  return money(value);
};

const pathByPage: Record<PageKey, string> = {
  dashboard: "/",
  tasks: "/tasks",
  crm: "/crm",
  schedule: "/schedule",
  attendance: "/attendance",
  students: "/students",
  billing: "/billing",
  finance: "/finance",
  portal: "/portal",
  settings: "/settings",
};

const pageFromPath = (path: string): PageKey => {
  const entry = (Object.entries(pathByPage) as [PageKey, string][]).find(([, value]) => value === path);
  return entry?.[0] ?? "dashboard";
};

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup ${compact ? "brand-lockup--compact" : ""}`}>
      <div className="brand-image-wrap">
        <img src={logoUrl} alt="Kiddles — Kids Learning Chinese" />
      </div>
      {!compact && (
        <div className="branch-lockup">
          <span>Learning center operations</span>
          <strong>BSD · Tangerang</strong>
        </div>
      )}
    </div>
  );
}

function Avatar({ initials, tone = "pink", size = "md" }: { initials: string; tone?: Tone; size?: "sm" | "md" | "lg" }) {
  return <span className={`avatar avatar--${tone} avatar--${size}`}>{initials}</span>;
}

function StatusPill({ children, tone = "blue" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

function KpiCard({ label, value, detail, trend, tone, icon: Icon }: { label: string; value: string; detail: string; trend: string; tone: Tone; icon: LucideIcon }) {
  const positive = trend.startsWith("+");
  return (
    <div className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-topline">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon"><Icon size={17} strokeWidth={2.2} /></span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-footer">
        <span className={`trend ${positive ? "trend--up" : "trend--down"}`}>{positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {trend}</span>
        <span className="kpi-detail">{detail}</span>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description, action, onAction }: { eyebrow?: string; title: string; description?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && onAction && <button className="button button--dark" onClick={onAction}>{action}<ChevronRight size={16} /></button>}
    </div>
  );
}

function Dashboard({ onAction, onNavigate }: { onAction: (modal: Exclude<ModalKey, null>) => void; onNavigate: (page: PageKey) => void }) {
  return (
    <div className="page-stack">
      <section className="welcome-card">
        <div className="welcome-copy">
          <span className="eyebrow eyebrow--light">Jumat, 16 Oktober 2026</span>
          <h1>Selamat pagi, Kak Sarah.</h1>
          <p>Semua yang perlu Anda tahu untuk membuat operasional KIDDLES BSD berjalan lancar hari ini.</p>
          <div className="welcome-actions">
            <button className="button button--white" onClick={() => onAction("lead")}><Plus size={16} /> Tambah calon murid</button>
            <button className="button button--translucent" onClick={() => onNavigate("schedule")}><CalendarDays size={16} /> Lihat jadwal hari ini</button>
          </div>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-orbit art-orbit--one" />
          <div className="art-orbit art-orbit--two" />
          <div className="art-card art-card--orange">你好</div>
          <div className="art-card art-card--lime">学</div>
          <div className="art-dot art-dot--pink" />
          <div className="art-dot art-dot--blue" />
          <Sparkles className="art-spark" size={27} />
        </div>
      </section>

      <div className="kpi-grid">
        <KpiCard label="Murid aktif" value="86" detail="vs 82 bulan lalu" trend="+4,8%" tone="pink" icon={GraduationCap} />
        <KpiCard label="Murid baru" value="12" detail="7 dari trial class" trend="+20%" tone="blue" icon={UserPlus} />
        <KpiCard label="Omzet bulan ini" value="Rp 28,6 jt" detail="Target Rp 32 jt" trend="+12,4%" tone="orange" icon={BadgeDollarSign} />
        <KpiCard label="Piutang" value="Rp 6,4 jt" detail="8 invoice perlu ditindak" trend="-8,2%" tone="lime" icon={WalletCards} />
      </div>

      <div className="content-grid content-grid--wide">
        <section className="panel revenue-panel">
          <SectionHeader eyebrow="Performance" title="Omzet bulan ini" description="Pemasukan terverifikasi · Oktober 2026" action="Lihat laporan" onAction={() => onNavigate("finance")} />
          <div className="revenue-overview"><strong>Rp 28.640.000</strong><span className="trend trend--up"><ArrowUpRight size={14} /> 12,4% vs bulan lalu</span></div>
          <div className="bar-chart" aria-label="Grafik omzet per minggu">
            {[42, 58, 51, 74, 66, 83, 71, 92, 78, 88, 84, 96].map((height, index) => (
              <div className="bar-column" key={index}>
                <span className={`bar-fill ${index === 11 ? "bar-fill--active" : ""}`} style={{ height: `${height}%` }} />
                {(index === 0 || index === 3 || index === 6 || index === 9 || index === 11) && <span>{["1 Okt", "8 Okt", "15 Okt", "22 Okt", "30 Okt"][Math.floor(index / 3)]}</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="panel utilization-panel">
          <SectionHeader eyebrow="Kelas" title="Utilisasi kursi" description="Total 6 kelas aktif" />
          <div className="donut-row">
            <div className="donut-chart"><div><strong>78%</strong><span>terisi</span></div></div>
            <div className="donut-legend">
              <div><i className="legend-dot legend-dot--pink" /><span>Primary</span><strong>84%</strong></div>
              <div><i className="legend-dot legend-dot--blue" /><span>Kinder</span><strong>76%</strong></div>
              <div><i className="legend-dot legend-dot--orange" /><span>Teens/HSK</span><strong>71%</strong></div>
            </div>
          </div>
          <div className="mini-insight"><Sparkles size={15} /><span>Ruang 03 hampir penuh. Ada 1 kursi tersisa di Primary B.</span></div>
        </section>
      </div>

      <div className="content-grid content-grid--two-thirds">
        <section className="panel agenda-panel">
          <SectionHeader eyebrow="Agenda" title="Jadwal hari ini" description="5 kelas · 20 murid terjadwal" action="Buka kalender" onAction={() => onNavigate("schedule")} />
          <div className="agenda-list">
            {classes.slice(0, 4).map((item) => (
              <div className="agenda-row" key={item.name}>
                <div className="agenda-time"><strong>{item.time}</strong><span>{item.duration}</span></div>
                <div className={`program-mark program-mark--${item.color}`} />
                <div className="agenda-main"><strong>{item.name}</strong><span>{item.teacher} · {item.room}</span></div>
                <div className="agenda-seats"><span>{item.seats}</span><small>kursi</small></div>
                <button className="icon-button" aria-label={`Detail ${item.name}`}><MoreHorizontal size={18} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="panel alerts-panel">
          <SectionHeader eyebrow="Perlu perhatian" title="Peringatan" description="Tindakan yang sebaiknya selesai hari ini" />
          <div className="alert-list">
            <button className="alert-row" onClick={() => onNavigate("billing")}><span className="alert-icon alert-icon--orange"><WalletCards size={17} /></span><span><strong>8 invoice jatuh tempo</strong><small>Prioritas · total Rp 6,4 jt</small></span><ChevronRight size={17} /></button>
            <button className="alert-row" onClick={() => onNavigate("crm")}><span className="alert-icon alert-icon--pink"><UserPlus size={17} /></span><span><strong>3 trial belum dikonfirmasi</strong><small>Trial pertama pukul 10:00</small></span><ChevronRight size={17} /></button>
            <button className="alert-row" onClick={() => onNavigate("students")}><span className="alert-icon alert-icon--lime"><BookOpenCheck size={17} /></span><span><strong>5 paket hampir habis</strong><small>Hubungi orang tua minggu ini</small></span><ChevronRight size={17} /></button>
            <button className="alert-row" onClick={() => onNavigate("schedule")}><span className="alert-icon alert-icon--blue"><AlertTriangle size={17} /></span><span><strong>1 bentrok guru terdeteksi</strong><small>Bu Agnes · Ruang 01 & 02 · 16:00</small></span><ChevronRight size={17} /></button>
          </div>
        </section>
      </div>

      <section className="panel leads-snapshot">
        <SectionHeader eyebrow="CRM snapshot" title="Pendaftar terbaru" description="Lead yang masuk dalam 7 hari terakhir" action="Buka CRM" onAction={() => onNavigate("crm")} />
        <div className="snapshot-table-wrap">
          <table className="data-table">
            <thead><tr><th>Calon murid</th><th>Program</th><th>Sumber</th><th>Trial</th><th>Status</th><th /></tr></thead>
            <tbody>
              {leads.slice(0, 4).map((lead) => <tr key={lead.name}><td><div className="person-cell"><Avatar initials={lead.name.split(" ").map((part) => part[0]).join("").slice(0, 2)} tone={lead.tone} /><span><strong>{lead.name}</strong><small>{lead.guardian}</small></span></div></td><td>{lead.program}</td><td>{lead.source}</td><td>{lead.date}</td><td><StatusPill tone={lead.tone}>Baru</StatusPill></td><td><button className="icon-button"><MoreHorizontal size={18} /></button></td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TasksPage({ role, onNavigate, onNotify }: { role: string; onNavigate: (page: PageKey) => void; onNotify: (message: string) => void }) {
  const [done, setDone] = useState<string[]>([]);
  const visibleTasks = todayTasks.filter((task) => role === "Owner" || role === "Murid/Orang Tua" ? task.role === role || task.role === "Admin" : task.role === role);
  const complete = (taskId: string) => {
    setDone((current) => current.includes(taskId) ? current : [...current, taskId]);
    onNotify("Tugas ditandai selesai untuk sesi ini.");
  };
  return <div className="page-stack">
    <SectionHeader eyebrow="Workflow operasional" title="Tugas Hari Ini" description="Pekerjaan yang perlu diselesaikan berdasarkan peran dan prioritas." />
    <section className="tasks-intro panel">
      <div><span className="eyebrow">{role}</span><h3>{visibleTasks.filter((task) => !done.includes(task.id)).length} tugas masih terbuka</h3><p>Setiap tugas mengarah langsung ke modul yang perlu ditindaklanjuti.</p></div>
      <div className="tasks-summary"><strong>{done.length}</strong><span>selesai sesi ini</span></div>
    </section>
    <div className="task-list">
      {visibleTasks.map((task) => {
        const isDone = done.includes(task.id);
        return <article className={`task-card ${isDone ? "task-card--done" : ""}`} key={task.id}>
          <span className={`task-icon task-icon--${task.tone}`}><ClipboardList size={18} /></span>
          <div className="task-copy"><div className="task-meta"><span className={`task-priority task-priority--${task.tone}`}>{task.priority}</span><span>{task.role}</span></div><strong>{task.title}</strong><p>{task.detail}</p></div>
          <div className="task-actions">{!isDone && <button className="button button--soft" onClick={() => onNavigate(task.target as PageKey)}>Buka tindakan <ChevronRight size={15} /></button>}<button className={`button ${isDone ? "button--outline" : "button--dark"}`} onClick={() => complete(task.id)}>{isDone ? <><Check size={15} /> Selesai</> : "Tandai selesai"}</button></div>
        </article>;
      })}
    </div>
  </div>;
}

type HomeIconItem = { label: string; helper: string; icon: LucideIcon; tone: Tone; page?: PageKey; badge?: string; primary?: boolean };

const roleLabel: Record<string, string> = { Owner: "Owner Cabang", Admin: "Admin Operasional", Guru: "Guru / Teacher", "Murid/Orang Tua": "Orang Tua / Parent" };

const homeItemsByRole: Record<string, HomeIconItem[]> = {
  Owner: [
    { label: "Dashboard", helper: "Ringkasan", icon: LayoutDashboard, tone: "pink", page: "dashboard" },
    { label: "Keuangan", helper: "Omzet & laba", icon: CircleDollarSign, tone: "orange", page: "finance" },
    { label: "Laporan", helper: "Insight cabang", icon: FileBarChart, tone: "blue", page: "finance" },
    { label: "Murid aktif", helper: "86 murid", icon: GraduationCap, tone: "lime", page: "students" },
    { label: "Jadwal", helper: "6 kelas", icon: CalendarDays, tone: "blue", page: "schedule" },
    { label: "Payroll", helper: "4 guru", icon: WalletCards, tone: "orange", page: "finance" },
    { label: "Pengumuman", helper: "2 draft", icon: Megaphone, tone: "pink", page: "settings" },
    { label: "Pengaturan", helper: "Cabang", icon: Settings2, tone: "ink", page: "settings" },
  ],
  Admin: [
    { label: "Pendaftaran", helper: "12 lead", icon: UserPlus, tone: "pink", page: "crm" },
    { label: "Murid", helper: "86 aktif", icon: GraduationCap, tone: "lime", page: "students" },
    { label: "Invoice", helper: "8 perlu aksi", icon: ReceiptText, tone: "orange", page: "billing", badge: "8" },
    { label: "Pembayaran", helper: "3 bukti", icon: WalletCards, tone: "blue", page: "billing", badge: "3" },
    { label: "Jadwal", helper: "6 kelas", icon: CalendarDays, tone: "blue", page: "schedule" },
    { label: "Absensi", helper: "3 belum", icon: ClipboardCheck, tone: "lime", page: "attendance", badge: "3" },
    { label: "Scan QR", helper: "Kelas aktif", icon: ScanLine, tone: "pink", page: "attendance", primary: true },
    { label: "Tugas", helper: "7 terbuka", icon: ClipboardList, tone: "orange", page: "tasks", badge: "7" },
    { label: "Pengumuman", helper: "Cabang", icon: Megaphone, tone: "blue", page: "settings" },
    { label: "Laporan", helper: "Keuangan", icon: FileBarChart, tone: "ink", page: "finance" },
  ],
  Guru: [
    { label: "Jadwal Saya", helper: "3 kelas", icon: CalendarDays, tone: "blue", page: "schedule" },
    { label: "Kelas berikutnya", helper: "10:00", icon: CalendarCheck, tone: "orange", page: "schedule" },
    { label: "Scan QR", helper: "Kelas aktif", icon: ScanLine, tone: "pink", page: "attendance", primary: true },
    { label: "Absensi", helper: "7 murid", icon: ClipboardCheck, tone: "lime", page: "attendance" },
    { label: "Catatan materi", helper: "1 belum", icon: BookOpen, tone: "blue", page: "attendance" },
    { label: "Evaluasi", helper: "Minggu ini", icon: FileText, tone: "orange", page: "students" },
  ],
  "Murid/Orang Tua": [
    { label: "Jadwal anak", helper: "Besok 08:30", icon: CalendarDays, tone: "blue", page: "schedule" },
    { label: "Sisa course", helper: "6 sesi", icon: BookOpenCheck, tone: "lime", page: "portal" },
    { label: "Absensi", helper: "96% hadir", icon: ClipboardCheck, tone: "pink", page: "portal" },
    { label: "Invoice", helper: "Rp1.000.000", icon: ReceiptText, tone: "orange", page: "billing" },
    { label: "Rapor", helper: "Terbaru", icon: FileText, tone: "blue", page: "portal" },
    { label: "Pengumuman", helper: "2 baru", icon: Megaphone, tone: "pink", page: "portal", badge: "2" },
  ],
};

const homeAnnouncements = [
  { label: "Penting", title: "Perubahan jadwal kelas Primary B", detail: "Jumat, 24 Oktober pindah ke Ruang 02.", date: "Hari ini", tone: "pink" as Tone },
  { label: "Informasi", title: "KIDDLES BSD libur pada 28 Oktober", detail: "Kelas pengganti akan diinformasikan Admin.", date: "Kemarin", tone: "blue" as Tone },
  { label: "Promo", title: "Program Conversation Club dibuka", detail: "Ajak keluarga mencoba kelas trial minggu ini.", date: "14 Okt", tone: "lime" as Tone },
];

function HomeIconBase({ role, onNavigate, onNotify, onRoleChange }: { role: string; onNavigate: (page: PageKey) => void; onNotify: (message: string) => void; onRoleChange: (nextRole: string) => void }) {
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const items = homeItemsByRole[role] ?? homeItemsByRole.Owner;
  const announcement = homeAnnouncements[announcementIndex];
  const nextAnnouncement = (direction: number) => setAnnouncementIndex((current) => (current + direction + homeAnnouncements.length) % homeAnnouncements.length);
  const canScan = role === "Guru" || role === "Admin";
  const todo = role === "Guru"
    ? [{ title: "Primary B — P2", detail: "7 murid · Ruang 03 · Scan QR", time: "10:00", icon: CalendarCheck, tone: "blue" as Tone, page: "attendance" as PageKey }, { title: "Catat materi Kinder A", detail: "Pertemuan selesai · belum diisi", time: "12:00", icon: BookOpen, tone: "pink" as Tone, page: "attendance" as PageKey }, { title: "Evaluasi William Hartono", detail: "Mencapai 8 pertemuan", time: "Jumat", icon: FileText, tone: "orange" as Tone, page: "students" as PageKey }]
    : role === "Murid/Orang Tua"
      ? [{ title: "Nadine · Kinder A", detail: "Besok · Ruang 02 · 60 menit", time: "08:30", icon: CalendarCheck, tone: "blue" as Tone, page: "schedule" as PageKey }, { title: "Sisa course", detail: "Paket Kinder Term 4", time: "6 sesi", icon: BookOpenCheck, tone: "lime" as Tone, page: "portal" as PageKey }, { title: "Invoice berikutnya", detail: "Jatuh tempo 20 Okt 2026", time: "Rp1 jt", icon: ReceiptText, tone: "orange" as Tone, page: "billing" as PageKey }]
      : role === "Admin"
        ? [{ title: "Follow-up Kezia Anindya", detail: "Lead baru · SLA terlewati 2 jam", time: "Prioritas", icon: UserPlus, tone: "pink" as Tone, page: "crm" as PageKey }, { title: "3 bukti pembayaran", detail: "Menunggu verifikasi admin", time: "Hari ini", icon: WalletCards, tone: "blue" as Tone, page: "billing" as PageKey }, { title: "Primary B — P2", detail: "Absensi guru belum lengkap", time: "10:00", icon: ClipboardCheck, tone: "orange" as Tone, page: "attendance" as PageKey }, { title: "Gabriel · sisa 2 sesi", detail: "Tawarkan perpanjangan paket", time: "Aksi", icon: GraduationCap, tone: "lime" as Tone, page: "students" as PageKey }]
        : [{ title: "Ringkasan operasional", detail: "86 murid aktif · omzet Rp28,6 jt", time: "Hari ini", icon: LayoutDashboard, tone: "pink" as Tone, page: "finance" as PageKey }, { title: "Payroll guru", detail: "4 slip menunggu ditinjau", time: "Prioritas", icon: WalletCards, tone: "orange" as Tone, page: "finance" as PageKey }, { title: "Invoice & bukti bayar", detail: "8 invoice perlu perhatian", time: "Hari ini", icon: ReceiptText, tone: "blue" as Tone, page: "billing" as PageKey }, { title: "Bentrok jadwal Bu Agnes", detail: "Ruang 01 & 02 · Jumat 16:00", time: "Periksa", icon: AlertTriangle, tone: "lime" as Tone, page: "schedule" as PageKey }];
  return <div className="home-icon-base">
    <header className="home-base-header"><div className="home-brand"><img src={logoUrl} alt="KIDDLES — Kids Learning Chinese" /><span>KIDDLES BSD</span></div><div className="home-user"><div><strong>Selamat pagi, Kak Sarah</strong><span>{roleLabel[role]} · West Village Business Park</span></div><label className="home-role-demo"><small>Mode demo</small><select value={role} onChange={(event) => onRoleChange(event.target.value)}><option>Owner</option><option>Admin</option><option>Guru</option><option>Murid/Orang Tua</option></select></label><button className="icon-button notification-button" onClick={() => onNotify("Tidak ada notifikasi baru.")} aria-label="Notifikasi"><Bell size={19} /><i /></button><Avatar initials="SA" tone="pink" size="md" /></div></header>
    <div className="home-base-inner">
      <section className={`announcement-card announcement-card--${announcement.tone}`}><div className="announcement-copy"><span className="home-kicker"><Megaphone size={13} /> Pengumuman · {announcement.date}</span><strong>{announcement.title}</strong><p>{announcement.detail}</p><button className="button button--white" onClick={() => onNotify("Pengumuman ditandai sudah dibaca.")}>Lihat detail <ChevronRight size={14} /></button></div><div className="announcement-controls"><button className="icon-button" onClick={() => nextAnnouncement(-1)} aria-label="Pengumuman sebelumnya">‹</button><span>{announcementIndex + 1} / {homeAnnouncements.length}</span><button className="icon-button" onClick={() => nextAnnouncement(1)} aria-label="Pengumuman berikutnya">›</button></div></section>
      <section className="home-section"><div className="home-section-head"><div><span className="eyebrow">Akses cepat</span><h2>Menu {roleLabel[role]}</h2></div><span className="home-section-note">Pilih aktivitas untuk mulai</span></div><div className="home-icon-grid">{items.map((item) => { const Icon = item.icon; return <button className={`home-icon-tile home-icon-tile--${item.tone} ${item.primary ? "home-icon-tile--primary" : ""}`} key={item.label} onClick={() => item.page ? onNavigate(item.page) : onNotify(`${item.label} segera tersedia.`)}><span className="home-icon-badge"><Icon size={20} /></span><strong>{item.label}</strong><small>{item.helper}</small>{item.badge && <em>{item.badge}</em>}</button>; })}</div></section>
      {canScan && <section className="scan-card"><div className="scan-card-icon"><ScanLine size={25} /></div><div className="scan-card-copy"><span className="home-kicker">Absensi kelas aktif</span><strong>Primary B — P2</strong><p>Hari ini · 10:00 · Ruang 03 · QR aktif sampai 11:45</p><div className="scan-progress"><span><i style={{ width: "71%" }} /></span><small>5 dari 7 murid sudah hadir</small></div></div><button className="button button--dark" onClick={() => onNavigate("attendance")}>Buka kamera & Scan QR <ChevronRight size={15} /></button></section>}
      <section className="home-section"><div className="home-section-head"><div><span className="eyebrow">To-do & agenda</span><h2>Yang perlu dilakukan</h2></div><button className="button button--outline" onClick={() => onNavigate("tasks")}>Lihat semua <ChevronRight size={15} /></button></div><div className="home-todo-list">{todo.map((item) => { const Icon = item.icon; return <button className="home-todo-row" key={item.title} onClick={() => onNavigate(item.page)}><span className={`home-todo-icon home-todo-icon--${item.tone}`}><Icon size={17} /></span><span className="home-todo-copy"><strong>{item.title}</strong><small>{item.detail}</small></span><b>{item.time}</b><ChevronRight size={16} /></button>; })}</div></section>
      <footer className="home-base-footer"><Sparkles size={15} /> Fun learning, clear operations · <strong>KIDDLES BSD</strong></footer>
    </div>
  </div>;
}

function CrmPage({ onAction, query }: { onAction: (modal: Exclude<ModalKey, null>) => void; query: string }) {
  const filtered = leads.filter((lead) => `${lead.name} ${lead.guardian} ${lead.program}`.toLowerCase().includes(query.toLowerCase()));
  const columns = [
    { label: "Baru", count: 4, tone: "pink" as Tone, items: filtered.slice(0, 2) },
    { label: "Dihubungi", count: 3, tone: "blue" as Tone, items: filtered.slice(2, 3) },
    { label: "Trial dijadwalkan", count: 3, tone: "orange" as Tone, items: filtered.slice(3, 4) },
    { label: "Sudah trial", count: 2, tone: "lime" as Tone, items: filtered.slice(4, 5) },
    { label: "Daftar", count: 1, tone: "lime" as Tone, items: [] },
    { label: "Tidak jadi", count: 1, tone: "pink" as Tone, items: filtered.slice(5, 6) },
  ];
  return <div className="page-stack"><SectionHeader eyebrow="Pendaftaran & CRM" title="Pipeline calon murid" description="Kelola perjalanan calon murid dari kontak pertama sampai daftar." action="Tambah calon murid" onAction={() => onAction("lead")} /><div className="toolbar-row"><div className="filter-chips"><button className="filter-chip filter-chip--active">Semua <strong>12</strong></button><button className="filter-chip">Trial minggu ini <strong>3</strong></button><button className="filter-chip">Perlu follow-up <strong>5</strong></button></div><button className="button button--outline"><SlidersHorizontal size={15} /> Filter</button></div><div className="pipeline-grid">{columns.map((column) => <div className="pipeline-column" key={column.label}><div className="pipeline-heading"><span className={`pipeline-dot pipeline-dot--${column.tone}`} /><strong>{column.label}</strong><span>{column.count}</span><button className="icon-button"><Plus size={16} /></button></div><div className="pipeline-cards">{column.items.map((lead) => <div className="lead-card" key={lead.name}><div className="lead-card-top"><Avatar initials={lead.name.split(" ").map((part) => part[0]).join("").slice(0, 2)} tone={lead.tone} size="sm" /><button className="icon-button"><MoreHorizontal size={16} /></button></div><strong>{lead.name}</strong><span className="lead-guardian">Orang tua: {lead.guardian}</span><div className="lead-card-meta"><StatusPill tone={lead.tone}>{lead.program}</StatusPill><span><CalendarClock size={13} /> {lead.date}</span></div><div className="lead-card-footer"><span>{lead.source}</span><button onClick={() => onAction("student")}>Lihat detail <ChevronRight size={14} /></button></div></div>)}<button className="add-card-button" onClick={() => onAction("lead")}><Plus size={16} /> Tambah lead</button></div></div>)}</div><div className="insight-banner"><Sparkles size={18} /><span><strong>Insight hari ini:</strong> Instagram menjadi sumber lead terbaik minggu ini dengan 42% pendaftar baru.</span><button onClick={() => onAction("lead")}>Catat follow-up <ChevronRight size={15} /></button></div></div>;
}

function SchedulePage({ onAction }: { onAction: (modal: Exclude<ModalKey, null>) => void }) {
  const days = [{ day: "Sen", date: "12", muted: true }, { day: "Sel", date: "13", muted: true }, { day: "Rab", date: "14", muted: true }, { day: "Kam", date: "15", muted: true }, { day: "Jum", date: "16", active: true }, { day: "Sab", date: "17" }, { day: "Min", date: "18" }];
  return <div className="page-stack"><SectionHeader eyebrow="Operasional" title="Jadwal & kelas" description="Pantau kelas, kapasitas, guru, dan potensi bentrok dalam satu tampilan." action="Tambah kelas" onAction={() => onAction("class")} /><div className="calendar-toolbar"><div className="calendar-heading"><button className="icon-button"><ChevronRight className="rotate-180" size={17} /></button><strong>Oktober 2026</strong><button className="icon-button"><ChevronRight size={17} /></button><button className="button button--soft">Hari ini</button></div><div className="filter-chips"><button className="filter-chip filter-chip--active">Semua program</button><button className="filter-chip">Semua guru <ChevronDown size={14} /></button><button className="filter-chip">Semua ruang <ChevronDown size={14} /></button></div></div><div className="week-strip">{days.map((item) => <div className={`week-day ${item.active ? "week-day--active" : ""} ${item.muted ? "week-day--muted" : ""}`} key={item.date}><span>{item.day}</span><strong>{item.date}</strong>{item.active && <i />}</div>)}</div><section className="panel schedule-panel"><div className="schedule-list">{classes.map((item) => <div className="schedule-row" key={item.name}><div className="schedule-time"><strong>{item.time}</strong><span>{item.duration}</span></div><div className={`schedule-color schedule-color--${item.color}`} /><div className="schedule-main"><div><strong>{item.name}</strong><StatusPill tone={item.color}>{item.program}</StatusPill></div><span><UserRound size={14} /> {item.teacher} <i /> <span className="schedule-room">{item.room}</span></span></div><div className="schedule-capacity"><span className="capacity-track"><i style={{ width: `${Number(item.seats.split("/")[0]) / Number(item.seats.split("/")[1]) * 100}%` }} /></span><strong>{item.seats}</strong><small>kursi</small></div><button className="icon-button"><MoreHorizontal size={18} /></button></div>)}</div><div className="conflict-row"><AlertTriangle size={16} /><span><strong>1 potensi bentrok.</strong> Bu Agnes terjadwal di Ruang 02 dan Ruang 01 pada Jumat 16:00.</span><button>Periksa jadwal <ChevronRight size={14} /></button></div></section></div>;
}

function AttendancePage({ onNotify }: { onNotify: (message: string) => void }) {
  const [checked, setChecked] = useState<Record<string, string>>({ "Nadine Putri": "Hadir", "William Hartono": "Hadir" });
  const attendanceStudents = students.slice(0, 7);
  const toggle = (name: string, status: string) => setChecked((current) => ({ ...current, [name]: status }));
  const markAllPresent = () => setChecked(Object.fromEntries(attendanceStudents.map((student) => [student.name, "Hadir"])));
  const completed = Object.keys(checked).length === attendanceStudents.length;
  return <div className="page-stack"><SectionHeader eyebrow="Jumat, 16 Oktober · 10:00" title="Absensi kelas Primary B — P2" description="Kak Daniel · Ruang 03 · 7 murid terdaftar" action="Simpan absensi" onAction={() => onNotify(completed ? "Absensi Primary B — P2 berhasil disimpan." : "Lengkapi status semua murid terlebih dahulu.")} /><div className="attendance-overview"><div className="attendance-progress"><div className="progress-ring"><strong>{Object.keys(checked).length}</strong><span>/ {attendanceStudents.length} terisi</span></div><div><strong>{completed ? "Absensi lengkap" : "Absensi belum lengkap"}</strong><span>Isi status setiap murid sebelum kelas selesai.</span></div></div><div className="attendance-stats"><div><span>Hadir</span><strong className="text-lime">{Object.values(checked).filter((status) => status === "Hadir").length}</strong></div><div><span>Izin</span><strong className="text-blue">{Object.values(checked).filter((status) => status === "Izin").length}</strong></div><div><span>Sakit</span><strong className="text-orange">{Object.values(checked).filter((status) => status === "Sakit").length}</strong></div><div><span>Alpa</span><strong className="text-pink">{Object.values(checked).filter((status) => status === "Alpa").length}</strong></div></div></div><section className="panel attendance-panel"><div className="attendance-head"><div><strong>Daftar murid</strong><span>Tap status yang sesuai untuk tiap murid.</span></div><button className="button button--outline" onClick={markAllPresent}><Check size={15} /> Tandai semua hadir</button></div><div className="attendance-list">{attendanceStudents.map((student) => <div className="attendance-row" key={student.name}><div className="person-cell"><Avatar initials={student.initials} tone={student.tone} /><span><strong>{student.name}</strong><small>{student.program} · sisa {student.sessions} sesi</small></span></div><div className="attendance-actions">{["Hadir", "Izin", "Sakit", "Alpa"].map((status) => <button key={status} className={`attendance-button attendance-button--${status.toLowerCase()} ${checked[student.name] === status ? "is-selected" : ""}`} onClick={() => toggle(student.name, status)}>{checked[student.name] === status && <Check size={13} />}{status}</button>)}</div><button className="icon-button"><MoreHorizontal size={18} /></button></div>)}</div></section></div>;
}

function StudentsPage({ onAction, query }: { onAction: (modal: Exclude<ModalKey, null>) => void; query: string }) {
  const filtered = students.filter((student) => `${student.name} ${student.guardian} ${student.program}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-stack"><SectionHeader eyebrow="Data murid" title="Murid aktif" description="20 murid contoh sudah tersedia untuk mencoba alur operasional." action="Tambah murid" onAction={() => onAction("student")} /><div className="stats-strip"><div><span>Total murid</span><strong>86</strong><small>+4,8% bulan ini</small></div><div><span>Aktif</span><strong>79</strong><small>91,8% dari total</small></div><div><span>Hampir habis</span><strong className="text-orange">5</strong><small>Perlu ditawarkan perpanjangan</small></div><div><span>Cuti</span><strong>2</strong><small>1 kembali minggu depan</small></div></div><section className="panel table-panel"><div className="table-toolbar"><div className="filter-chips"><button className="filter-chip filter-chip--active">Semua murid</button><button className="filter-chip">Aktif <strong>79</strong></button><button className="filter-chip">Hampir habis <strong>5</strong></button></div><button className="button button--outline"><Download size={15} /> Ekspor</button></div><div className="snapshot-table-wrap"><table className="data-table"><thead><tr><th>Murid</th><th>Program</th><th>Orang tua/wali</th><th>Sisa sesi</th><th>Status</th><th>Terakhir hadir</th><th /></tr></thead><tbody>{filtered.map((student) => <tr key={student.name}><td><div className="person-cell"><Avatar initials={student.initials} tone={student.tone} /><span><strong>{student.name}</strong><small>ID: KD-{student.initials}024</small></span></div></td><td><StatusPill tone={student.tone}>{student.program}</StatusPill></td><td>{student.guardian}</td><td><strong className={student.sessions <= 2 ? "text-orange" : ""}>{student.sessions}</strong> sesi</td><td><StatusPill tone={student.status === "Aktif" ? "lime" : "orange"}>{student.status}</StatusPill></td><td>{student.last}</td><td><button className="icon-button"><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div></section></div>;
}

function BillingPage({ onAction, onNotify, query }: { onAction: (modal: Exclude<ModalKey, null>) => void; onNotify: (message: string) => void; query: string }) {
  const filtered = invoices.filter((invoice) => `${invoice.id} ${invoice.student} ${invoice.package}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-stack"><SectionHeader eyebrow="Keuangan" title="Invoice & pembayaran" description="Pantau tagihan, verifikasi pembayaran, dan jaga arus kas tetap sehat." action="Buat invoice" onAction={() => onAction("invoice")} /><div className="stats-strip stats-strip--billing"><div><span>Outstanding</span><strong>Rp 6,4 jt</strong><small>8 invoice terbuka</small></div><div><span>Jatuh tempo minggu ini</span><strong className="text-orange">Rp 4,2 jt</strong><small>5 invoice</small></div><div><span>Sudah diterima</span><strong className="text-lime">Rp 28,6 jt</strong><small>Oktober 2026</small></div><div><span>Rasio pelunasan</span><strong>83%</strong><small>+6% vs bulan lalu</small></div></div><section className="panel table-panel"><div className="table-toolbar"><div className="filter-chips"><button className="filter-chip filter-chip--active">Semua <strong>24</strong></button><button className="filter-chip">Belum bayar <strong>8</strong></button><button className="filter-chip">Jatuh tempo <strong>5</strong></button><button className="filter-chip">Lunas <strong>16</strong></button></div><button className="button button--outline"><Download size={15} /> Ekspor</button></div><div className="snapshot-table-wrap"><table className="data-table"><thead><tr><th>No. invoice</th><th>Murid</th><th>Paket</th><th>Nominal</th><th>Jatuh tempo</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{filtered.map((invoice) => <tr key={invoice.id}><td><strong className="invoice-id">{invoice.id}</strong></td><td>{invoice.student}</td><td>{invoice.package}</td><td><strong>{money(invoice.amount)}</strong></td><td>{invoice.due}</td><td><StatusPill tone={invoice.tone}>{invoice.status}</StatusPill></td><td><div className="table-actions"><button className="text-button" onClick={() => onNotify(`Pengingat untuk ${invoice.student} siap dikirim via WhatsApp.`)}><MessageCircle size={14} /> WA</button><button className="icon-button"><MoreHorizontal size={18} /></button></div></td></tr>)}</tbody></table></div></section></div>;
}

function FinancePage({ onAction, onNotify }: { onAction: (modal: Exclude<ModalKey, null>) => void; onNotify: (message: string) => void }) {
  return <div className="page-stack"><SectionHeader eyebrow="Owner view" title="Keuangan & laporan" description="Ringkasan performa finansial KIDDLES BSD untuk Oktober 2026." action="Catat pengeluaran" onAction={() => onAction("expense")} /><div className="finance-hero"><div><span className="eyebrow eyebrow--light">Laba bersih bulan berjalan</span><strong>Rp 15.820.000</strong><p>Margin 55,2% · naik 9,8% dari September</p></div><div className="finance-hero-bars"><i style={{ height: "38%" }} /><i style={{ height: "52%" }} /><i style={{ height: "46%" }} /><i style={{ height: "68%" }} /><i style={{ height: "58%" }} /><i style={{ height: "84%" }} /><i style={{ height: "76%" }} /></div></div><div className="finance-grid"><section className="panel"><SectionHeader eyebrow="Arus kas" title="Pemasukan vs pengeluaran" description="6 bulan terakhir" /><div className="cashflow-chart">{[68, 74, 56, 82, 76, 94].map((height, index) => <div className="cashflow-column" key={index}><span className="cashflow-income" style={{ height: `${height}%` }} /><span className="cashflow-expense" style={{ height: `${height * 0.46}%` }} /><small>{["Mei", "Jun", "Jul", "Agu", "Sep", "Okt"][index]}</small></div>)}</div><div className="chart-legend"><span><i className="legend-dot legend-dot--blue" />Pemasukan</span><span><i className="legend-dot legend-dot--orange" />Pengeluaran</span></div></section><section className="panel"><SectionHeader eyebrow="Komposisi" title="Pengeluaran Oktober" description="Total Rp 12,82 jt" /><div className="expense-breakdown"><div className="expense-donut" /><div className="expense-legend"><div><i className="legend-dot legend-dot--pink" /><span>Honor guru</span><strong>61%</strong></div><div><i className="legend-dot legend-dot--orange" /><span>Sewa</span><strong>33%</strong></div><div><i className="legend-dot legend-dot--blue" /><span>Lainnya</span><strong>6%</strong></div></div></div></section></div><section className="panel"><SectionHeader eyebrow="Pencatatan" title="Pengeluaran terbaru" description="Semua pengeluaran manual yang sudah dicatat" action="Ekspor laporan" onAction={() => onNotify("Laporan keuangan sedang disiapkan untuk diunduh.")} /><div className="snapshot-table-wrap"><table className="data-table"><thead><tr><th>Deskripsi</th><th>Kategori</th><th>Tanggal</th><th>Nominal</th><th /></tr></thead><tbody>{expenseItems.map((item) => <tr key={item.label}><td><div className="person-cell"><span className={`expense-icon expense-icon--${item.tone}`}><CircleDollarSign size={16} /></span><span><strong>{item.label}</strong><small>Dicatat oleh Admin</small></span></div></td><td><StatusPill tone={item.tone}>{item.category}</StatusPill></td><td>{item.date}</td><td><strong>{money(item.amount)}</strong></td><td><button className="icon-button"><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div></section></div>;
}

function PortalPage({ onNotify }: { onNotify: (message: string) => void }) {
  return <div className="page-stack"><SectionHeader eyebrow="Preview pengalaman murid" title="Portal murid / orang tua" description="Tampilan ringkas yang akan dilihat keluarga saat login." action="Kirim akses login" onAction={() => onNotify("Link akses portal siap dibagikan kepada orang tua Nadine.")} /><div className="portal-preview"><div className="portal-topbar"><div><BrandLogo compact /><span className="portal-greeting">Selamat sore, Ria Putri</span></div><Avatar initials="RP" tone="pink" /></div><div className="portal-child-card"><div className="portal-child-copy"><span className="eyebrow">Profil murid</span><h3>Nadine Putri</h3><p>Primary · Level 2 · Term 4</p><span className="status-pill status-pill--lime"><Check size={13} /> Aktif belajar</span></div><Avatar initials="NP" tone="pink" size="lg" /></div><div className="portal-cards"><div className="portal-info-card"><span className="portal-card-icon portal-card-icon--blue"><CalendarDays size={17} /></span><small>Kelas berikutnya</small><strong>Sabtu, 17 Okt</strong><span>10:00 · Primary B — P2</span></div><div className="portal-info-card"><span className="portal-card-icon portal-card-icon--lime"><BookOpenCheck size={17} /></span><small>Sisa sesi</small><strong>4 sesi</strong><span>Berlaku sampai 30 Nov 2026</span></div><div className="portal-info-card"><span className="portal-card-icon portal-card-icon--orange"><Receipt size={17} /></span><small>Tagihan aktif</small><strong>Rp 1.850.000</strong><span>Jatuh tempo 18 Okt 2026</span></div></div><div className="portal-lower"><div><div className="portal-section-heading"><strong>Absensi terakhir</strong><button onClick={() => onNotify("Riwayat absensi lengkap dibuka.")}>Lihat semua <ChevronRight size={14} /></button></div><div className="portal-attendance-list"><div><span className="attendance-check"><Check size={13} /></span><span><strong>10 Okt 2026</strong><small>Primary B — P2</small></span><StatusPill tone="lime">Hadir</StatusPill></div><div><span className="attendance-check"><Check size={13} /></span><span><strong>03 Okt 2026</strong><small>Primary B — P2</small></span><StatusPill tone="lime">Hadir</StatusPill></div></div></div><div className="portal-message"><MessageCircle size={18} /><strong>Butuh bantuan?</strong><span>Hubungi admin KIDDLES BSD</span><button onClick={() => onNotify("WhatsApp admin KIDDLES BSD dibuka.")}>Chat admin <ExternalLink size={13} /></button></div></div></div></div>;
}

function SettingsPage({ onNotify, onClearDemo }: { onNotify: (message: string) => void; onClearDemo: () => void }) {
  return <div className="page-stack"><SectionHeader eyebrow="Workspace" title="Pengaturan cabang" description="Atur profil cabang, preferensi operasional, dan akses pengguna." /><div className="settings-grid"><section className="panel settings-profile"><div className="settings-profile-head"><div className="settings-logo"><img src={logoUrl} alt="Logo KIDDLES" /></div><div><span className="eyebrow">Brand cabang</span><h3>KIDDLES BSD</h3><p>Kids Learning Chinese · Franchise learning center</p></div><button className="button button--outline"><FileText size={15} /> Ganti logo</button></div><div className="form-grid"><label><span>Nama cabang</span><input defaultValue="KIDDLES BSD" /></label><label><span>Nomor WhatsApp admin</span><input defaultValue="+62 812 3456 7890" /></label><label className="form-grid__wide"><span>Alamat</span><textarea defaultValue="West Village Business Park 2, D-8\nJalan BSD Raya Pusat\nKabupaten Tangerang, Banten" /></label></div><div className="settings-save"><span><Check size={15} /> Perubahan tersimpan otomatis di draft</span><button className="button button--dark" onClick={() => onNotify("Profil cabang KIDDLES BSD berhasil disimpan.")}>Simpan perubahan</button></div></section><section className="panel settings-options"><div className="panel-title-row"><div><span className="eyebrow">Preferensi</span><h3>Pengaturan operasional</h3></div><Settings2 size={19} /></div><div className="setting-option"><span className="setting-option-icon setting-option-icon--blue"><Users size={17} /></span><span><strong>Role pengguna</strong><small>Owner, Admin, Guru, Murid/Orang Tua</small></span><ChevronRight size={16} /></div><div className="setting-option"><span className="setting-option-icon setting-option-icon--lime"><BookOpenCheck size={17} /></span><span><strong>Program & paket</strong><small>Kinder, Primary, Teens, Dewasa/HSK, Conversation</small></span><ChevronRight size={16} /></div><div className="setting-option"><span className="setting-option-icon setting-option-icon--orange"><BadgeDollarSign size={17} /></span><span><strong>Royalti franchise</strong><small>Belum diaktifkan · siapkan untuk Tahap 2</small></span><ChevronRight size={16} /></div><div className="setting-option"><span className="setting-option-icon setting-option-icon--pink"><Bell size={17} /></span><span><strong>Notifikasi jatuh tempo</strong><small>Template WhatsApp manual aktif</small></span><ChevronRight size={16} /></div></section><section className="panel demo-data-panel"><div className="panel-title-row"><div><span className="eyebrow">Testing mode</span><h3>Data contoh</h3><p>20 murid, 4 guru, 6 kelas, invoice, dan pengeluaran realistis untuk uji alur.</p></div><span className="demo-badge"><Sparkles size={14} /> Aktif</span></div><div className="demo-data-actions"><button className="button button--soft" onClick={() => onNotify("Data contoh tetap tersedia untuk sesi ini.")}><Download size={15} /> Ekspor data contoh</button><button className="button button--danger-outline" onClick={onClearDemo}>Hapus data contoh</button></div></section></div></div>;
}

function DemoEmptyState({ onRestore }: { onRestore: () => void }) {
  return <section className="panel demo-empty-state"><div className="demo-empty-icon"><Sparkles size={22} /></div><span className="eyebrow">Workspace bersih</span><h2>Data contoh sudah disembunyikan</h2><p>Gunakan Pengaturan untuk menampilkan kembali data demo atau mulai memasukkan data operasional KIDDLES BSD Anda sendiri.</p><button className="button button--dark" onClick={onRestore}><Sparkles size={15} /> Tampilkan data contoh</button></section>;
}

function Modal({ kind, onClose, onSave }: { kind: Exclude<ModalKey, null>; onClose: () => void; onSave: (message: string) => void }) {
  const config = {
    lead: { eyebrow: "CRM", title: "Tambah calon murid", button: "Simpan lead" },
    student: { eyebrow: "Data murid", title: "Tambah murid baru", button: "Simpan murid" },
    invoice: { eyebrow: "Billing", title: "Buat invoice baru", button: "Buat invoice" },
    expense: { eyebrow: "Keuangan", title: "Catat pengeluaran", button: "Simpan pengeluaran" },
    class: { eyebrow: "Jadwal", title: "Tambah kelas baru", button: "Simpan kelas" },
  }[kind];
  const fieldSets = {
    lead: ["Nama calon murid", "Nama orang tua/wali", "Nomor WhatsApp", "Program yang diminati"],
    student: ["Nama lengkap murid", "Nama orang tua/wali", "Program", "Tanggal lahir"],
    invoice: ["Pilih murid", "Pilih paket", "Jatuh tempo", "Catatan invoice"],
    expense: ["Deskripsi pengeluaran", "Kategori", "Nominal", "Tanggal"],
    class: ["Nama kelas", "Program", "Guru pengajar", "Hari & jam"],
  }[kind];
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">{config.eyebrow}</span><h2 id="modal-title">{config.title}</h2></div><button className="icon-button icon-button--large" onClick={onClose} aria-label="Tutup"><X size={19} /></button></div><div className="form-grid">{fieldSets.map((field, index) => <label key={field} className={index === fieldSets.length - 1 && kind === "lead" ? "form-grid__wide" : ""}><span>{field}</span>{field.includes("Catatan") || field.includes("Deskripsi") ? <textarea placeholder={`Masukkan ${field.toLowerCase()}`} /> : field.includes("Program") || field.includes("Kategori") || field.includes("Guru") || field.includes("Pilih") ? <select defaultValue=""><option value="" disabled>Pilih {field.toLowerCase()}</option><option>{field.includes("Program") ? "Primary" : field.includes("Kategori") ? "Honor guru" : field.includes("Guru") ? "Bu Agnes" : field.includes("paket") ? "Primary Term 4" : "Nadine Putri"}</option><option>{field.includes("Program") ? "Kinder" : field.includes("Kategori") ? "Marketing" : field.includes("Guru") ? "Kak Daniel" : field.includes("paket") ? "Kinder Term 4" : "William Hartono"}</option></select> : <input placeholder={`Masukkan ${field.toLowerCase()}`} />}</label>)}</div><div className="modal-foot"><button className="button button--outline" onClick={onClose}>Batal</button><button className="button button--dark" onClick={() => onSave(`${config.title} berhasil disimpan.`)}><Check size={16} /> {config.button}</button></div></div></div>;
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const [activePage, setActivePage] = useState<PageKey>(() => pageFromPath(location));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalKey>(null);
  const [role, setRole] = useState("Owner");
  const [toast, setToast] = useState<string | null>(null);
  const [demoVisible, setDemoVisible] = useState(true);

  useEffect(() => {
    setActivePage(pageFromPath(location));
  }, [location]);

  const pageTitle = useMemo(() => navSections.flatMap((section) => section.items).find((item) => item.key === activePage)?.label ?? "Dashboard", [activePage]);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };
  const openAction = (nextModal: Exclude<ModalKey, null>) => setModal(nextModal);
  const handleSave = (message: string) => {
    setModal(null);
    notify(message);
  };
  const navigate = (page: PageKey) => {
    setActivePage(page);
    setLocation(pathByPage[page]);
    setMobileOpen(false);
    setQuery("");
  };
  const clearDemo = () => {
    setDemoVisible(false);
    notify("Data contoh sudah disembunyikan dari workspace ini.");
  };

  return <div className={`app-shell ${activePage === "dashboard" ? "app-shell--home" : ""}`}>
    <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar-head"><BrandLogo /><button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Tutup menu"><X size={19} /></button></div>
      <div className="branch-switcher"><span className="branch-status" /><span><small>Cabang aktif</small><strong>KIDDLES BSD</strong></span><ChevronDown size={15} /></div>
      <nav className="side-nav">{navSections.map((section) => <div className="nav-section" key={section.title}><span className="nav-section-title">{section.title}</span>{section.items.map((item) => { const Icon = item.icon; return <button key={item.key} className={`nav-item ${activePage === item.key ? "nav-item--active" : ""}`} onClick={() => navigate(item.key)}><Icon size={18} strokeWidth={activePage === item.key ? 2.4 : 2} /><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}</button>; })}</div>)}</nav>
      <div className="sidebar-bottom"><div className="flare-card"><div className="flare-mark"><Sparkles size={15} /></div><div><strong>FLARE method</strong><span>Fun · Learning · Growth</span></div><ChevronRight size={15} /></div><button className="help-link" onClick={() => notify("Pusat bantuan akan segera tersedia.")}><span className="help-icon">?</span> Butuh bantuan?</button></div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Tutup navigasi" />}
    <main className="main-shell">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu size={20} /></button><div className="breadcrumb"><span>KIDDLES BSD</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div></div><div className="topbar-actions"><label className="global-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari murid, invoice, lead..." /><kbd>⌘ K</kbd></label><button className="icon-button notification-button" onClick={() => notify("Tidak ada notifikasi baru.")} aria-label="Notifikasi"><Bell size={18} /><i /></button><div className="role-select"><select value={role} onChange={(event) => { setRole(event.target.value); notify(`Mode ${event.target.value} aktif.`); }}><option>Owner</option><option>Admin</option><option>Guru</option><option>Murid/Orang Tua</option></select><ChevronDown size={14} /></div><Avatar initials="SA" tone="pink" /></div></header>
      <div className="page-content"><div className="content-heading-mobile"><span className="eyebrow">Workspace KIDDLES BSD</span><h1>{pageTitle}</h1></div>{!demoVisible && <div className="demo-hidden-banner"><Sparkles size={16} /><span>Data contoh sedang disembunyikan. Anda dapat mengaktifkannya kembali di Pengaturan.</span><button onClick={() => { setDemoVisible(true); notify("Data contoh ditampilkan kembali."); }}>Tampilkan kembali</button></div>}{!demoVisible && activePage !== "settings" ? <DemoEmptyState onRestore={() => { setDemoVisible(true); notify("Data contoh ditampilkan kembali."); }} /> : <>{activePage === "dashboard" && <HomeIconBase role={role} onNavigate={navigate} onNotify={notify} onRoleChange={(nextRole) => { setRole(nextRole); notify(`Mode ${nextRole} aktif.`); }} />}{activePage === "tasks" && <TasksPage role={role} onNavigate={navigate} onNotify={notify} />} {activePage === "crm" && <CrmPage onAction={openAction} query={query} />}{activePage === "schedule" && <SchedulePage onAction={openAction} />}{activePage === "attendance" && <AttendancePage onNotify={notify} />}{activePage === "students" && <StudentsPage onAction={openAction} query={query} />}{activePage === "billing" && <BillingPage onAction={openAction} onNotify={notify} query={query} />}{activePage === "finance" && <FinancePage onAction={openAction} onNotify={notify} />}{activePage === "portal" && <PortalPage onNotify={notify} />}{activePage === "settings" && <SettingsPage onNotify={notify} onClearDemo={clearDemo} />}</>}</div>
    </main>
    {toast && <div className="toast"><span className="toast-check"><Check size={14} /></span><span>{toast}</span><button onClick={() => setToast(null)} aria-label="Tutup pesan"><X size={15} /></button></div>}
    {modal && <Modal kind={modal} onClose={() => setModal(null)} onSave={handleSave} />}
  </div>;
}

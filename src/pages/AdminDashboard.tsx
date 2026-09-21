import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '../services/apiConfig';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  XCircle, 
  RefreshCw, 
  Filter, 
  CheckCheck,
  Search,
  Eye,
  Flag,
  FileCheck,
  LogOut,
  User,
  History,
  Lock,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { getStoredProducts, saveStoredProducts } from '../data/seedData';
import { ProductItem, ProductStatus } from '../types';
import { adminApi, AdminUser, AdminAuditLog, ArtisanApplication } from '../services/adminApi';



type AdminViewType = 'review' | 'total' | 'auto_approved' | 'approved' | 'rejected' | 'reported' | 'audit_logs';

const VIEW_METADATA: Record<Exclude<AdminViewType, 'audit_logs'>, { eyebrow: string; title: string; emptyTitle: string; emptyText: string }> = {
  review: {
    eyebrow: 'NEEDS ATTENTION',
    title: 'Product Review Queue',
    emptyTitle: 'No products in review queue',
    emptyText: 'All current uploads have been reviewed or auto-verified by AI.'
  },
  total: {
    eyebrow: 'COMPLETE CATALOG',
    title: 'All Uploaded Crafts',
    emptyTitle: 'No products in catalog',
    emptyText: 'No artisan has uploaded a craft item yet.'
  },
  auto_approved: {
    eyebrow: 'AI VERIFIED HISTORY',
    title: 'AI Auto-Approved Crafts',
    emptyTitle: 'No auto-approved products',
    emptyText: 'AI has not flagged any craft with >95% confidence yet.'
  },
  approved: {
    eyebrow: 'BUYER MARKETPLACE',
    title: 'Buyer Visible Crafts',
    emptyTitle: 'No buyer visible products',
    emptyText: 'No products are currently approved for the public marketplace.'
  },
  rejected: {
    eyebrow: 'REJECTION REASON LOG',
    title: 'Rejected Crafts',
    emptyTitle: 'No rejected products',
    emptyText: 'No artisan submission has been rejected.'
  },
  reported: {
    eyebrow: 'BUYER ESCALATIONS',
    title: 'Reported Crafts',
    emptyTitle: 'No reported products',
    emptyText: 'No buyer reports or quality flags filed.'
  }
};

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  // Cloudinary returns complete https:// URLs.  Keep local/legacy upload paths
  // compatible without adding API_BASE in front of an already complete URL.
  const assetUrl = (url?: string) => {
    if (!url) return '';
    return url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `${API_BASE}${url}`;
  };
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [activeView, setActiveView] = useState<AdminViewType>('review');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [artisanApplications, setArtisanApplications] = useState<ArtisanApplication[]>([]);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const [expandedArtisanId, setExpandedArtisanId] = useState<number | null>(null);
  const [mainSection, setMainSection] = useState<'products' | 'accounts' | null>(null);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'banned'>('all');

  const loadCatalog = async () => {
    setProducts(await adminApi.getProducts());
  };

  const loadAuditLogs = async () => {
    const logs = await adminApi.getAuditLogs();
    setAuditLogs(logs);
  };

  const loadArtisanApplications = async () => setArtisanApplications(await adminApi.getArtisanApplications());

  useEffect(() => {
    loadCatalog();
    loadAuditLogs();
    loadArtisanApplications();

    // Check server authentication
    adminApi.checkAdminAuth().then((res) => {
      if (res.authenticated && res.user) {
        setAdminProfile(res.user);
      }
    });

    window.addEventListener('karigarsetu_products_updated', loadCatalog);
    return () => window.removeEventListener('karigarsetu_products_updated', loadCatalog);
  }, []);

  useEffect(() => {
    if (!previewImage) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewImage(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [previewImage]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await adminApi.logout();
    navigate('/admin/login', { replace: true });
  };

  const handleArtisanDecision = async (
    id: number,
    status: 'approved' | 'rejected' | 'banned',
    note = '',
  ) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/artisan-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, note }),
      });
      const data = await response.json().catch(() => null);
      const ok = response.ok && data?.success !== false;
      showToast(
        ok ? `Artisan account status changed to ${status}.` : data?.message || 'Artisan decision could not be saved.',
        ok ? 'success' : 'error',
      );
      if (ok) {
        setExpandedArtisanId(null);
        await loadArtisanApplications();
      }
    } catch {
      showToast('Artisan decision could not be saved.', 'error');
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: products.length,
      autoApproved: products.filter((p) => p.status === 'approved' && (!p.reviewed_by || String(p.reviewed_by).includes('AI'))).length,
      approved: products.filter((p) => p.status === 'approved').length,
      pendingReview: products.filter((p) => p.status === 'pending_ai_check' || p.status === 'admin_review' || p.status === 'under_review').length,
      rejected: products.filter((p) => p.status === 'rejected').length,
      reported: products.filter((p) => (p.reported_count || 0) > 0).length,
      auditLogsCount: auditLogs.length,
    };
  }, [products, auditLogs]);

  // Filtered list by view
  const currentViewProducts = useMemo(() => {
    if (activeView === 'audit_logs') return [];

    return products.filter((item) => {
      const matchesSearch = 
        searchFilter === '' ||
        item.product_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.artisan_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (item.cultural_significance || '').toLowerCase().includes(searchFilter.toLowerCase());

      if (!matchesSearch) return false;

      switch (activeView) {
        case 'review':
          return item.status === 'pending_ai_check' || item.status === 'admin_review' || item.status === 'under_review';
        case 'total':
          return true;
        case 'auto_approved':
          return item.status === 'approved' && (!item.reviewed_by || String(item.reviewed_by).includes('AI'));
        case 'approved':
          return item.status === 'approved';
        case 'rejected':
          return item.status === 'rejected';
        case 'reported':
          return (item.reported_count || 0) > 0;
        default:
          return true;
      }
    });
  }, [products, activeView, searchFilter]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(currentViewProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDecision = async (productId: number, newStatus: ProductStatus) => {
    let saved = false;
    if (newStatus === 'approved') {
      saved = await adminApi.approveProduct(productId);
    } else if (newStatus === 'rejected') {
      saved = await adminApi.rejectProduct(productId, 'Quality review failed: does not meet authentic craftsmanship standards.');
    } else if (newStatus === 'pending_ai_check') {
      saved = await adminApi.restoreProduct(productId);
    }
    if (!saved) {
      showToast('Product decision could not be saved.', 'error');
      return;
    }
    await loadCatalog();
    showToast(`Product decision saved: ${newStatus.toUpperCase()}`);
    setSelectedIds((prev) => prev.filter((id) => id !== productId));
    loadAuditLogs();
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;

    // 1. Notify Backend API for audit log
    const saved = await adminApi.bulkApproveProducts(selectedIds);
    if (!saved) {
      showToast('Bulk approval could not be saved.', 'error');
      return;
    }
    await loadCatalog();
    showToast(`Successfully bulk approved ${selectedIds.length} crafts!`);
    setSelectedIds([]);
    loadAuditLogs();
  };

  return (
    <div id="admin-dashboard-root" className="min-h-screen bg-[#f4f7f5] text-[#1a2e24]">
      {/* Admin Top Security Header */}
      <header className="bg-[#073623] text-white py-3 px-4 sm:px-6 border-b border-[#0f4e34] sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-white font-extrabold tracking-wide">
                KarigarSetu AI • Quality & Governance Portal
              </div>
              <div className="text-[10px] text-emerald-300/80 font-normal font-mono">
                RBAC Clearance: Role=Admin • HttpOnly Server Session
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {adminProfile && (
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#05281a] border border-[#0d4f33] text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-100 font-semibold">{adminProfile.name}</span>
                <span className="text-gray-400 text-[11px]">({adminProfile.email})</span>
              </div>
            )}

            <button
              id="admin-signout-btn"
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 text-red-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Terminate Administrator Session"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {mainSection === null ? (
          <section className="mx-auto mt-10 max-w-4xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-black text-[#0c4b31] sm:text-4xl">Admin Dashboard</h1>
              <p className="mt-2 text-sm text-gray-500">Choose the section you want to manage.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <button type="button" onClick={() => setMainSection('products')} className="group rounded-2xl border border-[#cfe0d5] bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#0c5b3b] hover:shadow-lg">
                <FileCheck className="mb-5 h-11 w-11 text-[#0c5b3b]" />
                <h2 className="text-2xl font-black text-[#0c4b31]">Products</h2>
                <p className="mt-2 text-sm text-gray-500">Open product review queues, complete craft lists and moderation tools.</p>
              </button>
              <button type="button" onClick={() => setMainSection('accounts')} className="group rounded-2xl border border-[#cfe0d5] bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#0c5b3b] hover:shadow-lg">
                <User className="mb-5 h-11 w-11 text-[#0c5b3b]" />
                <h2 className="text-2xl font-black text-[#0c4b31]">Accounts</h2>
                <p className="mt-2 text-sm text-gray-500">Open the artisan name list, full profiles, proofs and account controls.</p>
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setMainSection(null)} className="rounded-xl border border-[#cfdcd3] bg-white px-4 py-2 text-xs font-bold text-[#0c4b31] hover:bg-[#eaf4ee]">← Main Menu</button>
              <span className="rounded-xl bg-[#0c5b3b] px-5 py-2 text-xs font-bold text-white">
                {mainSection === 'products' ? 'Products' : 'Accounts'}
              </span>
            </div>
        
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#dce6df]">
          <div>
            <span className="text-xs font-extrabold text-[#e27d35] uppercase tracking-wider">
              {mainSection === 'products' ? 'Human-in-the-Loop Quality Governance' : 'Identity Verification & Account Governance'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c4b31] tracking-tight mt-0.5">
              {mainSection === 'products' ? 'Product Authenticity & Moderation Desk' : 'Artisan Account Management'}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              {mainSection === 'products'
                ? 'AI evaluates craftsmanship parameters; Authorized Administrators make final binding certifications.'
                : 'Review artisan identities, open complete records and manage account access.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { loadCatalog(); loadAuditLogs(); loadArtisanApplications(); }}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#cfdcd3] hover:bg-[#eaf4ee] text-xs font-bold text-[#0c4b31] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{mainSection === 'products' ? 'Refresh Queue' : 'Refresh Accounts'}</span>
            </button>
          </div>
        </div>

        {/* Action Toast Notice */}
        {actionNotice && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice.text}</span>
          </div>
        )}

        {mainSection === 'accounts' && <>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { key: 'all' as const, label: 'All Accounts', value: artisanApplications.length, hint: 'Complete registry', icon: User, color: 'text-[#0c4b31]' },
            { key: 'pending' as const, label: 'Pending', value: artisanApplications.filter(a => a.verification_status === 'pending').length, hint: 'Needs verification', icon: Clock, color: 'text-amber-600' },
            { key: 'approved' as const, label: 'Approved', value: artisanApplications.filter(a => a.verification_status === 'approved').length, hint: 'Active artisans', icon: CheckCircle2, color: 'text-emerald-600' },
            { key: 'rejected' as const, label: 'Rejected', value: artisanApplications.filter(a => a.verification_status === 'rejected').length, hint: 'Declined requests', icon: XCircle, color: 'text-red-600' },
            { key: 'banned' as const, label: 'Banned', value: artisanApplications.filter(a => String(a.verification_status) === 'banned').length, hint: 'Access blocked', icon: Lock, color: 'text-slate-700' },
          ].map((card) => {
            const Icon = card.icon;
            const selected = accountStatusFilter === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => { setAccountStatusFilter(card.key); setExpandedArtisanId(null); }}
                className={`rounded-xl border bg-white p-3.5 text-left transition-all ${selected ? 'border-[#0c4b31] shadow-md ring-2 ring-[#0c4b31]/10' : 'border-[#dce6df] hover:border-[#b0cfbc]'}`}
              >
                <div className={`mb-1 flex items-center justify-between ${card.color}`}>
                  <span className="text-[11px] font-bold">{card.label}</span>
                  <Icon className="h-4 w-4" />
                </div>
                <strong className={`text-2xl font-extrabold ${card.color}`}>{card.value}</strong>
                <p className="mt-0.5 text-[10px] text-gray-400">{card.hint}</p>
              </button>
            );
          })}
        </div>

        <section className="mt-6 rounded-2xl border border-[#dce6df] bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#e27d35]">Account directory</p>
              <h2 className="text-xl font-extrabold text-[#0c4b31]">Artisan Accounts ({artisanApplications.filter((app) => accountStatusFilter === 'all' || String(app.verification_status) === accountStatusFilter).length})</h2>
              <p className="mt-1 text-xs text-gray-500">Search an artisan and click the name to open the complete verified record.</p>
            </div>
          </div>

          <div className="relative mb-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={accountSearch}
              onChange={(event) => setAccountSearch(event.target.value)}
              placeholder="Filter accounts by artisan name, phone, email, craft or location..."
              className="w-full rounded-xl border border-[#dce6df] bg-[#f8faf9] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-[#0c5b3b] focus:ring-2 focus:ring-[#0c5b3b]/10"
            />
          </div>

          <div className="space-y-7">
            {(['pending', 'approved', 'rejected', 'banned'] as const)
              .filter((status) => accountStatusFilter === 'all' || accountStatusFilter === status)
              .map((status) => {
              const normalizedSearch = accountSearch.trim().toLowerCase();
              const records = artisanApplications.filter((app) => {
                if (String(app.verification_status) !== status) return false;
                if (!normalizedSearch) return true;
                return [app.name, app.phone, app.email, app.craft_type, app.location, app.address]
                  .some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
              });
              const heading = status === 'pending' ? 'New Applications' : status === 'approved' ? 'Approved Artisans' : status === 'rejected' ? 'Rejected Applications' : 'Banned Artisan Accounts';
              return (
                <div key={status}>
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-[#0c4b31]">{heading}</h3>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">{records.length}</span>
                  </div>
                  {records.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-gray-200 p-4 text-xs text-gray-400">No records in this section.</p>
                  ) : (
                    <div className="space-y-2">
                      {records.map((app) => {
                        const isExpanded = expandedArtisanId === app.id;
                        return (
                          <article key={app.id} className={`overflow-hidden rounded-xl border transition-all ${isExpanded ? 'border-[#8ebba3] bg-white shadow-md' : 'border-[#dce6df] bg-[#fbfdfb] hover:border-[#b0cfbc]'}`}>
                            <button
                              type="button"
                              onClick={() => setExpandedArtisanId(isExpanded ? null : app.id)}
                              aria-expanded={isExpanded}
                              aria-controls={`artisan-details-${app.id}`}
                              className="flex w-full items-center justify-between gap-3 p-4 text-left"
                            >
                              <h4 className="font-extrabold text-[#0c4b31]">{app.name}</h4>
                              <span className="flex items-center gap-3">
                                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${status === 'approved' ? 'bg-emerald-100 text-emerald-800' : status === 'pending' ? 'bg-amber-100 text-amber-800' : status === 'banned' ? 'bg-slate-800 text-white' : 'bg-red-100 text-red-800'}`}>{status}</span>
                                <ChevronDown className={`h-5 w-5 text-[#0c4b31] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </span>
                            </button>

                            {isExpanded && (
                              <div id={`artisan-details-${app.id}`} className="border-t border-[#e5ece7] p-4 pt-3">
                                <div className="grid gap-1 text-xs text-gray-600 sm:grid-cols-2">
                                  <p><strong>Phone:</strong> {app.phone}</p>
                                  <p><strong>Email:</strong> {app.email}</p>
                                  <p><strong>Craft:</strong> {app.craft_type}</p>
                                  <p><strong>Experience:</strong> {app.experience} years</p>
                                  <p><strong>Location:</strong> {app.location}</p>
                                  <p><strong>Language:</strong> {app.language}</p>
                                  <p className="sm:col-span-2"><strong>Full address:</strong> {app.address}</p>
                                  <p className="text-[11px] text-gray-400 sm:col-span-2"><strong>Applied:</strong> {app.created_at ? new Date(app.created_at).toLocaleString() : '—'}</p>
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  <a target="_blank" rel="noreferrer" href={assetUrl(app.proof_image_1)}><img className="h-40 w-full rounded-lg border bg-white object-contain p-1" src={assetUrl(app.proof_image_1)} alt={`${app.name} craft proof 1`} /></a>
                                  <a target="_blank" rel="noreferrer" href={assetUrl(app.proof_image_2)}><img className="h-40 w-full rounded-lg border bg-white object-contain p-1" src={assetUrl(app.proof_image_2)} alt={`${app.name} craft proof 2`} /></a>
                                  <video className="h-40 w-full rounded-lg bg-black object-contain" controls src={assetUrl(app.proof_video)} />
                                </div>

                                {app.review_note && <p className="mt-3 rounded-lg bg-gray-50 p-2 text-xs text-gray-600"><strong>Admin note:</strong> {app.review_note}</p>}

                                <div className="mt-4 flex flex-wrap gap-2">
                                  {status === 'pending' && <><button type="button" onClick={() => handleArtisanDecision(app.id, 'rejected', 'Artisan application rejected by administrator.')} className="flex-1 rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-700">Reject</button><button type="button" onClick={() => handleArtisanDecision(app.id, 'approved', 'Artisan identity approved.')} className="flex-1 rounded-lg bg-[#0c5b3b] px-3 py-2 text-xs font-bold text-white">Approve Account</button></>}
                                  {status === 'approved' && <button type="button" onClick={() => handleArtisanDecision(app.id, 'banned', 'Account banned by administrator.')} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-black">Ban Account</button>}
                                  {status === 'banned' && <button type="button" onClick={() => handleArtisanDecision(app.id, 'approved', 'Account ban removed by administrator.')} className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">Unban Account</button>}
                                  {status === 'rejected' && <button type="button" onClick={() => handleArtisanDecision(app.id, 'approved', 'Rejected application reconsidered and approved.')} className="w-full rounded-lg border border-emerald-600 px-3 py-2 text-xs font-bold text-emerald-700">Reconsider & Approve</button>}
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        </>}

        {mainSection === 'products' && <>
        {/* Stat Filter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mt-6">
          <button
            type="button"
            onClick={() => { setActiveView('review'); setSelectedIds([]); }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeView === 'review'
                ? 'bg-white border-[#0c4b31] shadow-md ring-2 ring-[#0c4b31]/10'
                : 'bg-white/80 border-[#dce6df] hover:border-[#b0cfbc]'
            }`}
            id="filter-review-queue"
          >
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-[11px] font-bold">Needs Review</span>
              <Clock className="w-4 h-4" />
            </div>
            <strong className="text-2xl font-extrabold text-amber-700">{stats.pendingReview}</strong>
            <p className="text-[10px] text-gray-400 mt-0.5">Action required</p>
          </button>

          <button
            type="button"
            onClick={() => { setActiveView('total'); setSelectedIds([]); }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeView === 'total'
                ? 'bg-white border-[#0c4b31] shadow-md ring-2 ring-[#0c4b31]/10'
                : 'bg-white/80 border-[#dce6df] hover:border-[#b0cfbc]'
            }`}
            id="filter-total-catalog"
          >
            <div className="flex items-center justify-between text-[#0c4b31] mb-1">
              <span className="text-[11px] font-bold">All Crafts</span>
              <FileCheck className="w-4 h-4" />
            </div>
            <strong className="text-2xl font-extrabold text-[#0c4b31]">{stats.total}</strong>
            <p className="text-[10px] text-gray-400 mt-0.5">Total database</p>
          </button>

          <button
            type="button"
            onClick={() => { setActiveView('auto_approved'); setSelectedIds([]); }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeView === 'auto_approved'
                ? 'bg-white border-[#0c4b31] shadow-md ring-2 ring-[#0c4b31]/10'
                : 'bg-white/80 border-[#dce6df] hover:border-[#b0cfbc]'
            }`}
            id="filter-auto-approved"
          >
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-[11px] font-bold">AI Approved</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <strong className="text-2xl font-extrabold text-emerald-700">{stats.autoApproved}</strong>
            <p className="text-[10px] text-gray-400 mt-0.5">&gt;95% confidence</p>
          </button>

          <button
            type="button"
            onClick={() => { setActiveView('approved'); setSelectedIds([]); }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeView === 'approved'
                ? 'bg-white border-[#0c4b31] shadow-md ring-2 ring-[#0c4b31]/10'
                : 'bg-white/80 border-[#dce6df] hover:border-[#b0cfbc]'
            }`}
            id="filter-buyer-visible"
          >
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-[11px] font-bold">Buyer Visible</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <strong className="text-2xl font-extrabold text-emerald-700">{stats.approved}</strong>
            <p className="text-[10px] text-gray-400 mt-0.5">Live on market</p>
          </button>

          <button
            type="button"
            onClick={() => { setActiveView('rejected'); setSelectedIds([]); }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeView === 'rejected'
                ? 'bg-white border-[#0c4b31] shadow-md ring-2 ring-[#0c4b31]/10'
                : 'bg-white/80 border-[#dce6df] hover:border-[#b0cfbc]'
            }`}
            id="filter-rejected"
          >
            <div className="flex items-center justify-between text-red-600 mb-1">
              <span className="text-[11px] font-bold">Rejected</span>
              <XCircle className="w-4 h-4" />
            </div>
            <strong className="text-2xl font-extrabold text-red-700">{stats.rejected}</strong>
            <p className="text-[10px] text-gray-400 mt-0.5">Flagged/Counterfeit</p>
          </button>

          <button
            type="button"
            onClick={() => { setActiveView('reported'); setSelectedIds([]); }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeView === 'reported'
                ? 'bg-white border-[#0c4b31] shadow-md ring-2 ring-[#0c4b31]/10'
                : 'bg-white/80 border-[#dce6df] hover:border-[#b0cfbc]'
            }`}
            id="filter-reported"
          >
            <div className="flex items-center justify-between text-purple-600 mb-1">
              <span className="text-[11px] font-bold">Reported</span>
              <Flag className="w-4 h-4" />
            </div>
            <strong className="text-2xl font-extrabold text-purple-700">{stats.reported}</strong>
            <p className="text-[10px] text-gray-400 mt-0.5">Buyer flags</p>
          </button>

          <button
            type="button"
            onClick={() => { setActiveView('audit_logs'); setSelectedIds([]); }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeView === 'audit_logs'
                ? 'bg-white border-[#0c4b31] shadow-md ring-2 ring-[#0c4b31]/10'
                : 'bg-white/80 border-[#dce6df] hover:border-[#b0cfbc]'
            }`}
            id="filter-audit-logs"
          >
            <div className="flex items-center justify-between text-blue-600 mb-1">
              <span className="text-[11px] font-bold">Audit Logs</span>
              <History className="w-4 h-4" />
            </div>
            <strong className="text-2xl font-extrabold text-blue-700">{stats.auditLogsCount}</strong>
            <p className="text-[10px] text-gray-400 mt-0.5">Security records</p>
          </button>
        </div>

        {/* View Section */}
        {activeView === 'audit_logs' ? (
          /* Audit Logs View */
          <div className="mt-8 bg-white rounded-2xl border border-[#dfe8e1] shadow-xs p-6">
            <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  IMMUTABLE SECURITY AUDIT TRAIL
                </span>
                <h2 className="text-xl font-extrabold text-[#0c4b31]">
                  Administrative Event Logs ({auditLogs.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={loadAuditLogs}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Logs</span>
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-[#f7faf8] text-[#0c4b31] font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-3">Log ID</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Target</th>
                    <th className="py-3 px-3">Administrator</th>
                    <th className="py-3 px-3">IP Address</th>
                    <th className="py-3 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-mono text-gray-400">#{log.id}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          log.action.includes('APPROVED')
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action.includes('REJECTED')
                            ? 'bg-red-100 text-red-800'
                            : log.action.includes('LOGIN')
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {log.target_type ? `${log.target_type} #${log.target_id || ''}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-900">
                        {log.admin_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-400">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Products View */
          <div className="mt-8 bg-white rounded-2xl border border-[#dfe8e1] shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <span className="text-[11px] font-bold text-[#e27d35] uppercase tracking-wider">
                  {VIEW_METADATA[activeView].eyebrow}
                </span>
                <h2 className="text-xl font-extrabold text-[#0c4b31]">
                  {VIEW_METADATA[activeView].title} ({currentViewProducts.length})
                </h2>
              </div>

              {/* Bulk Controls in review mode */}
              {activeView === 'review' && currentViewProducts.length > 0 && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === currentViewProducts.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-[#0c4b31] focus:ring-[#0c4b31]"
                    />
                    <span>Select All for Batch</span>
                  </label>

                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkApprove}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0c4b31] hover:bg-[#145e3f] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-[#ffd186]" />
                      <span>Approve Selected ({selectedIds.length})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Search Filter input */}
            <div className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter queue by artisan name, craft title, GI heritage, or category..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#f8faf9] border border-[#dce6df] text-xs focus:outline-none focus:border-[#0c4b31]"
                />
              </div>
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* List */}
            {currentViewProducts.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-12 h-12 rounded-full bg-[#f2f7f4] flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <Filter className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#0c4b31]">
                  {VIEW_METADATA[activeView].emptyTitle}
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  {VIEW_METADATA[activeView].emptyText}
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-gray-100">
                {currentViewProducts.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  const isUnderReview = product.status === 'under_review' || product.status === 'pending_ai_check' || product.status === 'admin_review';

                  return (
                    <article
                      key={product.id}
                      className={`py-5 flex flex-col lg:flex-row gap-5 items-start transition-all rounded-xl p-3 ${
                        isSelected ? 'bg-[#f0f7f3]' : 'hover:bg-[#fafcfb]'
                      }`}
                    >
                      {activeView === 'review' && (
                        <div className="pt-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(product.id)}
                            className="rounded border-gray-300 text-[#0c4b31] focus:ring-[#0c4b31]"
                          />
                        </div>
                      )}

                      {/* Craft Image with Confidence Overlay */}
                      <button
                        type="button"
                        onClick={() => setPreviewImage({
                          src: product.image_url,
                          alt: product.product_name || 'Product image',
                        })}
                        className="group relative w-full sm:w-52 h-52 rounded-xl overflow-hidden bg-white shrink-0 border border-gray-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                        aria-label={`Open full image preview for ${product.product_name}`}
                      >
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          className="w-full h-full object-contain p-2 transition-transform duration-200 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#ffd186]" />
                          <span>AI Conf: {product.ai_confidence_score}%</span>
                        </div>
                        {product.ai_risk_score > 15 && (
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-red-600 text-[10px] font-bold text-white flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Risk: {product.ai_risk_score}%</span>
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-[10px] font-bold text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-3 h-3" />
                          <span>View full image</span>
                        </div>
                      </button>

                      {/* Content Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                            {product.category}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs font-semibold text-gray-600">
                            Artisan: <strong className="text-gray-900">{product.artisan_name}</strong> ({product.artisan_location})
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            product.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : product.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            Status: {product.status.replace('_', ' ')}
                          </span>
                        </div>

                        <h3 className="text-base font-extrabold text-[#0c4b31]">
                          {product.product_name}
                        </h3>

                        <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>

                        {product.cultural_significance && (
                          <div className="mt-2 text-[11px] text-[#0c4b31] bg-[#f0f7f3] border border-[#d3e5db] rounded-lg p-2 flex items-start gap-1.5">
                            <span className="font-bold shrink-0">🏛️ GI Heritage:</span>
                            <span className="italic">{product.cultural_significance}</span>
                          </div>
                        )}

                        {/* Internal Telemetry */}
                        <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div>
                            <span className="text-gray-400 block">Material Cost:</span>
                            <span className="font-semibold text-gray-700">₹{product.material_cost}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Living Wage / Labour:</span>
                            <span className="font-semibold text-emerald-700">₹{product.labour_cost}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Suggested Price:</span>
                            <span className="font-semibold text-gray-700">₹{product.suggested_price}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Stock Units:</span>
                            <span className="font-semibold text-gray-700">{product.stock_quantity} available</span>
                          </div>
                        </div>

                        {product.ai_decision_reason && (
                          <div className="mt-2 text-[11px] text-gray-500 font-mono">
                            Verification Note: {product.ai_decision_reason}
                          </div>
                        )}
                      </div>

                      {/* Moderation Actions */}
                      <div className="w-full lg:w-48 shrink-0 flex flex-col gap-2 pt-2 lg:pt-0">
                        <div className="text-xs text-gray-500 pb-1">
                          Market Price: <strong className="text-sm font-bold text-[#0c4b31]">₹{product.selling_price}</strong>
                        </div>

                        {product.status !== 'approved' && (
                          <button
                            type="button"
                            id={`approve-btn-${product.id}`}
                            onClick={() => handleDecision(product.id, 'approved')}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#ffd186]" />
                            <span>✓ Approve for Market</span>
                          </button>
                        )}

                        {isUnderReview && (
                          <button
                            type="button"
                            id={`hold-btn-${product.id}`}
                            onClick={() => handleDecision(product.id, 'under_review')}
                            className="w-full py-2 px-3 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>◷ Request GI Proof</span>
                          </button>
                        )}

                        {product.status !== 'rejected' && (
                          <button
                            type="button"
                            id={`reject-btn-${product.id}`}
                            onClick={() => handleDecision(product.id, 'rejected')}
                            className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>× Reject Listing</span>
                          </button>
                        )}

                        {product.status === 'rejected' && (
                          <button
                            type="button"
                            id={`restore-btn-${product.id}`}
                            onClick={() => handleDecision(product.id, 'pending_ai_check')}
                            className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>↺ Restore to Queue</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </>}

          </>
        )}
      </main>

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 sm:p-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Full product image preview"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex h-full max-h-[92vh] w-full max-w-6xl items-center justify-center overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={previewImage.src}
              alt={previewImage.alt}
              className="max-h-full max-w-full object-contain p-4 sm:p-8"
            />

            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/75 text-white shadow-lg transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close full image preview"
              title="Close preview (Esc)"
            >
              <XCircle className="h-6 w-6" />
            </button>

            <div className="absolute bottom-4 left-1/2 max-w-[90%] -translate-x-1/2 rounded-lg bg-black/70 px-4 py-2 text-center text-sm font-semibold text-white">
              {previewImage.alt}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

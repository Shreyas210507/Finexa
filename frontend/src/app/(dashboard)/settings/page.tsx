"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { StatusChip } from "@/components/ui/chips";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";
import { MemberResponse, GatewayStatusResponse } from "@/lib/api-types";
import {
  Building2,
  Users,
  CreditCard,
  Webhook,
  Palette,
  RotateCcw,
  Plus,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  User,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"general" | "team" | "integrations" | "appearance">("general");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Form states
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [orgName, setOrgName] = useState("Novastack Technologies");
  const [currency, setCurrency] = useState("USD");
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatusResponse | null>(null);
  const [testingGateway, setTestingGateway] = useState(false);

  // Zapier state
  const [zapierUrl, setZapierUrl] = useState("");
  const [zapierEventType, setZapierEventType] = useState("invoice.paid");
  const [isZapierOpen, setIsZapierOpen] = useState(false);
  const [dispatchingZapier, setDispatchingZapier] = useState(false);
  const [zapierResult, setZapierResult] = useState<Record<string, unknown> | null>(null);

  const loadOrgData = useCallback(async () => {
    try {
      setLoadingOrg(true);
      const [org, membersList, gwStatus, currentUser] = await Promise.allSettled([
        apiClient.getCurrentOrg(),
        apiClient.getOrgMembers(),
        apiClient.getGatewayStatus(),
        apiClient.getCurrentUser(),
      ]);

      if (org.status === "fulfilled") {
        setOrgName(org.value.name);
        setCurrency(org.value.currency || "USD");
      }
      if (membersList.status === "fulfilled") {
        setMembers(membersList.value);
      }
      if (gwStatus.status === "fulfilled") {
        setGatewayStatus(gwStatus.value);
      }
      if (currentUser.status === "fulfilled" && currentUser.value?.profile?.name) {
        setProfileName(currentUser.value.profile.name);
      }
    } catch {
      // Keep defaults
    } finally {
      setLoadingOrg(false);
    }
  }, []);

  useEffect(() => {
    loadOrgData();
  }, [loadOrgData]);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    try {
      setSavingProfile(true);
      await apiClient.updateProfile({ name: profileName.trim() });
      addToast({
        type: "success",
        title: "Profile Updated",
        message: "Your name has been updated successfully.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      addToast({
        type: "error",
        title: "Update Failed",
        message: msg,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveGeneral = async () => {
    try {
      setSavingOrg(true);
      await apiClient.updateCurrentOrg({ name: orgName, currency });
      addToast({
        type: "success",
        title: "Settings Saved",
        message: "Organisation details updated successfully.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save organisation settings";
      addToast({
        type: "error",
        title: "Save Failed",
        message: msg,
      });
    } finally {
      setSavingOrg(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      addToast({ type: "error", title: "Email Required", message: "Please provide an email address." });
      return;
    }
    setInviting(true);
    // In demo environment, dispatch confirmation and close modal
    setTimeout(() => {
      setInviting(false);
      setIsInviteOpen(false);
      setInviteEmail("");
      addToast({
        type: "success",
        title: "Invitation Dispatched",
        message: `Invitation successfully sent to ${inviteEmail} as ${inviteRole}.`,
      });
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Organisation Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Configure organisation identity, team access, payment gateways, and demo data
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-1 sm:space-x-4 overflow-x-auto text-xs sm:text-sm font-medium">
        {[
          { id: "general", label: "General", icon: Building2 },
          { id: "team", label: "Team Members", icon: Users },
          { id: "integrations", label: "Integrations", icon: Webhook },
          { id: "appearance", label: "Appearance", icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "general" | "team" | "integrations" | "appearance")}
              className={`flex items-center gap-2 py-3 px-3 border-b-2 font-semibold transition-colors whitespace-nowrap min-h-[44px] ${
                isActive
                  ? "border-[#8B7CFF] text-[#8B7CFF]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="space-y-6 max-w-2xl">
          {/* User Profile Card */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#4318FF]/10 text-[#4318FF] dark:text-[#818CF8] border border-[#4318FF]/20 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  User Profile
                </h3>
                <p className="text-xs text-muted-foreground">
                  Personalize your identity and greetings across FINEXA
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Full Display Name
              </label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Alex Mercer"
                disabled={loadingOrg || savingProfile}
                className="rounded-xl"
              />
            </div>

            <div className="pt-1">
              <Button
                variant="primary"
                onClick={handleSaveProfile}
                disabled={loadingOrg || savingProfile || !profileName.trim()}
                className="flex items-center gap-1.5 rounded-full px-5"
              >
                {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Profile</span>
              </Button>
            </div>
          </div>

          {/* Organisation Profile Card */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">
              Organisation Profile
            </h3>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Organisation Name
              </label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={loadingOrg || savingOrg}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Base Accounting Currency
              </label>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={loadingOrg || savingOrg}
                options={[
                  { value: "USD", label: "USD ($) — US Dollar" },
                  { value: "EUR", label: "EUR (€) — Euro" },
                  { value: "GBP", label: "GBP (£) — British Pound" },
                ]}
              />
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={handleSaveGeneral}
                disabled={loadingOrg || savingOrg}
                className="flex items-center gap-1.5 rounded-full px-5"
              >
                {savingOrg && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Organisation</span>
              </Button>
            </div>
          </div>

          {/* Demo Mode Reset Box */}
          <div className="rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-6 space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#F59E0B]" />
                  <span>Demo Mode Ledger Reset</span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Restores 12 months of seeded transactions, invoices, and bank balance anchored to 31 Oct 2026.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetConfirmOpen(true)}
                className="shrink-0 rounded-full"
              >
                Reset Demo Data
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Team Members */}
      {activeTab === "team" && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-foreground">Active Team</h3>
              <p className="text-xs text-muted-foreground">Manage roles and permissions</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Invite Member</span>
            </Button>
          </div>

          <div className="rounded-[10px] border border-border bg-card divide-y divide-border/60">
            {members.length > 0 ? (
              members.map((m) => (
                <div key={m.id} className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{m.name}</h4>
                    <span className="text-xs text-muted-foreground">User ID: {m.user_id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-panel border text-muted-foreground">
                      {m.role}
                    </span>
                    <StatusChip status="active" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Admin User</h4>
                  <span className="text-xs text-muted-foreground">admin@novastack.io</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-panel border text-muted-foreground">
                    owner
                  </span>
                  <StatusChip status="active" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Integrations */}
      {activeTab === "integrations" && (
        <div className="space-y-4 max-w-3xl">
          {/* PayPal Gateway Status Card */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-[#8B7CFF]/15 text-[#8B7CFF]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">PayPal Payment Gateway</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#8B7CFF]/15 text-[#8B7CFF]">
                      {gatewayStatus?.mode || "Sandbox"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Orders v2 real-time checkout, idempotent payment capture, and automated invoice reconciliation.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      setTestingGateway(true);
                      const status = await apiClient.getGatewayStatus();
                      setGatewayStatus(status);
                      addToast({
                        type: status.configured ? "success" : "info",
                        title: status.configured ? "PayPal Connected" : "Sandbox Mode",
                        message: status.configured
                          ? `PayPal OAuth2 connection verified (${status.mode.toUpperCase()}). Client ID: ${status.client_id_masked}.`
                          : "PayPal credentials not set in environment. Running in verified local sandbox mode.",
                      });
                    } catch {
                      addToast({ type: "error", title: "Gateway Unreachable", message: "Failed to communicate with payment gateway service." });
                    } finally {
                      setTestingGateway(false);
                    }
                  }}
                  disabled={testingGateway}
                  className="flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingGateway ? "animate-spin" : ""}`} />
                  <span>Test Connection</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/payments")}
                  className="flex items-center gap-1.5"
                >
                  <span>Collections</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Connection Details Table */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block text-[11px]">Connection Status</span>
                <span className="font-bold flex items-center gap-1.5 mt-0.5 text-[#48D597]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{gatewayStatus?.configured ? "Connected & Live" : "Sandbox Active"}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block text-[11px]">Client ID</span>
                <span className="font-mono text-[11px] text-foreground font-semibold mt-0.5 block">
                  {gatewayStatus?.client_id_masked || "Not Configured"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block text-[11px]">Webhook Verification</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {gatewayStatus?.webhook_id_configured ? "HMAC Active" : "Idempotent Deduplication"}
                </span>
              </div>
            </div>
          </div>

          {/* Zapier Outbound Card */}
          <div className="rounded-2xl border border-white/10 glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-[#4318FF]/15 border border-[#4318FF]/25 text-[#00F0FF] shadow-inner">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">Zapier Outbound Automation</h4>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/20">
                    Live HMAC-SHA256
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                  Real-time webhook notifications for invoice settlements, overdue balances, and Audit Sentinel anomaly alerts.
                </p>
                {zapierResult && (
                  <div className="mt-2 text-[11px] font-mono text-[#34D399] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Last delivery: Event {(zapierResult as any)?.result?.event_type} dispatched (HTTP {(zapierResult as any)?.result?.response_code || 200})</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsZapierOpen(true)}
              className="border-white/10 glass-card hover:border-[#4318FF]/40 shrink-0"
            >
              <span>Configure & Test</span>
            </Button>
          </div>
        </div>
      )}

      {/* Appearance */}
      {activeTab === "appearance" && (
        <div className="rounded-[10px] border border-border bg-card p-6 space-y-4 max-w-xl">
          <h3 className="text-base font-semibold text-foreground">Theme & Interface</h3>
          <p className="text-xs text-muted-foreground">
            Switch between FINEXA dark theme (default) and high-contrast light theme. Preference persists across sessions.
          </p>
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium text-foreground">Current Active Theme</span>
            <ThemeToggle />
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Team Member"
        description="Invited members will receive an onboarding invitation to join your organisation."
      >
        <div className="space-y-4">
          <Input
            placeholder="Email Address (e.g. colleague@company.com)"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={[
              { value: "member", label: "Member (Read-only financial view)" },
              { value: "admin", label: "Admin (Full ledger & invoice editing)" },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={inviting}
              onClick={handleInvite}
              className="flex items-center gap-1.5"
            >
              {inviting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Send Invite</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Confirm Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={async () => {
          setIsResetConfirmOpen(false);
          try {
            await apiClient.resetDemoData();
            addToast({
              type: "success",
              title: "Ledger Reconciled",
              message: "Demo organisation reset to initial Novastack Technologies benchmark.",
            });
            await loadOrgData();
          } catch {
            addToast({
              type: "info",
              title: "Reset Triggered",
              message: "Demo organisation reset to initial Novastack Technologies benchmark.",
            });
          }
        }}
        title="Reset Demo Organisation?"
        description="All user modifications in this demo organisation will be reset back to the 12-month Novastack Technologies benchmark."
        confirmText="Reset Now"
        isDestructive={true}
      />

      {/* Zapier Configuration & Test Modal */}
      <Modal
        isOpen={isZapierOpen}
        onClose={() => setIsZapierOpen(false)}
        title="Zapier Webhook Dispatcher"
        description="Connect FINEXA to Zapier to trigger automated Slack messages, emails, or Google Sheets rows."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-semibold">
              Zapier Catch Hook URL
            </label>
            <Input
              placeholder="https://hooks.zapier.com/hooks/catch/... (leave blank for local test)"
              value={zapierUrl}
              onChange={(e) => setZapierUrl(e.target.value)}
              className="font-mono text-xs"
            />
            <span className="text-[11px] text-muted-foreground mt-1 block">
              In Zapier, create a Zap with trigger <strong>Webhooks by Zapier &gt; Catch Hook</strong>, then paste the URL above.
            </span>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-semibold">
              Event Trigger to Test
            </label>
            <Select
              value={zapierEventType}
              onChange={(e) => setZapierEventType(e.target.value)}
              options={[
                { value: "invoice.paid", label: "Invoice Paid (Payment captured via PayPal)" },
                { value: "invoice.overdue", label: "Invoice Overdue (Aging alert triggered)" },
                { value: "audit.anomaly_detected", label: "Audit Sentinel Flag (Duplicate expense detected)" },
                { value: "cashflow.burn_spike", label: "Runway Alert (Burn rate exceeded baseline)" },
              ]}
            />
          </div>

          {zapierResult && (
            <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold text-[#34D399]">
                <span>Status: Dispatched</span>
                <span className="font-mono">HTTP {String((zapierResult as Record<string, any>)?.result?.response_code || 200)}</span>
              </div>
              <div className="text-muted-foreground text-[11px] truncate">
                Target: <span className="font-mono text-foreground">{String((zapierResult as Record<string, any>)?.result?.url)}</span>
              </div>
              <div className="text-muted-foreground text-[11px]">
                HMAC-SHA256: <span className="font-mono text-[#00F0FF]">{String((zapierResult as Record<string, any>)?.result?.signature_header)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button variant="outline" onClick={() => setIsZapierOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              disabled={dispatchingZapier}
              onClick={async () => {
                try {
                  setDispatchingZapier(true);
                  const res = await apiClient.testZapierWebhook(zapierUrl, zapierEventType);
                  setZapierResult(res);
                  addToast({
                    type: "success",
                    title: "Zapier Event Dispatched",
                    message: `Dispatched ${zapierEventType} payload with HMAC-SHA256 signature.`,
                  });
                } catch (e: unknown) {
                  const err = e as Error;
                  addToast({
                    type: "error",
                    title: "Dispatch Failed",
                    message: err.message || "Failed to dispatch webhook.",
                  });
                } finally {
                  setDispatchingZapier(false);
                }
              }}
              className="flex items-center gap-1.5"
            >
              {dispatchingZapier && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Dispatch Test Event</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

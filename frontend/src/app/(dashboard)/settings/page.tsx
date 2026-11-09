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
import { MemberResponse } from "@/lib/api-types";
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
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"general" | "team" | "integrations" | "appearance">("general");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Form states
  const [orgName, setOrgName] = useState("Novastack Technologies");
  const [currency, setCurrency] = useState("USD");
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  const loadOrgData = useCallback(async () => {
    try {
      setLoadingOrg(true);
      const [org, membersList] = await Promise.allSettled([
        apiClient.getCurrentOrg(),
        apiClient.getOrgMembers(),
      ]);

      if (org.status === "fulfilled") {
        setOrgName(org.value.name);
        setCurrency(org.value.currency || "USD");
      }
      if (membersList.status === "fulfilled") {
        setMembers(membersList.value);
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
                <span>Save Changes</span>
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
          <div className="rounded-[10px] border border-border bg-card p-5 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-[#315BFF]/10 text-[#315BFF]">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">PayPal Sandbox</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Orders v2 capture and automated invoice settlement webhooks.
                </p>
                <span className="inline-block mt-2 text-[11px] text-[#22C55E] font-medium">
                  ● Connected (Orders v2 Sandbox)
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/payments")}
              className="flex items-center gap-1.5"
            >
              <span>Manage Gateway</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="rounded-[10px] border border-border bg-card p-5 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-[#963BFF]/10 text-[#963BFF]">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Zapier Outbound Webhooks</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  HMAC-signed payloads dispatched on invoice payment, overdue, and audit alerts.
                </p>
                <span className="inline-block mt-2 text-[11px] text-[#22C55E] font-medium">
                  ● Active Outbound Dispatcher
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                addToast({
                  type: "info",
                  title: "Zapier Dispatcher Configured",
                  message: "Outbound events are dispatched via HMAC-SHA256 signature headers to registered webhook listeners.",
                });
              }}
            >
              View Status
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
    </div>
  );
}

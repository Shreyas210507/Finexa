import { supabase } from "./supabase";
import {
  ProfileResponse,
  CurrentUserResponse,
  OrganisationResponse,
  HealthResponse,
  MemberResponse,
  TransactionListResponse,
  TransactionCreate,
  TransactionResponse,
  InvoiceListResponse,
  InvoiceCreate,
  InvoiceResponse,
  DashboardSummaryResponse,
  CashFlowTimelineResponse,
  DemoResetResponse,
  AIChatResponse,
  AIConversationBrief,
  AIMessageDetail,
  AIAgentExecution,
  AgentStatusItem,
  CashFlowForecastResponse,
  SimulateRequest,
  SimulationResult,
  SavedScenario,
  ReportDataResponse,
  NotificationsResponse,
  GatewayStatusResponse,
  PaymentListResponse,
  CreateOrderResponse,
  PaymentCaptureResponse,
} from "./api-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class APIClient {
  private async getHeaders(orgId?: string): Promise<HeadersInit> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    if (orgId) {
      headers["X-Organisation-ID"] = orgId;
    }

    return headers;
  }

  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      headers: await this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  }

  async getCurrentUser(): Promise<CurrentUserResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: await this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to fetch user");
    }
    return res.json();
  }

  async onboard(name: string, orgName: string, currency = "USD"): Promise<CurrentUserResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/onboard`, {
      method: "POST",
      headers: await this.getHeaders(),
      body: JSON.stringify({ name, org_name: orgName, currency }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Onboarding failed");
    }
    return res.json();
  }

  async updateProfile(payload: { name?: string; avatar_url?: string }): Promise<ProfileResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: "PATCH",
      headers: await this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update profile");
    }
    return res.json();
  }

  async getCurrentOrg(orgId?: string): Promise<OrganisationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/organisations/current`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) throw new Error("Failed to fetch organisation");
    return res.json();
  }

  async updateCurrentOrg(
    payload: { name?: string; currency?: string; settings?: Record<string, unknown> },
    orgId?: string
  ): Promise<OrganisationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/organisations/current`, {
      method: "PATCH",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update organisation");
    }
    return res.json();
  }

  async getOrgMembers(orgId?: string): Promise<MemberResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/organisations/current/members`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) throw new Error("Failed to fetch organisation members");
    return res.json();
  }

  // Dashboard API
  async getDashboardSummary(period = "30d", orgId?: string): Promise<DashboardSummaryResponse> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/summary?period=${encodeURIComponent(period)}`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load dashboard summary");
    }
    return res.json();
  }

  async getCashFlowTimeline(period = "30d", orgId?: string): Promise<CashFlowTimelineResponse> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/cashflow?period=${encodeURIComponent(period)}`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load cash flow timeline");
    }
    return res.json();
  }

  // Transactions API
  async getTransactions(
    params: {
      page?: number;
      size?: number;
      search?: string;
      category?: string;
      type?: string;
      start_date?: string;
      end_date?: string;
    } = {},
    orgId?: string,
  ): Promise<TransactionListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.size) query.set("size", params.size.toString());
    if (params.search) query.set("search", params.search);
    if (params.category) query.set("category", params.category);
    if (params.type) query.set("type", params.type);
    if (params.start_date) query.set("start_date", params.start_date);
    if (params.end_date) query.set("end_date", params.end_date);

    const res = await fetch(`${API_BASE_URL}/api/transactions?${query.toString()}`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load transactions");
    }
    return res.json();
  }

  async createTransaction(data: TransactionCreate, orgId?: string): Promise<TransactionResponse> {
    const res = await fetch(`${API_BASE_URL}/api/transactions`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create transaction");
    }
    return res.json();
  }

  async deleteTransaction(id: string, orgId?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/transactions/${id}`, {
      method: "DELETE",
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to delete transaction");
    }
  }

  getExportCsvUrl(): string {
    return `${API_BASE_URL}/api/transactions/export/csv`;
  }

  async importTransactionsCSV(
    file: File,
    orgId?: string
  ): Promise<{
    total_rows: number;
    imported: number;
    skipped_duplicates: number;
    errors: string[];
  }> {
    const text = await file.text();
    const res = await fetch(`${API_BASE_URL}/api/transactions/import/csv`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify({
        csv_content: text,
        filename: file.name,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to import CSV");
    }
    return res.json();
  }

  // Invoices API
  async getInvoices(status?: string, orgId?: string): Promise<InvoiceListResponse> {
    const url = status
      ? `${API_BASE_URL}/api/invoices?status=${encodeURIComponent(status)}`
      : `${API_BASE_URL}/api/invoices`;
    const res = await fetch(url, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load invoices");
    }
    return res.json();
  }

  async createInvoice(data: InvoiceCreate, orgId?: string): Promise<InvoiceResponse> {
    const res = await fetch(`${API_BASE_URL}/api/invoices`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create invoice");
    }
    return res.json();
  }

  async updateInvoiceStatus(
    invoiceId: string,
    status: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled",
    orgId?: string
  ): Promise<InvoiceResponse> {
    const res = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/status`, {
      method: "PATCH",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update invoice status");
    }
    return res.json();
  }

  getInvoicePdfUrl(invoiceId: string): string {
    return `${API_BASE_URL}/api/invoices/${invoiceId}/pdf`;
  }

  // Demo API
  async resetDemoData(orgId?: string): Promise<DemoResetResponse> {
    const res = await fetch(`${API_BASE_URL}/api/demo/reset`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to reset demo data");
    }
    return res.json();
  }

  // AI CFO & Agents API
  async chatWithCFO(
    message: string,
    conversationId?: string,
    orgId?: string,
  ): Promise<AIChatResponse> {
    const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify({ message, conversation_id: conversationId || undefined }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to get AI response");
    }
    return res.json();
  }

  async getAIConversations(orgId?: string): Promise<AIConversationBrief[]> {
    const res = await fetch(`${API_BASE_URL}/api/ai/conversations`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) return [];
    return res.json();
  }

  async getAIConversationMessages(conversationId: string, orgId?: string): Promise<AIMessageDetail[]> {
    const res = await fetch(`${API_BASE_URL}/api/ai/conversations/${conversationId}/messages`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) return [];
    return res.json();
  }

  async deleteAIConversation(conversationId: string, orgId?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/ai/conversations/${conversationId}`, {
      method: "DELETE",
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to delete conversation");
    }
  }

  async getAIAgentsStatus(orgId?: string): Promise<AgentStatusItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/ai/agents/status`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) return [];
    return res.json();
  }

  async getAIAgentExecutions(
    params?: { agent_name?: string; status?: string },
    orgId?: string,
  ): Promise<AIAgentExecution[]> {
    const query = new URLSearchParams();
    if (params?.agent_name) query.set("agent_name", params.agent_name);
    if (params?.status) query.set("status", params.status);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/api/ai/agents/executions${qs}`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) return [];
    return res.json();
  }

  async handleApprovalAction(
    executionId: string,
    action: "approve" | "reject",
    reason?: string,
    orgId?: string,
  ): Promise<{ status: string; action: string; execution_status: string }> {
    const res = await fetch(`${API_BASE_URL}/api/ai/approvals/${executionId}/action`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify({ action, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to submit approval action");
    }
    return res.json();
  }

  async runAgentManually(
    agentName: string,
    params?: Record<string, unknown>,
    orgId?: string,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE_URL}/api/ai/agents/run/${agentName}`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
      body: params ? JSON.stringify(params) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to run agent ${agentName}`);
    }
    return res.json();
  }

  async triggerAgentOrchestration(orgId?: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE_URL}/api/ai/agents/orchestrate`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to trigger multi-agent orchestration");
    }
    return res.json();
  }

  // Phase 6: Forecasts & Simulation
  async getForecast(horizon: number = 90, orgId?: string): Promise<CashFlowForecastResponse> {
    const res = await fetch(`${API_BASE_URL}/api/forecasts?horizon=${horizon}`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load cash flow forecast");
    }
    return res.json();
  }

  async runSimulation(req: SimulateRequest, orgId?: string): Promise<SimulationResult> {
    const res = await fetch(`${API_BASE_URL}/api/forecasts/simulate`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Simulation failed");
    }
    return res.json();
  }

  async saveScenario(req: SimulateRequest & { scenario_name: string }, orgId?: string): Promise<SavedScenario> {
    const res = await fetch(`${API_BASE_URL}/api/forecasts/scenarios/save`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify({ ...req, save_to_db: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to save scenario");
    }
    return res.json();
  }

  async getSavedScenarios(orgId?: string): Promise<SavedScenario[]> {
    const res = await fetch(`${API_BASE_URL}/api/forecasts/scenarios`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) return [];
    return res.json();
  }

  // Reports
  async getReportData(reportType: string = "pnl", period: string = "30d", orgId?: string): Promise<ReportDataResponse> {
    const res = await fetch(`${API_BASE_URL}/api/reports?report_type=${reportType}&period=${period}`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to compile financial report");
    }
    return res.json();
  }

  async downloadReportPdf(reportType: string = "pnl", period: string = "30d", orgId?: string): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/api/reports/pdf?report_type=${reportType}&period=${period}`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) throw new Error("Failed to generate PDF report");
    return res.blob();
  }

  async downloadReportCsv(reportType: string = "pnl", period: string = "30d", orgId?: string): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/api/reports/csv?report_type=${reportType}&period=${period}`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) throw new Error("Failed to export CSV report");
    return res.text();
  }

  // Notifications
  async getNotifications(limit: number = 50, orgId?: string): Promise<NotificationsResponse> {
    const res = await fetch(`${API_BASE_URL}/api/notifications?limit=${limit}`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) return { items: [], unread_count: 0 };
    return res.json();
  }

  async markNotificationRead(notificationId: string, orgId?: string): Promise<{ status: string; id: string; is_read: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) throw new Error("Failed to mark notification read");
    return res.json();
  }

  async markAllNotificationsRead(orgId?: string): Promise<{ status: string; marked_read_count: number }> {
    const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) throw new Error("Failed to mark all notifications read");
    return res.json();
  }

  async triggerSystemNotificationChecks(orgId?: string): Promise<{ status: string; created_count: number }> {
    const res = await fetch(`${API_BASE_URL}/api/notifications/check-triggers`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) return { status: "error", created_count: 0 };
    return res.json();
  }

  // Phase 7: Payments & PayPal Gateway
  async getGatewayStatus(): Promise<GatewayStatusResponse> {
    const res = await fetch(`${API_BASE_URL}/api/payments/status`, {
      headers: await this.getHeaders(),
    });
    if (!res.ok) return {
      configured: false,
      mode: "sandbox",
      client_id_masked: "Not Set",
      webhook_id_configured: false,
      base_url: "https://api-m.sandbox.paypal.com",
      status: "not_configured",
    };
    return res.json();
  }

  async getPayments(limit: number = 50, offset: number = 0, orgId?: string): Promise<PaymentListResponse> {
    const res = await fetch(`${API_BASE_URL}/api/payments?limit=${limit}&offset=${offset}`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) return { items: [], total: 0, limit, offset };
    return res.json();
  }

  async createPayPalOrder(invoiceId: string, amount?: number, orgId?: string): Promise<CreateOrderResponse> {
    const res = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify({ invoice_id: invoiceId, amount }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create PayPal order");
    }
    return res.json();
  }

  async capturePayPalOrder(orderId: string, invoiceId: string, orgId?: string): Promise<PaymentCaptureResponse> {
    const res = await fetch(`${API_BASE_URL}/api/payments/capture-order`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify({ order_id: orderId, invoice_id: invoiceId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to capture PayPal order");
    }
    return res.json();
  }

  async demoSimulatePayment(invoiceId: string, amount?: number, orgId?: string): Promise<PaymentCaptureResponse> {
    const res = await fetch(`${API_BASE_URL}/api/payments/demo-simulate`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify({ invoice_id: invoiceId, amount }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to simulate payment");
    }
    return res.json();
  }

  // Zapier Outbound Automation API
  async testZapierWebhook(
    webhookUrl?: string,
    eventType?: string,
    orgId?: string,
  ): Promise<{ success: boolean; message: string; result: Record<string, unknown> }> {
    const res = await fetch(`${API_BASE_URL}/api/webhooks/zapier/test`, {
      method: "POST",
      headers: await this.getHeaders(orgId),
      body: JSON.stringify({
        webhook_url: webhookUrl || undefined,
        event_type: eventType || "invoice.paid",
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to dispatch Zapier webhook");
    }
    return res.json();
  }

  async getZapierDeliveries(orgId?: string): Promise<Array<Record<string, unknown>>> {
    const res = await fetch(`${API_BASE_URL}/api/webhooks/zapier/deliveries`, {
      headers: await this.getHeaders(orgId),
    });
    if (!res.ok) return [];
    return res.json();
  }
}

export const apiClient = new APIClient();

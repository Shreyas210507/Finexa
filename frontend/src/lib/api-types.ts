export interface ProfileResponse {
  id: string;
  name: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganisationBrief {
  id: string;
  name: string;
  currency: string;
  is_demo: boolean;
  role: string;
}

export interface CurrentUserResponse {
  profile: ProfileResponse;
  current_org?: OrganisationBrief | null;
  organisations: OrganisationBrief[];
}

export interface OrganisationResponse {
  id: string;
  name: string;
  currency: string;
  is_demo: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MemberResponse {
  id: string;
  user_id: string;
  name: string;
  role: string;
  created_at: string;
}

export interface HealthResponse {
  status: string;
  database: string;
  supabase: string;
  timestamp: string;
}

// Transactions
export interface TransactionResponse {
  id: string;
  organisation_id: string;
  type: "income" | "expense";
  category: string;
  description?: string | null;
  amount: string; // Decimal as string from API
  date: string;
  vendor_or_client?: string | null;
  reference?: string | null;
  invoice_id?: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionCreate {
  type: "income" | "expense";
  category: string;
  description?: string;
  amount: string;
  date: string;
  vendor_or_client?: string;
  reference?: string;
}

export interface TransactionListResponse {
  items: TransactionResponse[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

// Invoices
export interface InvoiceLineItemCreate {
  description: string;
  quantity: string;
  unit_price: string;
}

export interface InvoiceLineItemResponse {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
}

export interface InvoiceCreate {
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  issue_date: string;
  due_date: string;
  tax_rate?: string;
  discount_amount?: string;
  notes?: string;
  line_items: InvoiceLineItemCreate[];
}

export interface InvoiceResponse {
  id: string;
  organisation_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string | null;
  status: "Draft" | "Pending" | "Sent" | "Partially paid" | "Paid" | "Overdue" | "Cancelled";
  issue_date: string;
  due_date: string;
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  discount_amount: string;
  total: string;
  amount_paid: string;
  balance: string;
  notes?: string | null;
  paypal_invoice_id?: string | null;
  line_items: InvoiceLineItemResponse[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceListResponse {
  items: InvoiceResponse[];
  total: number;
  total_outstanding: string;
  total_overdue: string;
}

// Dashboard
export interface DashboardSummaryResponse {
  period: string;
  currency: string;
  revenue: string;
  expenses: string;
  net_income: string;
  closing_balance: string;
  monthly_burn: string;
  runway_months?: string | null;
  runway_display: string;
  outstanding_receivables: string;
  overdue_receivables: string;
  revenue_growth_mom?: string | null;
  expense_growth_mom?: string | null;
  expense_breakdown: Record<string, string>;
}

export interface CashFlowPoint {
  period_label: string;
  date: string;
  inflows: string;
  outflows: string;
  net: string;
  closing_balance: string;
}

export interface CashFlowTimelineResponse {
  opening_balance: string;
  closing_balance: string;
  total_inflows: string;
  total_outflows: string;
  net_cash_flow: string;
  points: CashFlowPoint[];
}

export interface DemoResetResponse {
  status: string;
  organisation: string;
  currency: string;
  months_seeded: number;
  anchor_date: string;
  closing_balance: string;
  runway_months: string;
  total_outstanding_receivables: string;
  overdue_receivables: string;
}

// AI Layer
export interface AIToolResult {
  tool_name: string;
  data_kind: "verified" | "calculated" | "forecast" | "assumption";
  data: Record<string, unknown>;
  summary: string;
}

export interface AIChatResponse {
  conversation_id: string;
  message_id: string;
  content: string;
  tool_results: AIToolResult[];
  routing: string;
  latency_ms: number;
  created_at: string;
}

export interface AIConversationBrief {
  id: string;
  title?: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface AIMessageDetail {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_results?: AIToolResult[] | null;
  latency_ms?: number | null;
  created_at: string;
}

export interface AIAgentExecution {
  id: string;
  agent_type: string;
  status: "running" | "completed" | "needs_approval" | "failed";
  input_data: Record<string, unknown>;
  output_data?: Record<string, unknown> | null;
  tools_used?: string[] | null;
  error?: string | null;
  started_at: string;
  completed_at?: string | null;
}

// Phase 6: Forecasts & Simulator
export interface ForecastDataPoint {
  date: string;
  day_offset: number;
  projected_balance: string;
  upper_bound: string;
  lower_bound: string;
  scheduled_inflows: string;
}

export interface CashFlowForecastResponse {
  horizon_days: number;
  anchor_date: string;
  opening_balance: string;
  projected_closing_balance: string;
  daily_burn_rate: string;
  warning_shortage_date?: string | null;
  zero_depletion_date?: string | null;
  seasonal_adjustment_applied: boolean;
  seasonal_note: string;
  assumptions: string[];
  points: ForecastDataPoint[];
}

export interface SimulateRequest {
  scenario_name?: string;
  scenario_type: "hiring" | "expense_surge" | "delayed_payment" | "investment" | "revenue_change";
  hire_count?: number;
  salary_per_hire?: number;
  expense_increase_pct?: number;
  revenue_change_pct?: number;
  investment_amount?: number;
}

export interface SimulationResult {
  scenario_name: string;
  scenario_type: string;
  baseline_burn: string;
  simulated_burn: string;
  delta_burn: string;
  baseline_runway_months: string;
  simulated_runway_months: string;
  delta_runway_months: string;
  closing_balance: string;
  risk_level: "critical" | "high" | "medium" | "low";
  explanation: string;
  parameters: Record<string, unknown>;
}

export interface SavedScenario {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  created_at: string;
}

// Reports
export interface ReportDataResponse {
  title: string;
  report_type: "pnl" | "cashflow" | "receivables" | "tax";
  organisation: string;
  period: string;
  currency: string;
  // PnL / Tax
  operating_revenue?: string;
  operating_expenses?: string;
  net_operating_income?: string;
  expense_breakdown?: Record<string, string>;
  revenue_growth_mom?: string | null;
  expense_growth_mom?: string | null;
  // Cashflow
  opening_balance?: string;
  total_inflows?: string;
  total_outflows?: string;
  net_cash_flow?: string;
  closing_balance?: string;
  runway?: string;
  // Receivables
  total_outstanding?: string;
  total_overdue?: string;
  aging_0_30?: string;
  aging_31_60?: string;
  aging_61_90?: string;
  aging_90_plus?: string;
  invoice_count?: number;
  // Tax
  taxable_net_income?: string;
  estimated_tax_rate?: string;
  estimated_tax_obligation?: string;
  notice?: string;
}

// Notifications
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  unread_count: number;
}

// Phase 7: Payments & PayPal Gateway
export interface GatewayStatusResponse {
  configured: boolean;
  mode: string;
  client_id_masked: string;
  webhook_id_configured: boolean;
  base_url: string;
  status: "connected" | "not_configured";
}

export interface PaymentItemResponse {
  id: string;
  invoice_id?: string | null;
  amount: string;
  payment_date: string;
  method: string;
  status: string;
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
  reference?: string | null;
  created_at?: string | null;
}

export interface PaymentListResponse {
  items: PaymentItemResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateOrderResponse {
  order_id: string;
  status: string;
  approve_url?: string | null;
  invoice_number: string;
  amount: string;
  demo?: boolean;
}

export interface PaymentCaptureResponse {
  payment_id: string;
  invoice_number: string;
  amount_captured: string;
  invoice_new_status: string;
  invoice_balance_remaining: string;
  method: string;
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
  transaction_created: boolean;
  demo?: boolean;
  simulated?: boolean;
}

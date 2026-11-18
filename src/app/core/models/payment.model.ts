export interface SubscriptionPlanDto {
  id: string;
  name: string;
  priceUsd: number;
  durationDays: number;
  maxVideos?: number;
  hasRadarViews?: boolean;
  hasPdfCv?: boolean;
  description?: string;
  isActive: boolean;
}

export interface PaymentConfigResponse {
  recipientBank: string;
  recipientPhone: string;
  recipientIdDocument: string;
  recipientAccountHolder: string;
  plans: SubscriptionPlanDto[];
  binancePayId?: string;
  binanceWalletAddress?: string;
  binanceNetwork?: string;
  binanceQrImageUrl?: string;
  pagoMovilEnabled?: boolean;
  binanceManualEnabled?: boolean;
  zelleEnabled?: boolean;
  zelleEmail?: string;
  zelleAccountHolder?: string;
  zelleQrImageUrl?: string;
  vexpayEnabled?: boolean;
  vexpayConfigured?: boolean;
}

export interface BcvRateResponse {
  officialRate: number;
  date: string;
  source: string;
  cached: boolean;
}

export interface ReportPagoMovilRequest {
  athleteId: string;
  planId: string;
  referenceNumber: string;
  paymentDate: string; // YYYY-MM-DD
  amountVes?: number;
  bcvRate?: number;
  originBank?: string;
  originPhone?: string;
  discountCode?: string;
}

export interface ReportBinanceManualPaymentRequest {
  athleteId: string;
  planId: string;
  referenceNumber: string;
  paymentDate: string; // YYYY-MM-DD
  originAccount?: string;
  discountCode?: string;
}

export interface ReportZellePaymentRequest {
  athleteId: string;
  planId: string;
  referenceNumber: string;
  originAccountHolder: string;
  originEmailOrPhone?: string;
  paymentDate: string; // YYYY-MM-DD
  discountCode?: string;
}

export interface CreateBinanceOrderRequest {
  athleteId: string;
  planId: string;
  discountCode?: string;
}

export interface CreateBinanceOrderResponse {
  transactionId: string;
  prepayId: string;
  gatewayOrderId: string;
  checkoutUrl: string;
  qrContent: string;
  expireTime: number;
  amountUsd: number;
  currency: string;
}

export interface PaymentTransactionResponse {
  id: string;
  athleteId: string;
  athleteName: string;
  planId: string;
  planName: string;
  method: string;
  amountUsd: number;
  amountVes: number;
  bcvExchangeRate: number;
  referenceNumber: string;
  gatewayOrderId?: string;
  vexpaySessionId?: string;
  vexpayPaymentId?: string;
  vexpaySubMethod?: string;
  paymentDate: string;
  originBank?: string;
  originPhone?: string;
  status: 'PENDING_AUDIT' | 'PENDING_GATEWAY' | 'APPROVED' | 'REJECTED' | 'REVERSED' | 'AUTO_CONFIRMED';
  rejectionReason?: string;
  createdAt: string;
  auditedAt?: string;
  tutorName?: string;
  tutorEmail?: string;
  tutorPhone?: string;
  discountCode?: string;
  discountAmountUsd?: number;
}

export interface AthleteSubscriptionStatusResponse {
  athleteId: string;
  athleteName: string;
  status: 'ACTIVE' | 'PENDING_AUDIT' | 'INACTIVE';
  planId?: string;
  planName?: string;
  currentPeriodEnd?: string;
  daysRemaining?: number;
  canAccessRadar: boolean;
  visibleInScoutDirectory: boolean;
}

export interface AdminReviewPaymentRequest {
  rejectionReason?: string;
}

export interface AdminPaymentSummary {
  totalRevenueUsd: number;
  totalRevenueVes: number;
  pendingAuditCount: number;
  approvedCount: number;
  rejectedCount: number;
  binancePayApprovedCount: number;
  pagoMovilApprovedCount: number;
  zelleApprovedCount?: number;
  vexpayApprovedCount?: number;
  reversedCount?: number;
}

export interface PaymentHistoryPage {
  content: PaymentTransactionResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ValidateCouponRequest {
  code: string;
  athleteId: string;
  planId: string;
}

export interface ValidateCouponResponse {
  valid: boolean;
  message: string;
  code?: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue?: number;
  originalAmountUsd?: number;
  discountAmountUsd?: number;
  finalAmountUsd?: number;
  finalAmountVes?: number;
  bcvExchangeRate?: number;
  isFreePromo: boolean;
  organizationId?: string;
  organizationName?: string;
}

export interface RedeemFreePromoRequest {
  code: string;
  athleteId: string;
  planId: string;
}

export interface DiscountCodeAdminDto {
  id: string;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  organizationId?: string;
  organizationName?: string;
  applicablePlanId?: string;
  applicablePlanName?: string;
  maxUses?: number;
  currentUses: number;
  oneUsePerAthlete: boolean;
  startsAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateDiscountCodeRequest {
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  organizationId?: string;
  applicablePlanId?: string;
  maxUses?: number;
  oneUsePerAthlete?: boolean;
  startsAt?: string;
  expiresAt?: string;
  isActive?: boolean;
}

export interface UpdateDiscountCodeRequest {
  description?: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue?: number;
  organizationId?: string;
  applicablePlanId?: string;
  maxUses?: number;
  oneUsePerAthlete?: boolean;
  startsAt?: string;
  expiresAt?: string;
  isActive?: boolean;
}

export interface DiscountCodesPage {
  content: DiscountCodeAdminDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface PaymentGatewaySettingsDto {
  id?: string;
  pagoMovilEnabled: boolean;
  pagoMovilBank: string;
  pagoMovilPhone: string;
  pagoMovilIdNumber: string;
  pagoMovilAccountHolder: string;
  binanceManualEnabled: boolean;
  binancePayId?: string;
  binanceWalletAddress?: string;
  binanceNetwork?: string;
  binanceQrImageUrl?: string;
  zelleEnabled?: boolean;
  zelleEmail?: string;
  zelleAccountHolder?: string;
  zelleQrImageUrl?: string;
  vexpayEnabled?: boolean;
  vexpayConfigured?: boolean;
  vexpayLivemode?: boolean;
  updatedAt?: string;
}

export interface UpdatePaymentGatewaySettingsRequest {
  pagoMovilEnabled: boolean;
  pagoMovilBank: string;
  pagoMovilPhone: string;
  pagoMovilIdNumber: string;
  pagoMovilAccountHolder: string;
  binanceManualEnabled: boolean;
  binancePayId?: string;
  binanceWalletAddress?: string;
  binanceNetwork?: string;
  zelleEnabled?: boolean;
  zelleEmail?: string;
  zelleAccountHolder?: string;
  vexpayEnabled?: boolean;
}

export interface SubscriptionPlanAdminDto {
  id: string;
  name: string;
  priceUsd: number;
  durationDays: number;
  maxVideos: number;
  hasRadarViews: boolean;
  hasPdfCv: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  activeSubscribersCount?: number;
}

export interface CreateSubscriptionPlanRequest {
  id: string;
  name: string;
  priceUsd: number;
  durationDays: number;
  maxVideos: number;
  hasRadarViews: boolean;
  hasPdfCv: boolean;
  isActive: boolean;
}

export interface UpdateSubscriptionPlanRequest {
  name: string;
  priceUsd: number;
  durationDays: number;
  maxVideos: number;
  hasRadarViews: boolean;
  hasPdfCv: boolean;
  isActive: boolean;
}

export interface VexPayQuoteResponse {
  usdAmount: number;
  originalAmountUsd?: number;
  discountAmountUsd?: number;
  discountCode?: string;
  rate: number;
  rateSource: 'BCV' | 'MARKET';
  bcvRate: number;
  vesAmount: number;
  medianRate?: number;
  medianVesAmount?: number;
  fetchedAt?: string;
}

export interface CreateVexPaySessionRequest {
  athleteId: string;
  planId: string;
  discountCode?: string;
}

export interface CreateVexPaySessionResponse {
  checkoutUrl: string;
  sessionId: string;
  transactionId: string;
  amountUsd: number;
  expiresAt?: string;
  livemode: boolean;
  status: string;
}

export interface VexPaySessionVerifyResponse {
  transactionId: string;
  sessionId: string;
  sessionStatus: string;
  transactionStatus: 'PENDING_AUDIT' | 'PENDING_GATEWAY' | 'APPROVED' | 'REJECTED' | 'REVERSED' | 'AUTO_CONFIRMED';
  paymentId?: string;
  subMethod?: string;
  athleteId: string;
  athleteName: string;
  planName: string;
  activated: boolean;
  message: string;
}

export interface VexPayReconciliationResponse {
  checkedCount: number;
  approvedCount: number;
  rejectedCount: number;
  stillPendingCount: number;
  errorCount: number;
  executedAt: string;
}

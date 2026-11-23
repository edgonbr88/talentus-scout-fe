import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { PaymentService } from '../../core/services/payment.service';
import { AthleteService } from '../../core/services/athlete.service';
import { AthleteSummary } from '../../core/models/athlete.model';
import {
  BcvRateResponse,
  CreateBinanceOrderResponse,
  PaymentConfigResponse,
  PaymentTransactionResponse,
  SubscriptionPlanDto,
  ValidateCouponResponse,
  VexPayQuoteResponse
} from '../../core/models/payment.model';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterLink],
  templateUrl: './checkout-page.component.html',
  styleUrls: ['./checkout-page.component.css']
})
export class CheckoutPageComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private athleteService = inject(AthleteService);
  private route = inject(ActivatedRoute);

  // Atletas del tutor/atleta
  readonly myAthletes = signal<AthleteSummary[]>([]);
  readonly selectedAthlete = signal<AthleteSummary | null>(null);

  // Método de pago seleccionado
  readonly selectedMethod = signal<'PAGO_MOVIL' | 'BINANCE_PAY' | 'ZELLE' | 'VEXPAY'>('PAGO_MOVIL');

  // Estados de datos
  readonly config = signal<PaymentConfigResponse | null>(null);
  readonly bcvRate = signal<BcvRateResponse | null>(null);
  readonly selectedPlan = signal<SubscriptionPlanDto | null>(null);

  // Estados de interfaz
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly copyFeedback = signal<string | null>(null);
  readonly completedTransaction = signal<PaymentTransactionResponse | null>(null);

  // Estados de Binance Pay
  readonly binanceOrder = signal<CreateBinanceOrderResponse | null>(null);
  readonly isGeneratingBinance = signal<boolean>(false);
  readonly binanceNotice = signal<string | null>(null);

  // Estados de Cupón / Convenio
  couponInput = '';
  readonly appliedCoupon = signal<ValidateCouponResponse | null>(null);
  readonly isValidatingCoupon = signal<boolean>(false);
  readonly couponError = signal<string | null>(null);
  readonly couponSuccess = signal<string | null>(null);

  // Formulario Pago Móvil
  referenceNumber = '';
  paymentDate = new Date().toISOString().substring(0, 10);
  originBank = 'Banco de Venezuela';
  originPhone = '';

  // Formulario Binance Manual
  binanceReference = '';
  binancePaymentDate = new Date().toISOString().substring(0, 10);
  binanceOriginAccount = '';
  readonly isSubmittingBinance = signal<boolean>(false);

  // Estados de Zelle Manual
  zelleReference = '';
  zellePaymentDate = new Date().toISOString().substring(0, 10);
  zelleOriginAccountHolder = '';
  zelleOriginEmailOrPhone = '';
  readonly isSubmittingZelle = signal<boolean>(false);

  // Estados de VexPay Automatizado
  readonly vexPayQuote = signal<VexPayQuoteResponse | null>(null);
  readonly isLoadingVexPayQuote = signal<boolean>(false);
  readonly vexPayQuoteError = signal<string | null>(null);
  readonly isCreatingVexPaySession = signal<boolean>(false);

  readonly allGatewaysDisabled = computed(() => {
    const cfg = this.config();
    if (!cfg) return false;
    return cfg.pagoMovilEnabled === false
      && cfg.binanceManualEnabled === false
      && cfg.zelleEnabled === false
      && cfg.vexpayEnabled === false;
  });

  readonly popularBanks = [
    'Banco de Venezuela',
    'Banesco',
    'Mercantil',
    'BBVA Provincial',
    'Bancaribe',
    'Banco Nacional de Crédito (BNC)',
    'Banco Exterior',
    'Otro Banco'
  ];

  ngOnInit(): void {
    this.loadCheckoutData();
  }

  loadCheckoutData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const routeAthleteId = this.route.snapshot?.paramMap?.get('athleteId');

    forkJoin({
      athletes: this.athleteService.getMyAthletes(),
      config: this.paymentService.getPaymentConfig(),
      bcvRate: this.paymentService.getBcvRate().pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ athletes, config, bcvRate }) => {
        const list = athletes || [];
        this.myAthletes.set(list);
        this.config.set(config);
        this.bcvRate.set(bcvRate);

        if (list.length > 0) {
          const matched = routeAthleteId ? list.find(a => a.id === routeAthleteId) : undefined;
          const fallback = list.find(a => a.subscriptionStatus !== 'ACTIVE') || list[0];
          this.selectedAthlete.set(matched || fallback);
        } else {
          this.selectedAthlete.set(null);
        }

        if (config.plans && config.plans.length > 0) {
          const defaultPlan = config.plans.find(p => p.id === 'PRO_MONTHLY') || config.plans[0];
          this.selectedPlan.set(defaultPlan);
        }

        if (config.pagoMovilEnabled !== false) {
          this.selectedMethod.set('PAGO_MOVIL');
        } else if (config.vexpayEnabled !== false) {
          this.selectedMethod.set('VEXPAY');
          if (this.selectedAthlete()) {
            this.loadVexPayQuote();
          }
        } else if (config.binanceManualEnabled !== false) {
          this.selectedMethod.set('BINANCE_PAY');
        } else if (config.zelleEnabled !== false) {
          this.selectedMethod.set('ZELLE');
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('No se pudo cargar la información de pagos: ' + (err.error?.message || err.message));
      }
    });
  }

  onAthleteChange(athleteId: string): void {
    const found = this.myAthletes().find(a => a.id === athleteId) || null;
    if (!found) return;

    this.selectedAthlete.set(found);
    this.completedTransaction.set(null);
    this.errorMessage.set(null);
    this.binanceOrder.set(null);
    this.binanceNotice.set(null);

    if (this.appliedCoupon()) {
      this.applyCoupon();
    } else if (this.selectedMethod() === 'VEXPAY') {
      this.loadVexPayQuote();
    }
  }

  setMethod(method: 'PAGO_MOVIL' | 'BINANCE_PAY' | 'ZELLE' | 'VEXPAY'): void {
    if (method === 'PAGO_MOVIL' && this.config()?.pagoMovilEnabled === false) return;
    if (method === 'BINANCE_PAY' && this.config()?.binanceManualEnabled === false) return;
    if (method === 'ZELLE' && this.config()?.zelleEnabled === false) return;
    if (method === 'VEXPAY' && this.config()?.vexpayEnabled === false) return;

    this.selectedMethod.set(method);
    this.errorMessage.set(null);
    this.binanceNotice.set(null);
    if (method === 'VEXPAY') {
      this.loadVexPayQuote();
    }
  }

  selectPlan(plan: SubscriptionPlanDto): void {
    this.selectedPlan.set(plan);
    if (this.binanceOrder()) {
      this.binanceOrder.set(null);
    }
    if (this.appliedCoupon()) {
      this.applyCoupon();
    } else if (this.selectedMethod() === 'VEXPAY') {
      this.loadVexPayQuote();
    }
  }

  get effectiveAmountUsd(): number {
    const coupon = this.appliedCoupon();
    if (coupon && coupon.valid && coupon.finalAmountUsd !== undefined) {
      return coupon.finalAmountUsd;
    }
    return this.selectedPlan()?.priceUsd || 0;
  }

  get discountAmountUsd(): number {
    const coupon = this.appliedCoupon();
    if (coupon && coupon.valid && coupon.discountAmountUsd !== undefined) {
      return coupon.discountAmountUsd;
    }
    return 0;
  }

  get isFreePromo(): boolean {
    return this.appliedCoupon()?.isFreePromo === true;
  }

  get calculatedAmountVes(): number {
    const coupon = this.appliedCoupon();
    if (coupon && coupon.valid && coupon.finalAmountVes !== undefined) {
      return coupon.finalAmountVes;
    }
    const rate = this.bcvRate();
    if (!rate || !rate.officialRate) return 0;
    return Number((this.effectiveAmountUsd * rate.officialRate).toFixed(2));
  }

  applyCoupon(): void {
    const athlete = this.selectedAthlete();
    const code = this.couponInput.trim();
    if (!code || !athlete) return;

    const plan = this.selectedPlan();
    if (!plan) {
      this.couponError.set('Selecciona un plan primero.');
      return;
    }

    this.isValidatingCoupon.set(true);
    this.couponError.set(null);
    this.couponSuccess.set(null);

    this.paymentService.validateCoupon({
      code,
      athleteId: athlete.id,
      planId: plan.id
    }).subscribe({
      next: (res) => {
        this.isValidatingCoupon.set(false);
        if (res.valid) {
          this.appliedCoupon.set(res);
          this.couponSuccess.set(res.message);
          if (this.binanceOrder()) {
            this.binanceOrder.set(null);
          }
          if (this.selectedMethod() === 'VEXPAY' && !res.isFreePromo) {
            this.loadVexPayQuote();
          }
        } else {
          this.appliedCoupon.set(null);
          this.couponError.set(res.message);
          if (this.selectedMethod() === 'VEXPAY') {
            this.loadVexPayQuote();
          }
        }
      },
      error: (err) => {
        this.isValidatingCoupon.set(false);
        this.appliedCoupon.set(null);
        this.couponError.set(err.error?.message || 'Error al validar el código.');
      }
    });
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
    this.couponInput = '';
    this.couponError.set(null);
    this.couponSuccess.set(null);
    if (this.binanceOrder()) {
      this.binanceOrder.set(null);
    }
    if (this.selectedMethod() === 'VEXPAY') {
      this.loadVexPayQuote();
    }
  }

  redeemFreeSubscription(): void {
    const athlete = this.selectedAthlete();
    const coupon = this.appliedCoupon();
    const plan = this.selectedPlan();
    if (!athlete || !coupon || !coupon.isFreePromo || !plan) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.paymentService.redeemFreePromo({
      code: coupon.code!,
      athleteId: athlete.id,
      planId: plan.id
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.completedTransaction.set(res);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Error al activar la membresía bonificada.');
      }
    });
  }

  copyToClipboard(text: string, label: string): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copyFeedback.set(`${label} copiado`);
      setTimeout(() => this.copyFeedback.set(null), 2500);
    }).catch(() => {
      this.copyFeedback.set('Error al copiar');
      setTimeout(() => this.copyFeedback.set(null), 2500);
    });
  }

  // --- Flujo Binance Pay ---
  generateBinanceOrder(): void {
    const athlete = this.selectedAthlete();
    const plan = this.selectedPlan();
    if (!athlete || !plan) {
      this.errorMessage.set('Por favor selecciona un atleta y un plan antes de generar la orden.');
      return;
    }

    this.isGeneratingBinance.set(true);
    this.errorMessage.set(null);
    this.binanceNotice.set(null);

    this.paymentService.createBinanceOrder({
      athleteId: athlete.id,
      planId: plan.id,
      discountCode: this.appliedCoupon()?.code
    }).subscribe({
      next: (res) => {
        this.isGeneratingBinance.set(false);
        this.binanceOrder.set(res);
      },
      error: (err) => {
        this.isGeneratingBinance.set(false);
        this.errorMessage.set(err.error?.message || 'Error al conectar con Binance Pay. Por favor intenta de nuevo.');
      }
    });
  }

  checkBinanceStatus(): void {
    const athlete = this.selectedAthlete();
    if (!athlete) return;

    this.binanceNotice.set('Verificando activación en la red Binance...');
    this.paymentService.getAthleteSubscriptionStatus(athlete.id).subscribe({
      next: (status) => {
        if (status.status === 'ACTIVE') {
          this.completedTransaction.set({
            id: this.binanceOrder()?.transactionId || '',
            athleteId: athlete.id,
            athleteName: athlete.fullName,
            planId: this.selectedPlan()?.id || 'PRO_MONTHLY',
            planName: this.selectedPlan()?.name || 'Plan Pro',
            method: 'BINANCE_PAY',
            amountUsd: this.effectiveAmountUsd,
            amountVes: 0,
            bcvExchangeRate: 0,
            referenceNumber: this.binanceOrder()?.gatewayOrderId || '',
            paymentDate: new Date().toISOString().substring(0, 10),
            status: 'APPROVED',
            createdAt: new Date().toISOString()
          });
        } else {
          this.binanceNotice.set('Aún estamos esperando la confirmación de Binance Pay. En cuanto envíes la transferencia se activará en pocos segundos.');
        }
      },
      error: () => {
        this.binanceNotice.set('Consulta enviada. Por favor espera unos momentos y refresca.');
      }
    });
  }

  // --- Flujo Pago Móvil ---
  submitReport(): void {
    const athlete = this.selectedAthlete();
    if (!athlete) return;

    if (!this.referenceNumber || this.referenceNumber.trim().length < 4) {
      this.errorMessage.set('Por favor ingresa un número de referencia bancaria válido (mínimo 4 dígitos).');
      return;
    }
    if (!this.paymentDate) {
      this.errorMessage.set('Por favor indica la fecha en que realizaste el pago.');
      return;
    }

    const plan = this.selectedPlan();
    if (!plan) {
      this.errorMessage.set('Por favor selecciona un plan.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.paymentService.reportPagoMovil({
      athleteId: athlete.id,
      planId: plan.id,
      referenceNumber: this.referenceNumber.trim(),
      paymentDate: this.paymentDate,
      amountVes: this.calculatedAmountVes,
      bcvRate: this.bcvRate()?.officialRate,
      originBank: this.originBank,
      originPhone: this.originPhone ? this.originPhone.trim() : undefined,
      discountCode: this.appliedCoupon()?.code
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.completedTransaction.set(res);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Error al reportar el pago. Por favor intenta nuevamente.');
      }
    });
  }

  // --- Reporte Manual Binance ---
  submitBinanceReport(): void {
    const athlete = this.selectedAthlete();
    if (!athlete) return;

    if (!this.binanceReference || this.binanceReference.trim().length < 4) {
      this.errorMessage.set('Por favor ingresa un número de referencia o TxID válido de Binance (mínimo 4 caracteres).');
      return;
    }
    if (!this.binancePaymentDate) {
      this.errorMessage.set('Por favor indica la fecha en que realizaste la transferencia.');
      return;
    }

    const plan = this.selectedPlan();
    if (!plan) {
      this.errorMessage.set('Por favor selecciona un plan.');
      return;
    }

    this.isSubmittingBinance.set(true);
    this.errorMessage.set(null);

    this.paymentService.reportBinanceManual({
      athleteId: athlete.id,
      planId: plan.id,
      referenceNumber: this.binanceReference.trim(),
      paymentDate: this.binancePaymentDate,
      originAccount: this.binanceOriginAccount ? this.binanceOriginAccount.trim() : undefined,
      discountCode: this.appliedCoupon()?.code
    }).subscribe({
      next: (res) => {
        this.isSubmittingBinance.set(false);
        this.completedTransaction.set(res);
      },
      error: (err) => {
        this.isSubmittingBinance.set(false);
        this.errorMessage.set(err.error?.message || 'Error al reportar el pago de Binance. Por favor intenta nuevamente.');
      }
    });
  }

  // --- Reporte Manual Zelle ---
  submitZelleReport(): void {
    const athlete = this.selectedAthlete();
    if (!athlete) return;

    if (!this.zelleReference || this.zelleReference.trim().length < 4) {
      this.errorMessage.set('Por favor ingresa un número de confirmación de Zelle válido (mínimo 4 caracteres).');
      return;
    }
    if (!this.zelleOriginAccountHolder || !this.zelleOriginAccountHolder.trim()) {
      this.errorMessage.set('Por favor ingresa el nombre del titular de la cuenta desde la que enviaste el Zelle.');
      return;
    }
    if (!this.zellePaymentDate) {
      this.errorMessage.set('Por favor indica la fecha en que realizaste la transferencia de Zelle.');
      return;
    }

    const plan = this.selectedPlan();
    if (!plan) {
      this.errorMessage.set('Por favor selecciona un plan.');
      return;
    }

    this.isSubmittingZelle.set(true);
    this.errorMessage.set(null);

    this.paymentService.reportZellePayment({
      athleteId: athlete.id,
      planId: plan.id,
      referenceNumber: this.zelleReference.trim(),
      originAccountHolder: this.zelleOriginAccountHolder.trim(),
      originEmailOrPhone: this.zelleOriginEmailOrPhone ? this.zelleOriginEmailOrPhone.trim() : undefined,
      paymentDate: this.zellePaymentDate,
      discountCode: this.appliedCoupon()?.code
    }).subscribe({
      next: (res) => {
        this.isSubmittingZelle.set(false);
        this.completedTransaction.set(res);
      },
      error: (err) => {
        this.isSubmittingZelle.set(false);
        this.errorMessage.set(err.error?.message || 'Error al reportar el pago de Zelle. Por favor intenta nuevamente.');
      }
    });
  }

  // --- Flujo Pasarela Automatizada VexPay ---
  loadVexPayQuote(): void {
    const athlete = this.selectedAthlete();
    const plan = this.selectedPlan();
    if (!athlete || !plan) return;

    this.isLoadingVexPayQuote.set(true);
    this.vexPayQuoteError.set(null);

    this.paymentService.getVexPayQuote({
      planId: plan.id,
      discountCode: this.appliedCoupon()?.code,
      athleteId: athlete.id
    }).subscribe({
      next: (quote) => {
        this.vexPayQuote.set(quote);
        this.isLoadingVexPayQuote.set(false);
      },
      error: (err) => {
        this.isLoadingVexPayQuote.set(false);
        this.vexPayQuote.set(null);
        this.vexPayQuoteError.set(err.error?.detail || err.error?.message || 'No se pudo obtener la cotización en tiempo real de VexPay.');
      }
    });
  }

  startVexPayCheckout(): void {
    const athlete = this.selectedAthlete();
    const plan = this.selectedPlan();
    if (!athlete || !plan) {
      this.errorMessage.set('Por favor selecciona un atleta y un plan antes de continuar.');
      return;
    }

    this.isCreatingVexPaySession.set(true);
    this.errorMessage.set(null);

    this.paymentService.createVexPaySession({
      athleteId: athlete.id,
      planId: plan.id,
      discountCode: this.appliedCoupon()?.code
    }).subscribe({
      next: (res) => {
        this.isCreatingVexPaySession.set(false);
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('vexpay_pending_session', JSON.stringify({
              sessionId: res.sessionId,
              transactionId: res.transactionId,
              athleteId: athlete.id
            }));
          }
        } catch {
          // Ignorar si sessionStorage no está disponible
        }
        this.redirectToCheckout(res.checkoutUrl);
      },
      error: (err) => {
        this.isCreatingVexPaySession.set(false);
        this.errorMessage.set(err.error?.detail || err.error?.message || 'No se pudo iniciar la sesión de pago con VexPay.');
      }
    });
  }

  redirectToCheckout(url: string): void {
    if (typeof window !== 'undefined' && url) {
      window.location.assign(url);
    }
  }

  startAnotherPayment(): void {
    this.completedTransaction.set(null);
    this.errorMessage.set(null);
    this.referenceNumber = '';
    this.binanceReference = '';
    this.zelleReference = '';
    this.removeCoupon();
  }
}

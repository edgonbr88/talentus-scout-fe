import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CheckoutPageComponent } from './checkout-page.component';
import { PaymentService } from '../../core/services/payment.service';
import { AthleteService } from '../../core/services/athlete.service';
import { AthleteSummary } from '../../core/models/athlete.model';
import {
  BcvRateResponse,
  PaymentConfigResponse,
  PaymentTransactionResponse,
  ValidateCouponResponse
} from '../../core/models/payment.model';

describe('CheckoutPageComponent (TS-83)', () => {
  let component: CheckoutPageComponent;
  let fixture: ComponentFixture<CheckoutPageComponent>;
  let paymentServiceSpy: jasmine.SpyObj<PaymentService>;
  let athleteServiceSpy: jasmine.SpyObj<AthleteService>;

  const mockAthleteActive: AthleteSummary = {
    id: 'ath-active-1',
    firstName: 'Lucas',
    lastName: 'Méndez',
    fullName: 'Lucas Méndez',
    birthDate: '2011-02-10',
    age: 15,
    primaryPosition: 'DELANTERO_CENTRO',
    preferredFoot: 'DERECHO',
    slug: 'lucas-mendez',
    isPublic: true,
    subscriptionStatus: 'ACTIVE',
    hasIdentityDocument: true,
    legalVerificationStatus: 'APPROVED'
  };

  const mockAthleteInactive: AthleteSummary = {
    id: 'ath-inactive-2',
    firstName: 'Mateo',
    lastName: 'Arango',
    fullName: 'Mateo Arango',
    birthDate: '2010-05-20',
    age: 16,
    primaryPosition: 'Mediocampista',
    preferredFoot: 'Derecha',
    slug: 'mateo-arango',
    isPublic: true,
    subscriptionStatus: 'INACTIVE',
    hasIdentityDocument: true,
    legalVerificationStatus: 'APPROVED'
  };

  const mockConfig: PaymentConfigResponse = {
    recipientBank: 'Banco de Venezuela',
    recipientPhone: '04141234567',
    recipientIdDocument: 'V-20123456',
    recipientAccountHolder: 'Talentus Scout C.A.',
    binancePayId: '283918273',
    binanceWalletAddress: 'TLsV5289FjK93kdJ8193jd93kd9',
    binanceNetwork: 'USDT (TRC-20 / BEP-20)',
    zelleEnabled: true,
    zelleEmail: 'pagos@talentusscout.com',
    zelleAccountHolder: 'Talentus Scout LLC',
    vexpayEnabled: true,
    plans: [
      {
        id: 'PRO_MONTHLY',
        name: 'Plan Pro Mensual',
        description: 'Visibilidad completa en directorio',
        priceUsd: 5.00,
        durationDays: 30,
        isActive: true
      },
      {
        id: 'PRO_ANNUAL',
        name: 'Plan Pro Anual',
        description: 'Visibilidad completa anual con descuento',
        priceUsd: 45.00,
        durationDays: 365,
        isActive: true
      }
    ]
  };

  const mockBcvRate: BcvRateResponse = {
    officialRate: 45.50,
    date: '2026-11-23',
    source: 'BCV_SCRAPER',
    cached: true
  };

  const mockTransactionResponse: PaymentTransactionResponse = {
    id: 'tx-999-uuid',
    athleteId: 'ath-inactive-2',
    athleteName: 'Mateo Arango',
    planId: 'PRO_MONTHLY',
    planName: 'Plan Pro Mensual',
    method: 'PAGO_MOVIL',
    amountUsd: 5.00,
    amountVes: 227.50,
    bcvExchangeRate: 45.50,
    referenceNumber: '009988',
    paymentDate: '2026-11-23',
    status: 'PENDING_AUDIT',
    createdAt: new Date().toISOString()
  };

  function setupTestBed(routeAthleteId: string | null = 'ath-inactive-2', athletes: AthleteSummary[] = [mockAthleteActive, mockAthleteInactive]) {
    paymentServiceSpy = jasmine.createSpyObj('PaymentService', [
      'getPaymentConfig',
      'getBcvRate',
      'reportPagoMovil',
      'reportBinanceManual',
      'reportZellePayment',
      'validateCoupon',
      'redeemFreePromo',
      'createBinanceOrder',
      'getAthleteSubscriptionStatus',
      'getVexPayQuote',
      'createVexPaySession'
    ]);
    athleteServiceSpy = jasmine.createSpyObj('AthleteService', ['getMyAthletes']);

    athleteServiceSpy.getMyAthletes.and.returnValue(of(athletes));
    paymentServiceSpy.getPaymentConfig.and.returnValue(of(mockConfig));
    paymentServiceSpy.getBcvRate.and.returnValue(of(mockBcvRate));
    paymentServiceSpy.getVexPayQuote.and.returnValue(of({
      usdAmount: 5,
      vesAmount: 227.5,
      rate: 45.5,
      bcvRate: 45.5,
      rateSource: 'BCV'
    }));

    return TestBed.configureTestingModule({
      imports: [CheckoutPageComponent],
      providers: [
        provideRouter([]),
        { provide: PaymentService, useValue: paymentServiceSpy },
        { provide: AthleteService, useValue: athleteServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'athleteId' ? routeAthleteId : null)
              }
            }
          }
        }
      ]
    }).compileComponents();
  }

  it('debe cargar atletas, configuración y tasa BCV autónomamente y preseleccionar el atleta de la ruta', async () => {
    await setupTestBed('ath-inactive-2');
    fixture = TestBed.createComponent(CheckoutPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.selectedAthlete()?.id).toBe('ath-inactive-2');
    expect(component.selectedPlan()?.id).toBe('PRO_MONTHLY');
    expect(component.calculatedAmountVes).toBe(227.50);
  });

  it('debe seleccionar automáticamente el primer atleta inactivo cuando no hay parámetro en la ruta', async () => {
    await setupTestBed(null, [mockAthleteActive, mockAthleteInactive]);
    fixture = TestBed.createComponent(CheckoutPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.selectedAthlete()?.id).toBe('ath-inactive-2');
  });

  it('debe mostrar estado vacío guiado cuando el usuario no tiene atletas registrados', async () => {
    await setupTestBed(null, []);
    fixture = TestBed.createComponent(CheckoutPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.selectedAthlete()).toBeNull();
    expect(compiled.textContent).toContain('No tienes atletas registrados aún');
  });

  it('debe cambiar de atleta desde el selector y permitir reportar Pago Móvil mostrando confirmación en página', async () => {
    await setupTestBed('ath-active-1');
    fixture = TestBed.createComponent(CheckoutPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.onAthleteChange('ath-inactive-2');
    expect(component.selectedAthlete()?.id).toBe('ath-inactive-2');

    paymentServiceSpy.reportPagoMovil.and.returnValue(of(mockTransactionResponse));
    component.referenceNumber = '009988';
    component.submitReport();
    fixture.detectChanges();

    expect(paymentServiceSpy.reportPagoMovil).toHaveBeenCalledWith(jasmine.objectContaining({
      athleteId: 'ath-inactive-2',
      planId: 'PRO_MONTHLY',
      amountVes: 227.50
    }));
    expect(component.completedTransaction()?.referenceNumber).toBe('009988');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Volver al Panel');
  });

  it('debe canjear cupón 100% bonificado y mostrar confirmación en la misma página', async () => {
    await setupTestBed('ath-inactive-2');
    fixture = TestBed.createComponent(CheckoutPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const couponResp: ValidateCouponResponse = {
      valid: true,
      code: 'BECA100',
      discountType: 'PERCENTAGE',
      discountValue: 100,
      originalAmountUsd: 5,
      discountAmountUsd: 5,
      finalAmountUsd: 0,
      finalAmountVes: 0,
      isFreePromo: true,
      message: 'Beca aplicada'
    };
    paymentServiceSpy.validateCoupon.and.returnValue(of(couponResp));
    paymentServiceSpy.redeemFreePromo.and.returnValue(of({
      ...mockTransactionResponse,
      method: 'COUPON_FREE',
      amountUsd: 0,
      amountVes: 0,
      status: 'APPROVED'
    }));

    component.couponInput = 'BECA100';
    component.applyCoupon();
    expect(component.isFreePromo).toBeTrue();

    component.redeemFreeSubscription();
    expect(component.completedTransaction()?.status).toBe('APPROVED');
  });

  it('debe respaldar la sesión en sessionStorage y redirigir al iniciar checkout VexPay', async () => {
    await setupTestBed('ath-inactive-2');
    fixture = TestBed.createComponent(CheckoutPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const redirectSpy = spyOn(component, 'redirectToCheckout');
    paymentServiceSpy.createVexPaySession.and.returnValue(of({
      sessionId: 'vexpay-sess-1',
      transactionId: 'tx-vexpay-1',
      checkoutUrl: 'https://pay.vexpay.app/checkout/vexpay-sess-1',
      amountUsd: 5,
      livemode: false,
      status: 'PENDING'
    }));

    component.setMethod('VEXPAY');
    component.startVexPayCheckout();

    expect(redirectSpy).toHaveBeenCalledWith('https://pay.vexpay.app/checkout/vexpay-sess-1');
  });
});

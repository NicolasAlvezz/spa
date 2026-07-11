// src/lib/constants/membership-contract-templates.ts
// Text reproduced verbatim from PPTX slides — do NOT alter, correct typos, or rephrase.

export interface BasicContractTemplate {
  // Slide 1
  slide1_title: string
  // Slide 2
  slide2_heading: string
  slide2_wellness_title: string
  slide2_invest_subtitle: string
  slide2_description: string
  slide2_cost_label: string
  slide2_cost_value: string
  slide2_intro_heading: string
  slide2_intro_body: string
  // Slide 3
  slide3_contract_title: string
  slide3_company: string
  slide3_preamble: string
  slide3_client_info_title: string
  slide3_label_full_name: string
  slide3_label_dob: string
  slide3_label_phone: string
  slide3_label_email: string
  slide3_label_address: string
  slide3_label_city_state: string
  // Slide 4
  slide4_title: string
  slide4_intro: string
  slide4_benefits: string
  // Slide 5
  slide5_title: string
  slide5_terms: string
  // Slide 6
  slide6_title: string
  slide6_type_label: string
  slide6_type_value: string
  slide6_start_date_label: string
  slide6_monthly_label: string
  slide6_monthly_value: string
  slide6_payment_method_label: string
  slide6_credit: string
  slide6_debit: string
  slide6_card_last4_label: string
  slide6_auth_title: string
  slide6_auth_body: string
  slide6_cardholder_sig_label: string
  slide6_date_label: string
  slide6_acceptance_title: string
  slide6_acceptance_body: string
  slide6_client_sig_label: string
  slide6_rep_label: string
}

export const BASIC_CONTRACT_ES: BasicContractTemplate = {
  slide1_title: 'MEMBRESIAS\nBASICA',

  slide2_heading: 'MEMBRESÍA PREMIUM',
  slide2_wellness_title: 'VM Integral Massage',
  slide2_invest_subtitle: 'Membresía de Bienestar\nInvierte en ti mes a mes.',
  slide2_description:
    'La Membresía Basica ha sido diseñada para quienes desean convertir el masaje terapéutico en una parte esencial de su bienestar físico y mental. Este programa ofrece acceso a beneficios exclusivos, servicios complementarios sin costo adicional y ventajas especiales que brindan una experiencia superior\nen cada visita.',
  slide2_cost_label: 'Costo de la membresia basica',
  slide2_cost_value: '$89 por mes',
  slide2_intro_heading: 'Masaje Introductorio',
  slide2_intro_body:
    'Prueba nuestra experiencia de bienestar con un masaje introductorio de 60 minutos por solo $80. Si decides unirte a la membresía el mismo día, podrás aplicar parte de ese valor hacia tu inscripción.',

  slide3_contract_title: 'CONTRATO DE MEMBRESÍA BÁSICA',
  slide3_company: 'VM INTEGRAL MASSAGE',
  slide3_preamble:
    'Este Contrato de Membresía ("Contrato") se celebra entre VM Integral Massage ("La Empresa") y el cliente cuyos datos aparecen al final de este documento ("El Miembro").',
  slide3_client_info_title: 'INFORMACIÓN DEL CLIENTE',
  slide3_label_full_name: 'Nombre Completo:',
  slide3_label_dob: 'Fecha de Nacimiento:',
  slide3_label_phone: 'Teléfono:',
  slide3_label_email: 'Correo Electrónico:',
  slide3_label_address: 'Dirección:',
  slide3_label_city_state: 'Ciudad/Estado:',

  slide4_title: 'BENEFICIOS DE LA MEMBRESÍA',
  slide4_intro:
    'El Miembro tendrá derecho a los siguientes beneficios mientras mantenga su membresía activa y al corriente en sus pagos:',
  slide4_benefits:
    'Masaje Mensual\n' +
    '• Un (1) masajes terapéuticos de 60 minutos por mes.\n' +
    '• Precio preferencial de $100 para masajes terapéuticos adicionales durante el mismo mes.\n\n' +
    '2. Acceso a Promociones Especiales\n' +
    '• 5% de descuento adicional sobre promociones, paquetes y eventos especiales realizados por VM Integral Massage, durante el año.\n\n' +
    '3. Servicios Complementarios Incluidos\n' +
    'Durante cada sesión, el miembro podrá disfrutar sin costo adicional de los servicios complementarios disponibles, incluyendo:\n' +
    '• Herramientas de Recuperación Muscular\n' +
    '• Otras terapias complementarias disponibles según recomendación del terapeuta\n\n' +
    '4. Prioridad en Reservaciones\n' +
    '• Acceso preferencial a los horarios disponibles.\n\n' +
    '5. Sesiones Acumulables\n' +
    '• Las sesiones no utilizadas podrán acumularse hasta por sesenta (60) días.\n' +
    '• Las sesiones acumuladas vencen automáticamente después de dicho período.\n\n' +
    '6. Beneficios para Familiares\n' +
    '• Los familiares directos del miembro recibirán un 5% de descuento en  los servicios ofrecidos por VM Integral Massage en su primer masaje.\n' +
    'Los servivios esteticos estan excluidos.\n\n' +
    '7. Programa de Referidos\n' +
    '• Reciba un crédito de $10 por cada nuevo cliente referido que complete un servicio.\n' +
    '• Los créditos no son acumulables,\u00a0\u00a0deben utilizarse dentro de los 30 días posteriores\u00a0 a su\n' +
    'emisión.\n' +
    '• No son transferibles ni canjeables por efectivo.\n' +
    'No son transferibles a otra persona.\n\n' +
    '8. Regalo de Cumpleaños\n' +
    '• Durante el mes de cumpleaños, el miembro recibirá una mejora gratuita en una de sus sesiones, incluyendo 15 minutos adicionales de masaje sin costo.',

  slide5_title: 'TÉRMINOS Y CONDICIONES',
  slide5_terms:
    'La membresía tiene una permanencia mínima obligatoria de seis (6) meses, si desea cancelar la misma antes de ese period tiene una multa de $200.\n\n' +
    'El pago mensual será debitado automáticamente mediante el método de pago autorizado por el miembro.\n\n' +
    'La membresía se renovará automáticamente cada mes hasta que sea cancelada conforme a las disposiciones de este contrato.\n\n' +
    'Después de cumplir el período mínimo de permanencia, el miembro podrá cancelar la membresía notificando sus deseos de forma presencial y debra firmar su cancelacion,  en caso que el miembro no notifique el deseo de cancelar su membresia la  misma se renovara automatiucamente. Se enviara un mensaje de recordatorio del vencimiento de la misma 30 dias antes .\n\n' +
    'La membresía es personal e intransferible\n\n' +
    'Los beneficios son exclusivos para miembros activos y con pagos al día.\n\n' +
    'Los masajes estéticos, tratamientos cosméticos y otros servicios no especificados expresamente en este contrato no están incluidos.\n\n' +
    'Las sesiones acumuladas vencerán automáticamente después de sesenta (60) días.\n\n' +
    'Las citas canceladas con menos de doce (12) horas de anticipación o las inasistencias podrán considerarse como una sesión utilizada.\n\n' +
    'VM Integral Massage se reserva el derecho de suspender o cancelar la membresía en caso de fraude, incumplimiento de pago o conducta inapropiada hacia el personal o las instalaciones.\n\n' +
    'VM Integral Massage podrá modificar promociones especiales y servicios complementarios sin afectar los beneficios esenciales de la membresía.',

  slide6_title: 'DETALLES DE LA MEMBRESÍA',
  slide6_type_label: 'Tipo de Membresía:',
  slide6_type_value: 'BÁSICA',
  slide6_start_date_label: 'Fecha de Inicio:',
  slide6_monthly_label: 'Pago Mensual:',
  slide6_monthly_value: '$89.00',
  slide6_payment_method_label: 'Método de Pago:',
  slide6_credit: 'Tarjeta de Crédito',
  slide6_debit: 'Tarjeta de Débito',
  slide6_card_last4_label: 'Últimos 4 dígitos de la tarjeta:',
  slide6_auth_title: 'AUTORIZACIÓN DE PAGO',
  slide6_auth_body:
    'Autorizo a VM Integral Massage a realizar el cargo mensual correspondiente a mi membresía utilizando el método de pago registrado.',
  slide6_cardholder_sig_label: 'Firma del Titular:',
  slide6_date_label: 'Fecha:',
  slide6_acceptance_title: 'ACEPTACIÓN DEL CONTRATO',
  slide6_acceptance_body:
    'Declaro haber leído, comprendido y aceptado todos los términos y condiciones establecidos en este Contrato de Membresía.',
  slide6_client_sig_label: 'Firma del Cliente:',
  slide6_rep_label: 'Representante de VM Integral Massage:',
}

export const BASIC_CONTRACT_EN: BasicContractTemplate = {
  slide1_title: 'BASIC MEMBERSHIP',

  slide2_heading: 'MEMBRESÍA BASICA',
  slide2_wellness_title: 'VM Integral Massage',
  slide2_invest_subtitle: 'Wellness Membership\nInvest in Yourself Month After Month',
  slide2_description:
    'The Basic Membership has been designed for those who want to make therapeutic massage an essential part of their physical and mental well-being. This program provides access to exclusive benefits, complimentary add-on services, and special advantages that enhance every visit.',
  slide2_cost_label: 'Basic Membership Cost',
  slide2_cost_value: '$89 per month',
  slide2_intro_heading: 'Introductory Massage',
  slide2_intro_body:
    'Experience our wellness services with a 60-minute introductory massage for only $80. If you decide to join the membership on the same day, a portion of that amount may be applied toward your membership enrollment.',

  slide3_contract_title: 'BASIC MEMBERSHIP AGREEMENT',
  slide3_company: 'VM INTEGRAL MASSAGE',
  slide3_preamble:
    'This Membership Agreement ("Agreement") is entered into between VM Integral Massage ("The Company") and the client whose information appears at the end of this document ("The Member").',
  slide3_client_info_title: 'CLIENT INFORMATION',
  slide3_label_full_name: 'Full Name:',
  slide3_label_dob: 'Date of Birth:',
  slide3_label_phone: 'Phone Number:',
  slide3_label_email: 'Email Address:',
  slide3_label_address: 'Address:',
  slide3_label_city_state: 'City/State:',

  slide4_title: 'MEMBERSHIP BENEFITS',
  slide4_intro:
    'The Member shall be entitled to the following benefits while maintaining an active membership account and remaining current on all membership payments:',
  slide4_benefits:
    '1. Monthly Massage\n' +
    '• One (1) 60-minute therapeutic massage per month.\n' +
    '• Preferred rate of $100 for additional therapeutic massages during the same month.\n\n' +
    '2. Access to Special Promotions\n' +
    '• An additional 5% discount on promotions, packages, and special events offered by VM Integral Massage throughout the year.\n\n' +
    '3. Complimentary Add-On Services\n' +
    'During each session, members may enjoy the following complimentary services at no additional cost:\n' +
    '• Muscle Recovery Tools\n' +
    '• Other complementary therapies available based on the therapist\'s recommendation\n\n' +
    '4. Priority Scheduling\n' +
    '• Preferred access to available appointment times.\n\n' +
    '5. Accumulated Sessions\n' +
    '• Unused sessions may be accumulated for up to sixty (60) days.\n' +
    '• Accumulated sessions automatically expire after that period.\n\n' +
    '6. Family Benefits\n' +
    '• Immediate family members will receive a 5% discount on their first massage service at VM Integral Massage.\n' +
    '• Aesthetic and cosmetic services are excluded.\n\n' +
    '7. Referral Program\n' +
    '• Receive a $10 credit for each new client referred who completes a service.\n' +
    '• Credits are not cumulative and must be used within thirty (30) days of issuance.\n' +
    '• Credits are non-transferable and cannot be redeemed for cash.\n' +
    '• Credits may not be transferred to another person.\n\n' +
    '8. Birthday Gift\n' +
    '• During their birthday month, members will receive a complimentary upgrade on one of their sessions, including an additional 15 minutes of massage at no extra charge.',

  slide5_title: 'MEMBERSHIP TERMS & CONDITIONS',
  slide5_terms:
    '• The membership requires a mandatory minimum commitment of six (6) months. If the membership is canceled before the end of this period, a $200 early cancellation fee will apply.\n' +
    '• Monthly payments will be automatically charged using the payment method authorized by the member.\n' +
    '• The membership will automatically renew each month until canceled in accordance with the terms of this Agreement.\n' +
    '• After completing the minimum commitment period, the member may cancel the membership by providing notice in person and signing a cancellation form. If the member does not notify VM Integral Massage of their intention to cancel, the membership will automatically renew. A reminder notice will be sent 30 days prior to the renewal date.\n' +
    '• Membership is personal and non-transferable.\n' +
    '• Benefits are available exclusively to active members whose accounts are in good standing.\n' +
    '• Aesthetic massages, cosmetic treatments, and any services not expressly specified in this Agreement are not included.\n' +
    '• Accumulated sessions will automatically expire after sixty (60) days.\n' +
    '• Appointments canceled with less than twelve (12) hours\' notice, as well as missed appointments (no-shows), may be considered a used session.\n' +
    '• VM Integral Massage reserves the right to suspend or terminate a membership in cases of fraud, non-payment, or inappropriate conduct toward staff, clients, or facilities.\n' +
    '• VM Integral Massage may modify special promotions and complimentary services without affecting the essential benefits of the membership.',

  slide6_title: 'MEMBERSHIP DETAILS',
  slide6_type_label: 'Membership Type:',
  slide6_type_value: 'BASIC',
  slide6_start_date_label: 'Start Date:',
  slide6_monthly_label: 'Monthly Payment:',
  slide6_monthly_value: '$89.00',
  slide6_payment_method_label: 'Payment Method',
  slide6_credit: 'Credit Card',
  slide6_debit: 'Debit Card',
  slide6_card_last4_label: 'Last 4 Digits of Card:',
  slide6_auth_title: 'PAYMENT AUTHORIZATION',
  slide6_auth_body:
    'I authorize VM Integral Massage to charge the monthly membership fee associated with my membership using the payment method on file.',
  slide6_cardholder_sig_label: 'Cardholder Signature:',
  slide6_date_label: 'Date:',
  slide6_acceptance_title: 'AGREEMENT ACCEPTANCE',
  slide6_acceptance_body:
    'I acknowledge that I have read, understood, and accepted all the terms and conditions set forth in this Membership Agreement.',
  slide6_client_sig_label: 'Client Signature:',
  slide6_rep_label: 'VM Integral Massage Representative:',
}

export function getBasicContractTemplate(language: 'en' | 'es'): BasicContractTemplate {
  return language === 'es' ? BASIC_CONTRACT_ES : BASIC_CONTRACT_EN
}

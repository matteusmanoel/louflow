import type { Enviador } from '@/lib/notify';

/**
 * S1-08 (#11563): adaptador Resend. Deve consultar notification_preferences do destinatário
 * e, sem RESEND_API_KEY, apenas não enviar. Falhas lançadas aqui são registradas por lib/notify.
 */
export const enviarNotificacao: Enviador = async () => {};

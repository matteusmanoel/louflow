import type postgres from 'postgres';

/**
 * Seed sintético para desenvolvimento, testes e preview. Nenhum dado de pessoa real.
 * Os Usuários são criados SEM PIN (pin_hash NULL, troca obrigatória): defina um PIN de
 * desenvolvimento com `pnpm db:seed --pin` (gera PIN provisório e imprime só no terminal local).
 */

export const USUARIOS_SINTETICOS = [
  { email: 'admin@exemplo.test', name: 'Admin Exemplo', profile: 'Administrador', editor_label: null },
  { email: 'editor@exemplo.test', name: 'Editor Exemplo', profile: 'Editor', editor_label: 'Editor Exemplo' },
  { email: 'editor.cortes@exemplo.test', name: 'Editora Cortes Exemplo', profile: 'Editor', editor_label: 'Editora Cortes' },
  { email: 'influencer@exemplo.test', name: 'Influencer Exemplo', profile: 'Influencer', editor_label: null },
  { email: 'influencer.dois@exemplo.test', name: 'Influencer Dois Exemplo', profile: 'Influencer', editor_label: null },
  { email: 'premios@exemplo.test', name: 'Prêmios Exemplo', profile: 'Premios', editor_label: null },
] as const;

/** Formatos da lista do legado (aba Listas) mais os já usados no app. Nenhum conteúdo de demanda real. */
export const FORMATOS = [
  'Reels',
  'Stories',
  'Vídeo longo',
  'Ficha técnica',
  'Cortes',
  'Carrossel',
  'Youtube',
  'YT Shorts',
  'Tiktok',
  'Criativos',
  'Captação',
  'OUTROS',
] as const;

export async function aplicarSeed(sql: postgres.Sql): Promise<void> {
  await sql.begin(async (tx) => {
    for (const u of USUARIOS_SINTETICOS) {
      await tx`
        INSERT INTO users (email, name, profile, editor_label)
        VALUES (${u.email}, ${u.name}, ${u.profile}, ${u.editor_label})
        ON CONFLICT (email) DO NOTHING`;
    }
    for (const [i, valor] of FORMATOS.entries()) {
      await tx`
        INSERT INTO system_lists (kind, value, position) VALUES ('formato', ${valor}, ${i})
        ON CONFLICT (kind, value) DO NOTHING`;
    }
    await tx`
      INSERT INTO user_permissions (user_id, permission_key, granted)
      SELECT id, p.chave, true FROM users,
        (VALUES ('editorPadraoCortes'), ('acessarCortes'), ('verAbaCortes')) AS p(chave)
      WHERE email = 'editor.cortes@exemplo.test'
      ON CONFLICT DO NOTHING`;

    await aplicarConteudoDemonstracao(tx);
  });
}

/**
 * Conteúdo sintético para exercitar as telas.
 * IDs estáveis (prefixo LFseed / Cseed / Dseed) tornam o seed idempotente.
 * Datas são relativas a CURRENT_DATE para a Agenda do mês corrente sempre ter itens.
 * Inspirado na estrutura das abas do legado, sem copiar títulos, nomes ou links reais.
 */
async function aplicarConteudoDemonstracao(tx: postgres.TransactionSql): Promise<void> {
  await tx`
    INSERT INTO demands (
      id, title, format, influencer_id, editor_id, status,
      approval_date, post_date, info, link, priority,
      editorial_line, source_program, clips_count, created_by,
      completed_at, deleted_at
    )
    SELECT
      v.id,
      v.title,
      v.format,
      inf.id,
      ed.id,
      v.status::demand_status,
      CASE WHEN v.approval_off IS NULL THEN NULL ELSE (CURRENT_DATE + v.approval_off)::date END,
      CASE
        WHEN v.post_kind = 'dia6' THEN (date_trunc('month', CURRENT_DATE)::date + 5)
        WHEN v.post_kind = 'hoje' THEN CURRENT_DATE
        WHEN v.post_kind = 'offset' THEN (CURRENT_DATE + v.post_off)::date
        ELSE NULL
      END,
      v.info,
      v.link,
      v.priority::demand_priority,
      v.linha,
      v.programa,
      v.cortes,
      admin.id,
      CASE WHEN v.status = 'Concluída' THEN now() ELSE NULL END,
      CASE WHEN v.na_lixeira THEN now() ELSE NULL END
    FROM (VALUES
      ('LFseed000001', 'Ficha do roteiro do catamarã ao entardecer', 'Ficha técnica', 'influencer@exemplo.test', NULL::text, 'Não iniciada', NULL::int, 'offset', 4, 'Briefing aguardando editor na fila.', NULL::text, 'Normal', NULL::text, NULL::text, NULL::int, false),
      ('LFseed000002', 'Reels da passarela das cataratas', 'Reels', 'influencer@exemplo.test', 'editor@exemplo.test', 'Em execução', -1, 'offset', -2, 'Captação externa já recebida. Edição em andamento.', 'https://exemplo.test/arquivos/seed-reels-passarela', 'Alta', 'Viral', 'Outros', NULL::int, false),
      ('LFseed000003', 'Reels de abertura da temporada', 'Reels', 'influencer@exemplo.test', 'editor@exemplo.test', 'Aprovação', 1, 'dia6', NULL::int, 'Versão 1 entregue para aprovação.', 'https://exemplo.test/arquivos/seed-reels-temporada', 'Urgente', 'Comunidade', 'Destino Iguaçu News', NULL::int, false),
      ('LFseed000004', 'Carrossel dos mirantes do parque', 'Carrossel', 'influencer.dois@exemplo.test', 'editor@exemplo.test', 'Pausada', 3, 'hoje', NULL::int, 'Pausada à espera de fotos do segundo dia.', 'https://exemplo.test/arquivos/seed-carrossel-mirantes', 'Normal', 'Educacional', 'Descubra Foz', NULL::int, false),
      ('LFseed000005', 'Criativo de chamada para o fim de semana', 'Criativos', 'influencer.dois@exemplo.test', 'editor@exemplo.test', 'Ajustes solicitados', 2, 'offset', 2, 'Ajuste pedido na legenda e no corte final.', 'https://exemplo.test/arquivos/seed-criativo-fds', 'Alta', 'Comunidade', 'Outros', NULL::int, false),
      ('LFseed000006', 'Cortes do quadro de gastronomia', 'Cortes', 'influencer@exemplo.test', 'editor.cortes@exemplo.test', 'Concluída', NULL::int, 'offset', -5, 'Pacote de cortes entregue.', 'https://exemplo.test/arquivos/seed-cortes-gastronomia', 'Normal', 'Educacional', 'Descubra Foz', 8, false),
      ('LFseed000007', 'Vídeo horizontal do sobrevoo', 'Youtube', 'influencer.dois@exemplo.test', 'editor@exemplo.test', 'Reprovada', NULL::int, 'offset', -8, 'Formato não atendeu o briefing.', NULL::text, 'Baixa', NULL::text, NULL::text, NULL::int, false),
      ('LFseed000008', 'Stories de bastidores no estúdio', 'Stories', 'influencer@exemplo.test', 'editor@exemplo.test', 'Cancelada', NULL::int, NULL::text, NULL::int, 'Gravação cancelada por chuva.', NULL::text, 'Normal', NULL::text, NULL::text, NULL::int, false),
      ('LFseed000009', 'TikTok do trajeto até o parque', 'Tiktok', 'influencer@exemplo.test', 'editor@exemplo.test', 'Não iniciada', 6, 'offset', 3, 'Na fila do editor, sem bloqueio.', NULL::text, 'Baixa', 'Viral', 'Outros', NULL::int, false),
      ('LFseed000010', 'Reels do pôr do sol no marco', 'Reels', 'influencer.dois@exemplo.test', 'editor@exemplo.test', 'Em execução', 0, 'dia6', NULL::int, 'Segunda peça do dia 6, ainda em corte.', 'https://exemplo.test/arquivos/seed-reels-marco', 'Normal', 'Comunidade', 'Destino Iguaçu News', NULL::int, false),
      ('LFseed000011', 'Reels antigo movido para a lixeira', 'Reels', 'influencer@exemplo.test', 'editor@exemplo.test', 'Não iniciada', NULL::int, 'offset', -12, 'Exemplo de item excluído.', NULL::text, 'Normal', NULL::text, NULL::text, NULL::int, true),
      ('LFseed000012', 'Ficha do roteiro da trilha das quedas', 'Ficha técnica', 'influencer.dois@exemplo.test', NULL::text, 'Não iniciada', 7, 'offset', 7, 'Segunda ficha sem editor, para a fila.', NULL::text, 'Urgente', NULL::text, NULL::text, NULL::int, false)
    ) AS v(
      id, title, format, inf_email, ed_email, status, approval_off, post_kind, post_off,
      info, link, priority, linha, programa, cortes, na_lixeira
    )
    JOIN users admin ON admin.email = 'admin@exemplo.test'
    LEFT JOIN users inf ON inf.email = v.inf_email
    LEFT JOIN users ed ON ed.email = v.ed_email
    ON CONFLICT (id) DO NOTHING`;

  await tx`
    INSERT INTO demand_trash (demand_id, deleted_by)
    SELECT 'LFseed000011', id FROM users WHERE email = 'admin@exemplo.test'
    ON CONFLICT (demand_id) DO NOTHING`;

  await tx`
    INSERT INTO technical_sheets (
      demand_id, submission_key, identification, editor_note, script, opening,
      platform, content_format, files_link, sent_by,
      formato, duracao_segundos, plataformas, briefing, observacoes_tecnicas
    )
    SELECT
      v.demand_id, v.chave, v.identificacao, v.nota, v.roteiro, v.cabeca,
      v.plataforma, v.formato_conteudo, v.arquivos, autor.id,
      v.formato, v.duracao, v.plataformas::text[], v.briefing, v.obs
    FROM (VALUES
      (
        'LFseed000002', 'seed-ficha-000002', 'Passarela das cataratas',
        'Priorizar o plano aberto no primeiro segundo.',
        'Abre na passarela, corta para o detalhe da água e fecha com o convite.',
        'Você já viu as cataratas desse ângulo?',
        'Instagram', 'Reels', 'https://exemplo.test/arquivos/seed-ficha-passarela',
        'Reels', 28, '{Instagram,TikTok}',
        'Peça curta, ritmo rápido, sem locução. Trilha livre de direitos.',
        'Exportar 1080x1920, 30 fps.'
      ),
      (
        'LFseed000003', 'seed-ficha-000003', 'Abertura da temporada',
        'Manter a marca só no final.',
        'Sequência de três planos do parque e encerramento com data.',
        'A temporada começou.',
        'Instagram', 'Reels', 'https://exemplo.test/arquivos/seed-ficha-temporada',
        'Reels', 22, '{Instagram}',
        'Tom de comunidade, sem oferta comercial.',
        'Legendas embutidas.'
      )
    ) AS v(
      demand_id, chave, identificacao, nota, roteiro, cabeca, plataforma,
      formato_conteudo, arquivos, formato, duracao, plataformas, briefing, obs
    )
    JOIN users autor ON autor.email = 'influencer@exemplo.test'
    ON CONFLICT (demand_id) DO NOTHING`;

  await tx`
    INSERT INTO deliveries (
      id, demand_id, version, link, note, editor_id, status, reason, delivered_at, evaluated_at, evaluated_by
    )
    SELECT
      v.id, v.demand_id, v.versao, v.link, v.nota, editor.id, v.status, v.motivo,
      now() - interval '1 day',
      CASE WHEN v.status = 'Aguardando aprovação' THEN NULL ELSE now() - interval '2 hours' END,
      CASE WHEN v.status = 'Aguardando aprovação' THEN NULL ELSE admin.id END
    FROM (VALUES
      ('Dseed000001', 'LFseed000003', 1::int, 'https://exemplo.test/entregas/seed-temporada-v1', 'Primeira versão para aprovação.', 'Aguardando aprovação', NULL::text),
      ('Dseed000002', 'LFseed000005', 1::int, 'https://exemplo.test/entregas/seed-criativo-v1', 'Corte enviado.', 'Ajustes solicitados', 'Encurtar a abertura e trocar a legenda final.'),
      ('Dseed000003', 'LFseed000006', 1::int, 'https://exemplo.test/entregas/seed-cortes-v1', 'Pacote concluído.', 'Aprovada', NULL::text),
      ('Dseed000004', 'LFseed000002', 1::int, 'https://exemplo.test/entregas/seed-passarela-v1', 'Prévia interna, ainda sem pedido de aprovação.', 'Concluída administrativamente', NULL::text)
    ) AS v(id, demand_id, versao, link, nota, status, motivo)
    JOIN users editor ON editor.email = 'editor@exemplo.test'
    JOIN users admin ON admin.email = 'admin@exemplo.test'
    ON CONFLICT (id) DO NOTHING`;

  await tx`
    INSERT INTO comments (id, demand_id, author_id, body)
    SELECT v.id, v.demand_id, u.id, v.body
    FROM (VALUES
      ('Cseed000001', 'LFseed000003', 'editor@exemplo.test', 'Subi a versão 1. O plano final ficou com a data da temporada.'),
      ('Cseed000002', 'LFseed000003', 'influencer@exemplo.test', 'Vi a peça. Vou aprovar ainda hoje se a trilha estiver liberada.'),
      ('Cseed000003', 'LFseed000002', 'editor@exemplo.test', 'Falta o plano da passarela no segundo 4. Retomo amanhã cedo.')
    ) AS v(id, demand_id, email, body)
    JOIN users u ON u.email = v.email
    ON CONFLICT (id) DO NOTHING`;

  await tx`
    INSERT INTO history (demand_id, action, user_id, details)
    SELECT v.demand_id, v.action, u.id, v.details
    FROM (VALUES
      ('LFseed000003', 'status', 'editor@exemplo.test', 'Status alterado para Aprovação.'),
      ('LFseed000003', 'adiamento', 'influencer@exemplo.test', 'Adiamento de 1 dia: revisão da trilha ainda pendente.'),
      ('LFseed000002', 'status', 'editor@exemplo.test', 'Status alterado para Em execução.'),
      ('LFseed000005', 'ajuste', 'influencer.dois@exemplo.test', 'Ajustes solicitados na legenda e na abertura.'),
      ('LFseed000011', 'lixeira', 'admin@exemplo.test', 'Demanda movida para a Lixeira.')
    ) AS v(demand_id, action, email, details)
    JOIN users u ON u.email = v.email
    WHERE NOT EXISTS (
      SELECT 1 FROM history h
      WHERE h.demand_id = v.demand_id AND h.action = v.action AND h.details = v.details
    )`;

  await tx`
    INSERT INTO captures (
      id, starts_at, ends_at, videomaker_id, influencer_id, client, subject, location, status, created_by, completed_at
    )
    SELECT
      v.id,
      v.inicio,
      v.fim,
      vm.id,
      inf.id,
      v.cliente,
      v.assunto,
      v.local,
      v.status,
      admin.id,
      CASE WHEN v.status = 'Concluída' THEN v.fim ELSE NULL END
    FROM (VALUES
      ('CAPseed0001', (CURRENT_DATE + 1) + time '10:00', (CURRENT_DATE + 1) + time '12:00', 'Passeio exemplo', 'Plano geral do rio', 'Porto de areia', 'Agendada'),
      ('CAPseed0002', (CURRENT_DATE + 3) + time '14:00', (CURRENT_DATE + 3) + time '16:30', 'Passeio exemplo', 'Entrevista na passarela', 'Parque das cataratas', 'Agendada'),
      ('CAPseed0003', (CURRENT_DATE - 2) + time '09:00', (CURRENT_DATE - 2) + time '11:00', 'Visita exemplo', 'Bastidores da recepção', 'Centro de visitantes', 'Concluída'),
      ('CAPseed0004', (CURRENT_DATE + 4) + time '08:00', (CURRENT_DATE + 4) + time '09:30', 'Visita exemplo', 'Captação cancelada pela chuva', 'Mirante', 'Cancelada')
    ) AS v(id, inicio, fim, cliente, assunto, local, status)
    JOIN users vm ON vm.email = 'editor@exemplo.test'
    JOIN users inf ON inf.email = 'influencer@exemplo.test'
    JOIN users admin ON admin.email = 'admin@exemplo.test'
    ON CONFLICT (id) DO NOTHING`;

  await tx`
    INSERT INTO media_reservations (id, starts_at, ends_at, reason, reserved_by, status, cancelled_at)
    SELECT v.id, v.inicio, v.fim, v.motivo, u.id, v.status,
           CASE WHEN v.status = 'Cancelada' THEN now() ELSE NULL END
    FROM (VALUES
      ('MMseed0001', now() - interval '20 minutes', now() + interval '90 minutes', 'Gravação em andamento no parque', 'editor@exemplo.test', 'Reservada'),
      ('MMseed0002', now() + interval '4 hours', now() + interval '6 hours', 'Deslocamento para o porto de areia', 'editor.cortes@exemplo.test', 'Reservada'),
      ('MMseed0003', now() - interval '3 days', now() - interval '3 days' + interval '2 hours', 'Captação já encerrada', 'editor@exemplo.test', 'Finalizada'),
      ('MMseed0004', now() + interval '2 days', now() + interval '2 days' + interval '3 hours', 'Reserva desmarcada', 'influencer@exemplo.test', 'Cancelada')
    ) AS v(id, inicio, fim, motivo, email, status)
    JOIN users u ON u.email = v.email
    ON CONFLICT (id) DO NOTHING`;

  await tx`
    INSERT INTO drone_usages (
      id, used_on, responsible, served_profile, reason, location, status, dedupe_key, created_by
    )
    SELECT v.id, v.usado_em::date, v.responsavel, v.perfil, v.motivo, v.local, v.status, v.chave, admin.id
    FROM (VALUES
      ('DRseed0001', CURRENT_DATE::text, 'Equipe exemplo', 'Loumar', 'Plano aéreo da passarela', 'Parque das cataratas', 'Ativo', 'seed|hoje|passarela'),
      ('DRseed0002', (CURRENT_DATE - 3)::text, 'Equipe exemplo', 'ClickFoz', 'Sobrevoo do centro', 'Avenida Brasil', 'Ativo', 'seed|centro|sobrevoo'),
      ('DRseed0003', (CURRENT_DATE - 10)::text, 'Equipe exemplo', 'Loumar', 'Uso cancelado por vento', 'Mirante', 'Cancelado', 'seed|cancelado|vento')
    ) AS v(id, usado_em, responsavel, perfil, motivo, local, status, chave)
    JOIN users admin ON admin.email = 'admin@exemplo.test'
    ON CONFLICT (id) DO NOTHING`;

  await tx`
    INSERT INTO clips (
      id, title, influencer_id, editor_id, post_date, editorial_line, video_link,
      source_program, status, clips_count, created_by, completed_at
    )
    SELECT
      v.id, v.title, inf.id, ed.id,
      CASE
        WHEN v.post_kind = 'dia6' THEN (date_trunc('month', CURRENT_DATE)::date + 5)
        WHEN v.post_kind = 'hoje' THEN CURRENT_DATE
        ELSE (CURRENT_DATE + v.post_off)::date
      END,
      v.linha, v.link, v.programa, v.status, v.qtd, ed.id,
      CASE WHEN v.status = 'Concluído' THEN now() ELSE NULL END
    FROM (VALUES
      ('CLIseed0001', 'Corte do quadro de gastronomia', 'influencer@exemplo.test', 'dia6', NULL::int, 'Educacional', 'https://exemplo.test/cortes/seed-gastronomia', 'Descubra Foz', 'Concluído', 6),
      ('CLIseed0002', 'Corte da entrevista na passarela', 'influencer.dois@exemplo.test', 'offset', 2, 'Comunidade', NULL::text, 'Destino Iguaçu News', 'Em andamento', NULL::int),
      ('CLIseed0003', 'Corte viral do pôr do sol', 'influencer@exemplo.test', 'hoje', NULL::int, 'Viral', 'https://exemplo.test/cortes/seed-por-do-sol', 'Outros', 'Em andamento', NULL::int)
    ) AS v(id, title, inf_email, post_kind, post_off, linha, link, programa, status, qtd)
    JOIN users inf ON inf.email = v.inf_email
    JOIN users ed ON ed.email = 'editor.cortes@exemplo.test'
    ON CONFLICT (id) DO NOTHING`;

  await tx`
    INSERT INTO audit_log (action, user_id, target, details)
    SELECT v.action, u.id, v.target, v.details
    FROM (VALUES
      ('conceder_permissao', 'admin@exemplo.test', 'editor.cortes@exemplo.test', 'Permissão editorPadraoCortes concedida no seed de demonstração.'),
      ('redefinir_pin', 'admin@exemplo.test', 'influencer@exemplo.test', 'Registro sintético para a tela de Auditoria.'),
      ('mover_lixeira', 'admin@exemplo.test', 'LFseed000011', 'Demanda sintética enviada à Lixeira.')
    ) AS v(action, email, target, details)
    JOIN users u ON u.email = v.email
    WHERE NOT EXISTS (
      SELECT 1 FROM audit_log a WHERE a.action = v.action AND a.target = v.target AND a.details = v.details
    )`;

  await tx`
    INSERT INTO notification_preferences (
      user_id, editor_assigned, status_changed, new_comment, adjustment_request, completed_approved, deadline_near
    )
    SELECT id, true, true, false, true, true, false
    FROM users WHERE email = 'influencer@exemplo.test'
    ON CONFLICT (user_id) DO NOTHING`;

  await tx`
    INSERT INTO approval_delegations (approver_id, editor_id)
    SELECT aprovador.id, editor.id
    FROM users aprovador
    JOIN users editor ON editor.email = 'editor@exemplo.test'
    WHERE aprovador.email = 'editor.cortes@exemplo.test'
    ON CONFLICT DO NOTHING`;
}
